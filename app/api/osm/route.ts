// API de feições do mapa: busca vias, água, áreas verdes e quadras/edifícios no
// OpenStreetMap (via Overpass) para o modo urbano/plano do gerador — o que dá
// riqueza visual à peça mesmo onde não há relevo (litoral).
//
// Observação: em ambientes com egress restrito o Overpass pode ficar
// indisponível; nesse caso devolvemos listas vazias + um aviso, e o app segue
// gerando a base + a rota. Em produção (egress aberto) as feições são incluídas.

import { NextRequest, NextResponse } from "next/server";
import { BBox, LngLat } from "@/lib/geo";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

type Way = { tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] };

function toCoords(w: Way): LngLat[] {
  return (w.geometry || []).map((g) => ({ lng: g.lon, lat: g.lat }));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const bbox = body?.bbox as BBox | undefined;
  if (!bbox) return NextResponse.json({ error: "bbox obrigatório" }, { status: 400 });

  const s = bbox.minLat, w = bbox.minLng, n = bbox.maxLat, e = bbox.maxLng;
  const b = `(${s},${w},${n},${e})`;
  const query = `[out:json][timeout:25];
(
  way["highway"]${b};
  way["natural"="water"]${b};
  way["waterway"]${b};
  way["leisure"~"park|garden|pitch|nature_reserve"]${b};
  way["landuse"~"grass|forest|recreation_ground|meadow|village_green"]${b};
  way["natural"="wood"]${b};
  way["building"]${b};
);
out geom;`;

  let elements: Way[] | null = null;
  let warning: string | undefined;
  for (const m of MIRRORS) {
    try {
      const res = await fetch(m, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "web3d-trophies/0.1",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) {
        warning = `Overpass ${res.status}`;
        continue;
      }
      const json = await res.json();
      elements = json.elements as Way[];
      warning = undefined;
      break;
    } catch (err) {
      warning = err instanceof Error ? err.message : "falha ao consultar OSM";
    }
  }

  if (!elements) {
    return NextResponse.json({
      roads: [], water: [], green: [], buildings: [],
      warning: `Feições do mapa indisponíveis (${warning ?? "sem resposta"}).`,
    });
  }

  const roads: { coords: LngLat[]; major: boolean }[] = [];
  const water: LngLat[][] = [];
  const green: LngLat[][] = [];
  const buildings: LngLat[][] = [];
  const MAJOR = new Set(["motorway", "trunk", "primary", "secondary", "tertiary"]);

  for (const el of elements) {
    const t = el.tags || {};
    const coords = toCoords(el);
    if (coords.length < 2) continue;
    if (t.highway) {
      roads.push({ coords, major: MAJOR.has(t.highway) });
    } else if (t.natural === "water" || t.waterway) {
      water.push(coords);
    } else if (t.leisure || t.landuse || t.natural === "wood") {
      green.push(coords);
    } else if (t.building) {
      buildings.push(coords);
    }
  }

  // Limita volume para manter payload e malha administráveis
  const cap = <T,>(a: T[], k: number) => (a.length > k ? a.slice(0, k) : a);
  return NextResponse.json({
    roads: cap(roads, 4000),
    water: cap(water, 600),
    green: cap(green, 600),
    buildings: cap(buildings, 1500),
  });
}
