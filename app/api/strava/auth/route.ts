// Inicia o fluxo OAuth do Strava: redireciona o usuário para autorizar o app.

import { NextRequest, NextResponse } from "next/server";
import { clientId, isConfigured, STRAVA_SCOPE } from "@/lib/strava";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const back = new URL("/criar", req.url);
  if (!isConfigured()) {
    back.searchParams.set("strava", "nao_configurado");
    return NextResponse.redirect(back);
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const redirectUri = `${proto}://${host}/api/strava/callback`;

  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", STRAVA_SCOPE);
  url.searchParams.set("approval_prompt", "auto");
  return NextResponse.redirect(url.toString());
}
