"use client";

// Preview 2D imediato da rota, com a moldura hexagonal de enquadramento —
// mostrado assim que o GPX/Strava é carregado, antes de gerar o modelo 3D.

import { useMemo } from "react";
import type { ParsedRoute } from "@/lib/gpx";

const SIZE = 400;
const R = SIZE / 2 - 12; // raio do hexágono no SVG

function hexPath(cx: number, cy: number, r: number) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k + 30);
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M${pts.join("L")}Z`;
}

export default function MapPreview({ route, routeColor }: { route: ParsedRoute; routeColor: string }) {
  const { d, hex } = useMemo(() => {
    const pts = route.points;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const p of pts) {
      minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    }
    const cLat = (minLat + maxLat) / 2;
    const cLng = (minLng + maxLng) / 2;
    const kx = Math.cos((cLat * Math.PI) / 180);
    // projeta em metros locais e centra
    const proj = pts.map((p) => ({ x: (p.lng - cLng) * kx, y: -(p.lat - cLat) }));
    let rmax = 1e-9;
    for (const q of proj) rmax = Math.max(rmax, Math.hypot(q.x, q.y));
    // rota ocupa ~inradius/1.12 (mesma regra do modelo 3D)
    const inradius = R * Math.cos(Math.PI / 6);
    const s = (inradius / 1.2) / rmax;
    const cx = SIZE / 2, cy = SIZE / 2;
    const d = proj.map((q, i) => `${i ? "L" : "M"}${(cx + q.x * s).toFixed(1)},${(cy + q.y * s).toFixed(1)}`).join("");
    return { d, hex: hexPath(cx, cy, R) };
  }, [route]);

  return (
    <div className="absolute inset-0 grid place-items-center p-4">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-h-full max-w-full">
        <defs>
          <clipPath id="hexclip"><path d={hex} /></clipPath>
        </defs>
        <path d={hex} fill="#171b26" stroke="#2a3340" strokeWidth={2} />
        <g clipPath="url(#hexclip)">
          <path d={d} fill="none" stroke={routeColor} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        <path d={hex} fill="none" stroke="#3a4657" strokeWidth={2} />
      </svg>
      <span className="absolute bottom-3 text-[11px] text-white/40">
        Enquadramento da rota · gere o modelo para ver o mapa em 3D
      </span>
    </div>
  );
}
