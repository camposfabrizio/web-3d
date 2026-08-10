"use client";

// Preview 2D estilo Leaflet: mapa OSM de fundo + rota traçada + máscara
// hexagonal de enquadramento. Mostrado assim que a rota é carregada.
// (Os tiles do OSM carregam no navegador do usuário — em produção.)

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Polygon, useMap } from "react-leaflet";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import type { ParsedRoute } from "@/lib/gpx";

const M_PER_DEG = 111320;

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [16, 16] });
  }, [map, bounds]);
  return null;
}

export default function MapPreview({ route, routeColor }: { route: ParsedRoute; routeColor: string }) {
  const { line, hex, outer, center, bounds } = useMemo(() => {
    const pts = route.points;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of pts) {
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
    }
    const cLat = (minLat + maxLat) / 2, cLng = (minLng + maxLng) / 2;
    const kx = Math.cos((cLat * Math.PI) / 180);
    // raio da rota em metros e circunraio do hexágono (mesma regra do modelo 3D)
    let rM = 1;
    for (const p of pts) {
      rM = Math.max(rM, Math.hypot((p.lng - cLng) * kx * M_PER_DEG, (p.lat - cLat) * M_PER_DEG));
    }
    const RcM = (rM * 1.2) / Math.cos(Math.PI / 6); // circunraio p/ conter a rota c/ margem

    const hex: LatLngExpression[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 180) * (60 * k + 30);
      const dLat = (RcM * Math.sin(a)) / M_PER_DEG;
      const dLng = (RcM * Math.cos(a)) / (M_PER_DEG * kx);
      hex.push([cLat + dLat, cLng + dLng]);
    }
    // retângulo grande para escurecer tudo que está fora do hexágono
    const outer: LatLngExpression[] = [
      [cLat + 1, cLng - 1], [cLat + 1, cLng + 1], [cLat - 1, cLng + 1], [cLat - 1, cLng - 1],
    ];
    const line: LatLngExpression[] = pts.map((p) => [p.lat, p.lng]);
    const dLatB = (RcM * 1.05) / M_PER_DEG, dLngB = (RcM * 1.05) / (M_PER_DEG * kx);
    const bounds: LatLngBoundsExpression = [
      [cLat - dLatB, cLng - dLngB],
      [cLat + dLatB, cLng + dLngB],
    ];
    return { line, hex, outer, center: [cLat, cLng] as LatLngExpression, bounds };
  }, [route]);

  return (
    <div className="absolute inset-0">
      <MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full" style={{ background: "#0f1420" }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
          maxZoom={19}
        />
        {/* máscara: escurece fora do hexágono */}
        <Polygon positions={[outer, hex]} pathOptions={{ color: "transparent", fillColor: "#0b0f17", fillOpacity: 0.55, stroke: false }} />
        {/* moldura hexagonal */}
        <Polygon positions={hex} pathOptions={{ color: "#ff8a5c", weight: 2, fill: false }} />
        {/* rota */}
        <Polyline positions={line} pathOptions={{ color: routeColor, weight: 4, opacity: 0.95 }} />
        <FitBounds bounds={bounds} />
      </MapContainer>
      <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] rounded bg-black/50 px-2 py-0.5 text-[11px] text-white/70">
        Enquadramento da rota · gere o modelo para o mapa em 3D
      </span>
    </div>
  );
}
