// Callback do OAuth do Strava: troca o `code` por tokens e grava a sessão em
// cookie httpOnly, depois volta para o gerador.

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, encodeSession, STRAVA_COOKIE } from "@/lib/strava";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const err = req.nextUrl.searchParams.get("error");
  const back = new URL("/criar", req.url);

  if (err || !code) {
    back.searchParams.set("strava", "erro");
    return NextResponse.redirect(back);
  }

  try {
    const session = await exchangeCode(code);
    back.searchParams.set("strava", "conectado");
    const res = NextResponse.redirect(back);
    res.cookies.set(STRAVA_COOKIE, encodeSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    back.searchParams.set("strava", "erro");
    return NextResponse.redirect(back);
  }
}
