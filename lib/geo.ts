// Utilidades geográficas: projeção local (lng/lat -> metros) e math de tiles
// (Web Mercator / slippy) para buscar dados de elevação e do OSM.

export type LngLat = { lng: number; lat: number };
export type BBox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

const R = 6378137; // raio da Terra (m), Web Mercator
const DEG = Math.PI / 180;

/** Metros por grau, aproximação de plano tangente na latitude de referência. */
export function metersPerDegree(refLat: number) {
  return {
    lng: 111320 * Math.cos(refLat * DEG),
    lat: 110540,
  };
}

/**
 * Cria uma projeção local (equiretangular) centrada em `ref`.
 * Retorna funções para converter lng/lat <-> metros no plano (x=leste, y=norte).
 */
export function localProjection(ref: LngLat) {
  const m = metersPerDegree(ref.lat);
  return {
    toMeters(p: LngLat) {
      return { x: (p.lng - ref.lng) * m.lng, y: (p.lat - ref.lat) * m.lat };
    },
  };
}

/** Bounding box de uma lista de pontos, com padding relativo (0.1 = 10%). */
export function boundsOf(points: LngLat[], padding = 0.15): BBox {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }
  const dLng = (maxLng - minLng) || 0.001;
  const dLat = (maxLat - minLat) || 0.001;
  // padding proporcional ao maior lado, para manter a rota "respirando" na peça
  const pad = Math.max(dLng, dLat) * padding;
  return {
    minLng: minLng - pad,
    minLat: minLat - pad,
    maxLng: maxLng + pad,
    maxLat: maxLat + pad,
  };
}

// ---- Web Mercator / slippy tiles ----

/** Coordenadas globais de pixel (256px/tile) no zoom z. */
export function lngLatToGlobalPixel(lng: number, lat: number, z: number) {
  const n = Math.pow(2, z) * 256;
  const x = ((lng + 180) / 360) * n;
  const sinLat = Math.sin(lat * DEG);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * n;
  return { x, y };
}

/** Escolhe um zoom de tiles cuja cobertura do bbox caiba em ~maxTiles tiles. */
export function chooseTileZoom(bbox: BBox, maxTiles = 12, maxZoom = 14): number {
  for (let z = maxZoom; z >= 1; z--) {
    const a = lngLatToGlobalPixel(bbox.minLng, bbox.maxLat, z); // canto sup-esq
    const b = lngLatToGlobalPixel(bbox.maxLng, bbox.minLat, z); // canto inf-dir
    const txCount = Math.floor(b.x / 256) - Math.floor(a.x / 256) + 1;
    const tyCount = Math.floor(b.y / 256) - Math.floor(a.y / 256) + 1;
    if (txCount * tyCount <= maxTiles) return z;
  }
  return 1;
}

/** Decodifica um pixel Terrarium (RGB) em altitude em metros. */
export function terrariumToMeters(r: number, g: number, b: number) {
  return r * 256 + g + b / 256 - 32768;
}

export { R as EARTH_RADIUS };
