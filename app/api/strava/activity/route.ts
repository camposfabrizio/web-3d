// Carrega a rota (pontos GPS) de uma atividade do Strava no formato do gerador.

import { NextRequest, NextResponse } from "next/server";
import {
  decodeSession,
  ensureFresh,
  encodeSession,
  activityToRoute,
  STRAVA_COOKIE,
} from "@/lib/strava";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const session0 = decodeSession(req.cookies.get(STRAVA_COOKIE)?.value);
  if (!session0) return NextResponse.json({ connected: false }, { status: 401 });

  try {
    const session = await ensureFresh(session0);
    const parsed = await activityToRoute(session, id);
    if (parsed.points.length < 2) {
      return NextResponse.json({ error: "Atividade sem dados de GPS." }, { status: 422 });
    }
    const res = NextResponse.json(parsed);
    res.cookies.set(STRAVA_COOKIE, encodeSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e) {
    if (e instanceof Error && e.message === "unauthorized") {
      return NextResponse.json({ connected: false }, { status: 401 });
    }
    return NextResponse.json({ error: "Falha ao carregar a rota do Strava." }, { status: 500 });
  }
}
