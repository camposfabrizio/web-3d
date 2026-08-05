// Lista as atividades do atleta conectado (apenas as com GPS).

import { NextRequest, NextResponse } from "next/server";
import {
  decodeSession,
  ensureFresh,
  encodeSession,
  listActivities,
  STRAVA_COOKIE,
} from "@/lib/strava";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session0 = decodeSession(req.cookies.get(STRAVA_COOKIE)?.value);
  if (!session0) return NextResponse.json({ connected: false }, { status: 401 });

  try {
    const session = await ensureFresh(session0);
    const activities = await listActivities(session);
    const res = NextResponse.json({ connected: true, activities });
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
    return NextResponse.json({ error: "Falha ao buscar atividades." }, { status: 500 });
  }
}
