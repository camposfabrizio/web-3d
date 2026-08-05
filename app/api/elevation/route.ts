// API de elevação: recebe um bbox + resolução de grade e devolve um heightmap.
// Busca os "terrain tiles" (Terrarium, AWS Open Data) no servidor e decodifica
// os PNGs com pngjs — evita CORS/canvas no cliente e roda igual na Vercel.

import { NextRequest, NextResponse } from "next/server";
import { PNG } from "pngjs";
import {
  BBox,
  chooseTileZoom,
  lngLatToGlobalPixel,
  terrariumToMeters,
} from "@/lib/geo";

export const runtime = "nodejs";
export const maxDuration = 60;

const TILE = 256;
const TILE_URL = (z: number, x: number, y: number) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

type Decoded = { width: number; height: number; data: Buffer };

async function fetchTile(z: number, x: number, y: number): Promise<Decoded | null> {
  try {
    const res = await fetch(TILE_URL(z, x, y), {
      headers: { "User-Agent": "web3d-trophies/0.1" },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const png = PNG.sync.read(buf);
    return { width: png.width, height: png.height, data: png.data };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const bbox = body?.bbox as BBox | undefined;
  const grid = Math.min(Math.max(Number(body?.grid) || 120, 16), 220);
  if (!bbox) return NextResponse.json({ error: "bbox obrigatório" }, { status: 400 });

  const z = chooseTileZoom(bbox, 16, 14);

  // Faixa de tiles que cobre o bbox
  const tl = lngLatToGlobalPixel(bbox.minLng, bbox.maxLat, z);
  const br = lngLatToGlobalPixel(bbox.maxLng, bbox.minLat, z);
  const tx0 = Math.floor(tl.x / TILE), tx1 = Math.floor(br.x / TILE);
  const ty0 = Math.floor(tl.y / TILE), ty1 = Math.floor(br.y / TILE);

  const tiles = new Map<string, Decoded | null>();
  const jobs: Promise<void>[] = [];
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      jobs.push(
        fetchTile(z, tx, ty).then((d) => {
          tiles.set(`${tx}/${ty}`, d);
        })
      );
    }
  }
  await Promise.all(jobs);

  // Altitude num pixel global (com clamp para a borda do tile disponível)
  const elevAtPixel = (gx: number, gy: number): number => {
    const tx = Math.floor(gx / TILE), ty = Math.floor(gy / TILE);
    const tile = tiles.get(`${tx}/${ty}`);
    if (!tile) return 0;
    const lx = Math.min(TILE - 1, Math.max(0, Math.floor(gx - tx * TILE)));
    const ly = Math.min(TILE - 1, Math.max(0, Math.floor(gy - ty * TILE)));
    const idx = (ly * tile.width + lx) * 4;
    return terrariumToMeters(tile.data[idx], tile.data[idx + 1], tile.data[idx + 2]);
  };

  // Amostra bilinear no pixel global fracionário
  const sample = (gx: number, gy: number): number => {
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const a = elevAtPixel(x0, y0);
    const b = elevAtPixel(x0 + 1, y0);
    const c = elevAtPixel(x0, y0 + 1);
    const d = elevAtPixel(x0 + 1, y0 + 1);
    return (
      a * (1 - fx) * (1 - fy) +
      b * fx * (1 - fy) +
      c * (1 - fx) * fy +
      d * fx * fy
    );
  };

  const nx = grid, ny = grid;
  const heights = new Array<number>(nx * ny);
  let minEle = Infinity, maxEle = -Infinity;
  for (let j = 0; j < ny; j++) {
    const lat = bbox.maxLat + (bbox.minLat - bbox.maxLat) * (j / (ny - 1));
    for (let i = 0; i < nx; i++) {
      const lng = bbox.minLng + (bbox.maxLng - bbox.minLng) * (i / (nx - 1));
      const g = lngLatToGlobalPixel(lng, lat, z);
      const e = sample(g.x, g.y);
      heights[j * nx + i] = e;
      if (e < minEle) minEle = e;
      if (e > maxEle) maxEle = e;
    }
  }

  return NextResponse.json({ nx, ny, heights, minEle, maxEle, bbox, zoom: z });
}
