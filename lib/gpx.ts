// Parse de arquivos GPX (export do Strava/Garmin) no navegador.
// Extrai os pontos da rota e calcula métricas (distância, tempo, ganho de elevação).

import type { LngLat } from "./geo";

export type RoutePoint = LngLat & { ele?: number; time?: number };

export type RouteStats = {
  name?: string;
  distanceKm: number;
  durationSec?: number;
  ascentM?: number;
  points: number;
};

export type ParsedRoute = {
  points: RoutePoint[];
  stats: RouteStats;
};

const DEG = Math.PI / 180;

/** Distância haversine entre dois pontos, em metros. */
function haversine(a: LngLat, b: LngLat) {
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Faz o parse de uma string GPX. Usa DOMParser (client-side).
 * Lê <trkpt> (trilha) e, se ausente, <rtept> (rota planejada).
 */
export function parseGpx(xml: string): ParsedRoute {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Arquivo GPX inválido.");
  }

  let nodes = Array.from(doc.getElementsByTagName("trkpt"));
  if (nodes.length === 0) nodes = Array.from(doc.getElementsByTagName("rtept"));
  if (nodes.length === 0) {
    throw new Error("Nenhum ponto de rota encontrado no GPX (trkpt/rtept).");
  }

  const points: RoutePoint[] = [];
  for (const n of nodes) {
    const lat = parseFloat(n.getAttribute("lat") || "");
    const lng = parseFloat(n.getAttribute("lon") || "");
    if (!isFinite(lat) || !isFinite(lng)) continue;
    const eleTxt = n.getElementsByTagName("ele")[0]?.textContent;
    const timeTxt = n.getElementsByTagName("time")[0]?.textContent;
    const p: RoutePoint = { lat, lng };
    if (eleTxt) p.ele = parseFloat(eleTxt);
    if (timeTxt) {
      const t = Date.parse(timeTxt);
      if (isFinite(t)) p.time = t;
    }
    points.push(p);
  }

  if (points.length < 2) throw new Error("Rota muito curta para gerar um modelo.");

  // Simplifica rotas muito densas (mantém performance de geração de malha)
  const simplified = decimate(points, 3000);

  let distance = 0;
  let ascent = 0;
  for (let i = 1; i < simplified.length; i++) {
    distance += haversine(simplified[i - 1], simplified[i]);
    const de = (simplified[i].ele ?? 0) - (simplified[i - 1].ele ?? 0);
    if (de > 0) ascent += de;
  }

  const t0 = simplified.find((p) => p.time)?.time;
  const tN = [...simplified].reverse().find((p) => p.time)?.time;
  const durationSec = t0 && tN ? Math.round((tN - t0) / 1000) : undefined;

  const name =
    doc.getElementsByTagName("name")[0]?.textContent?.trim() || undefined;

  return {
    points: simplified,
    stats: {
      name,
      distanceKm: distance / 1000,
      durationSec,
      ascentM: ascent > 0 ? Math.round(ascent) : undefined,
      points: simplified.length,
    },
  };
}

/** Reduz o número de pontos por amostragem uniforme, preservando início/fim. */
function decimate<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[Math.floor(i)]);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

/** Formata segundos como "h:mm:ss" ou "m:ss". */
export function formatDuration(sec?: number): string | undefined {
  if (!sec && sec !== 0) return undefined;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
