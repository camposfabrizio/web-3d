// Integração com o Strava (OAuth2). Permite conectar a conta e importar a rota
// de uma atividade direto no gerador, sem exportar GPX.
//
// SEGURANÇA: as credenciais vêm de variáveis de ambiente e NUNCA são commitadas.
//   STRAVA_CLIENT_ID     — id do app Strava (público)
//   STRAVA_CLIENT_SECRET — segredo do app Strava (apenas no servidor)

import type { ParsedRoute, RoutePoint } from "./gpx";

const OAUTH_TOKEN = "https://www.strava.com/oauth/token";
const API = "https://www.strava.com/api/v3";

export const STRAVA_COOKIE = "strava_session";
export const STRAVA_SCOPE = "read,activity:read_all";

export type StravaSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch (segundos)
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distanceKm: number;
  durationSec?: number;
  ascentM?: number;
  date: string;
};

type ActivitySummary = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date_local: string;
  map?: { summary_polyline?: string };
};

type Streams = {
  latlng?: { data: [number, number][] };
  altitude?: { data: number[] };
};

export const clientId = () => process.env.STRAVA_CLIENT_ID || "";
const clientSecret = () => process.env.STRAVA_CLIENT_SECRET || "";
export const isConfigured = () => Boolean(clientId() && clientSecret());

// ---- OAuth ----

export async function exchangeCode(code: string): Promise<StravaSession> {
  return tokenRequest({ code, grant_type: "authorization_code" });
}

async function refresh(session: StravaSession): Promise<StravaSession> {
  return tokenRequest({ refresh_token: session.refresh_token, grant_type: "refresh_token" });
}

async function tokenRequest(extra: Record<string, string>): Promise<StravaSession> {
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId(), client_secret: clientSecret(), ...extra }),
  });
  if (!res.ok) throw new Error("Falha na autenticação com o Strava.");
  const j = (await res.json()) as TokenResponse;
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at };
}

/** Renova o token se estiver perto de expirar. */
export async function ensureFresh(session: StravaSession): Promise<StravaSession> {
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at - 60 > now ? session : refresh(session);
}

async function apiGet<T>(session: StravaSession, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`Strava API ${res.status}`);
  return (await res.json()) as T;
}

// ---- Sessão em cookie (base64url do JSON) ----

export function encodeSession(s: StravaSession): string {
  return Buffer.from(JSON.stringify(s)).toString("base64url");
}
export function decodeSession(v?: string): StravaSession | null {
  if (!v) return null;
  try {
    return JSON.parse(Buffer.from(v, "base64url").toString()) as StravaSession;
  } catch {
    return null;
  }
}

// ---- Dados de atividades ----

/** Lista as atividades recentes que têm GPS (rota traçável). */
export async function listActivities(session: StravaSession): Promise<StravaActivity[]> {
  const list = await apiGet<ActivitySummary[]>(session, "/athlete/activities?per_page=30");
  return list
    .filter((a) => a.map?.summary_polyline)
    .map((a) => ({
      id: a.id,
      name: a.name,
      type: a.sport_type || a.type,
      distanceKm: (a.distance || 0) / 1000,
      durationSec: a.moving_time || undefined,
      ascentM: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : undefined,
      date: a.start_date_local,
    }));
}

/** Carrega os pontos GPS de uma atividade e devolve no formato do gerador. */
export async function activityToRoute(session: StravaSession, id: string): Promise<ParsedRoute> {
  const activity = await apiGet<ActivitySummary>(session, `/activities/${id}`);
  const streams = await apiGet<Streams>(
    session,
    `/activities/${id}/streams?keys=latlng,altitude&key_by_type=true`
  );
  const latlng = streams.latlng?.data ?? [];
  const alt = streams.altitude?.data ?? [];
  let points: RoutePoint[] = latlng.map(([lat, lng], i) => ({ lat, lng, ele: alt[i] }));
  points = decimate(points, 3000);

  return {
    points,
    stats: {
      name: activity.name,
      distanceKm: (activity.distance || 0) / 1000,
      durationSec: activity.moving_time || undefined,
      ascentM: activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : undefined,
      points: points.length,
    },
  };
}

function decimate<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[Math.floor(i)]);
  const last = arr[arr.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}
