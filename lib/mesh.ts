// Construção da malha 3D da peça a partir da rota (GPX/Strava), do heightmap
// (terreno) e das feições do OSM (modo urbano). Tudo é recortado por uma
// máscara HEXAGONAL para enquadrar a rota. Gera um THREE.Group pronto para
// preview e export STL. Constrói em Y-up (X=leste, Z=norte, Y=altura).

import * as THREE from "three";
import { BBox, LngLat, localProjection } from "./geo";
import type { RoutePoint } from "./gpx";

export type Heightmap = {
  nx: number; ny: number; heights: number[];
  minEle: number; maxEle: number; bbox: BBox;
};

export type OsmData = {
  roads: { coords: LngLat[]; major: boolean }[];
  water: LngLat[][];
  green: LngLat[][];
  buildings: LngLat[][];
};

/** Cor de cada elemento geográfico (configurável pelo cliente). */
export type ElementColors = {
  terrain: string;
  base: string;
  route: string;
  water: string;
  green: string;
  roads: string;
  building: string;
};

// Paleta padrão pensada para impressão (elementos bem distintos entre si).
export const DEFAULT_COLORS: ElementColors = {
  terrain: "#d8d2c4",
  base: "#ece4d6",
  route: "#ff5a36",
  water: "#4aa3c7",
  green: "#6aa84f",
  roads: "#4b515c",
  building: "#b9a488",
};

export type BuildOptions = {
  mode: "terrain" | "urban";
  sizeMM: number;        // largura da peça (vértice a vértice do hexágono)
  baseHeightMM: number;  // espessura da base sólida
  exaggeration: number;  // exagero vertical do relevo (modo terreno)
  routeWidthMM: number;  // espessura do cordão da rota
  routeHeightMM: number; // quanto a rota se eleva sobre a superfície
  colors: ElementColors;
};

type P2 = { x: number; z: number };
type V3 = { x: number; y: number; z: number };

// ---- máscara hexagonal ----

function makeHex(Rc: number) {
  const verts: P2[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k + 30); // flat-top
    verts.push({ x: Rc * Math.cos(a), z: Rc * Math.sin(a) });
  }
  const planes = verts.map((v, i) => {
    const w = verts[(i + 1) % 6];
    let nx = -(w.z - v.z);
    let nz = w.x - v.x;
    let c = nx * v.x + nz * v.z;
    if (-c < 0) { nx = -nx; nz = -nz; c = -c; } // normal apontando p/ dentro
    return { nx, nz, c };
  });
  return { verts, planes, Rc };
}
type Hex = ReturnType<typeof makeHex>;

function insideHex(hex: Hex, x: number, z: number, eps = 1e-6) {
  return hex.planes.every((p) => p.nx * x + p.nz * z - p.c >= -eps);
}

/** Clipa um polígono (V3) contra um semiplano em X,Z interpolando Y. */
function clipPlane(poly: V3[], p: { nx: number; nz: number; c: number }): V3[] {
  const out: V3[] = [];
  const d = (v: V3) => p.nx * v.x + p.nz * v.z - p.c;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = d(a), db = d(b);
    const ain = da >= 0, bin = db >= 0;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return out;
}
function clipPolyHex(poly: V3[], hex: Hex): V3[] {
  let p = poly;
  for (const pl of hex.planes) { p = clipPlane(p, pl); if (p.length < 3) return []; }
  return p;
}

/** Clipa um segmento (X,Z) ao hexágono (Liang-Barsky). */
function clipSeg(a: P2, b: P2, hex: Hex): [P2, P2] | null {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const p of hex.planes) {
    const da = p.nx * a.x + p.nz * a.z - p.c;
    const dd = p.nx * dx + p.nz * dz;
    if (Math.abs(dd) < 1e-12) { if (da < 0) return null; continue; }
    const t = -da / dd;
    if (dd > 0) { if (t > t1) return null; if (t > t0) t0 = t; }
    else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  if (t0 > t1) return null;
  return [{ x: a.x + dx * t0, z: a.z + dz * t0 }, { x: a.x + dx * t1, z: a.z + dz * t1 }];
}

function edgeOnHex(hex: Hex, a: V3, b: V3, eps = 1e-3) {
  return hex.planes.some(
    (p) => Math.abs(p.nx * a.x + p.nz * a.z - p.c) < eps && Math.abs(p.nx * b.x + p.nz * b.z - p.c) < eps
  );
}

// ---- helpers de geometria ----

function tri(pos: number[], a: V3, b: V3, c: V3) {
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}
function fan(pos: number[], poly: V3[]) {
  for (let k = 1; k < poly.length - 1; k++) tri(pos, poly[0], poly[k], poly[k + 1]);
}
function wall(pos: number[], a: V3, b: V3) {
  const a0 = { x: a.x, y: 0, z: a.z }, b0 = { x: b.x, y: 0, z: b.z };
  tri(pos, a, b, b0);
  tri(pos, a, b0, a0);
}
function hexBottom(pos: number[], hex: Hex) {
  const c = { x: 0, y: 0, z: 0 };
  for (let k = 0; k < 6; k++) {
    const v0 = hex.verts[k], v1 = hex.verts[(k + 1) % 6];
    tri(pos, c, { x: v1.x, y: 0, z: v1.z }, { x: v0.x, y: 0, z: v0.z });
  }
}
function geomFrom(positions: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}
function mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.9, ...extra });
}

// ---- layout: projeção lng/lat -> mm, centrado na rota, escalado p/ caber no hexágono ----

function makeLayout(bbox: BBox, route: RoutePoint[], sizeMM: number) {
  const ref = { lng: (bbox.minLng + bbox.maxLng) / 2, lat: (bbox.minLat + bbox.maxLat) / 2 };
  const proj = localProjection(ref);
  let r = 1e-6;
  for (const p of route) {
    const m = proj.toMeters(p);
    r = Math.max(r, Math.hypot(m.x, m.y));
  }
  const Rc = sizeMM / 2;                 // circunraio do hexágono (mm)
  const inradius = Rc * Math.cos(Math.PI / 6);
  const scale = (inradius / 1.2) / r;    // rota cabe no hexágono com margem
  return {
    Rc,
    scale,
    toModel(p: LngLat): P2 {
      const m = proj.toMeters(p);
      return { x: m.x * scale, z: -m.y * scale };
    },
    reliefMM(eleMeters: number, minEle: number, exaggeration: number) {
      return (eleMeters - minEle) * scale * exaggeration;
    },
  };
}
type Layout = ReturnType<typeof makeLayout>;

// ---- terreno sólido recortado no hexágono ----

function buildTerrain(hm: Heightmap, hex: Hex, layout: Layout, opts: BuildOptions): THREE.Mesh {
  const { nx, ny, heights, minEle } = hm;
  const base = opts.baseHeightMM;
  const top: V3[] = new Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const lat = hm.bbox.maxLat + (hm.bbox.minLat - hm.bbox.maxLat) * (j / (ny - 1));
    for (let i = 0; i < nx; i++) {
      const lng = hm.bbox.minLng + (hm.bbox.maxLng - hm.bbox.minLng) * (i / (nx - 1));
      const { x, z } = layout.toModel({ lng, lat });
      const y = base + layout.reliefMM(heights[j * nx + i], minEle, opts.exaggeration);
      top[j * nx + i] = { x, y, z };
    }
  }

  const pos: number[] = [];
  const at = (i: number, j: number) => top[j * nx + i];
  const addTri = (a: V3, b: V3, c: V3) => {
    // descarte rápido: se os 3 estão dentro, sem clip
    if (insideHex(hex, a.x, a.z) && insideHex(hex, b.x, b.z) && insideHex(hex, c.x, c.z)) {
      tri(pos, a, b, c);
      return;
    }
    const poly = clipPolyHex([a, b, c], hex);
    if (poly.length < 3) return;
    fan(pos, poly);
    for (let k = 0; k < poly.length; k++) {
      const v0 = poly[k], v1 = poly[(k + 1) % poly.length];
      if (edgeOnHex(hex, v0, v1)) wall(pos, v0, v1);
    }
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      addTri(a, c, b);
      addTri(b, c, d);
    }
  }
  hexBottom(pos, hex);

  const m = new THREE.Mesh(geomFrom(pos), mat(opts.colors.terrain, { roughness: 0.95, flatShading: true }));
  m.name = "terreno";
  return m;
}

function terrainHeightAt(p: LngLat, hm: Heightmap, layout: Layout, opts: BuildOptions): number {
  const u = ((p.lng - hm.bbox.minLng) / (hm.bbox.maxLng - hm.bbox.minLng)) * (hm.nx - 1);
  const v = ((hm.bbox.maxLat - p.lat) / (hm.bbox.maxLat - hm.bbox.minLat)) * (hm.ny - 1);
  const i0 = Math.max(0, Math.min(hm.nx - 2, Math.floor(u)));
  const j0 = Math.max(0, Math.min(hm.ny - 2, Math.floor(v)));
  const fx = u - i0, fy = v - j0;
  const h = (i: number, j: number) => hm.heights[j * hm.nx + i];
  const e =
    h(i0, j0) * (1 - fx) * (1 - fy) + h(i0 + 1, j0) * fx * (1 - fy) +
    h(i0, j0 + 1) * (1 - fx) * fy + h(i0 + 1, j0 + 1) * fx * fy;
  return opts.baseHeightMM + layout.reliefMM(e, hm.minEle, opts.exaggeration);
}

// ---- base hexagonal (modo urbano) ----

function buildHexBase(hex: Hex, opts: BuildOptions): THREE.Mesh {
  const pos: number[] = [];
  const b = opts.baseHeightMM;
  const cTop = { x: 0, y: b, z: 0 };
  for (let k = 0; k < 6; k++) {
    const v0 = hex.verts[k], v1 = hex.verts[(k + 1) % 6];
    tri(pos, cTop, { x: v0.x, y: b, z: v0.z }, { x: v1.x, y: b, z: v1.z }); // topo
    wall(pos, { x: v0.x, y: b, z: v0.z }, { x: v1.x, y: b, z: v1.z });      // parede
  }
  hexBottom(pos, hex);
  const m = new THREE.Mesh(geomFrom(pos), mat(opts.colors.base));
  m.name = "base";
  return m;
}

// ---- feições OSM recortadas no hexágono ----

function buildRoads(roads: OsmData["roads"], hex: Hex, layout: Layout, opts: BuildOptions): THREE.Mesh | null {
  const pos: number[] = [];
  const y = opts.baseHeightMM + 0.5;
  for (const r of roads) {
    const halfW = (r.major ? 1.1 : 0.6) * (opts.sizeMM / 120);
    const p = r.coords.map((c) => layout.toModel(c));
    for (let i = 0; i < p.length - 1; i++) {
      const seg = clipSeg(p[i], p[i + 1], hex);
      if (!seg) continue;
      const [a, b] = seg;
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1e-6;
      const ox = (-dz / len) * halfW, oz = (dx / len) * halfW;
      tri(pos, { x: a.x + ox, y, z: a.z + oz }, { x: b.x + ox, y, z: b.z + oz }, { x: a.x - ox, y, z: a.z - oz });
      tri(pos, { x: a.x - ox, y, z: a.z - oz }, { x: b.x + ox, y, z: b.z + oz }, { x: b.x - ox, y, z: b.z - oz });
    }
  }
  if (!pos.length) return null;
  const m = new THREE.Mesh(geomFrom(pos), mat(opts.colors.roads, { roughness: 0.85 }));
  m.name = "vias";
  return m;
}

function buildAreas(rings: LngLat[][], hex: Hex, layout: Layout, y: number, color: string, name: string): THREE.Mesh | null {
  const pos: number[] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const poly: V3[] = ring.map((c) => { const { x, z } = layout.toModel(c); return { x, y, z }; });
    const clipped = clipPolyHex(poly, hex);
    if (clipped.length >= 3) fan(pos, clipped);
  }
  if (!pos.length) return null;
  const m = new THREE.Mesh(geomFrom(pos), mat(color));
  m.name = name;
  return m;
}

function buildBuildings(rings: LngLat[][], hex: Hex, layout: Layout, opts: BuildOptions, height: number): THREE.Mesh | null {
  const pos: number[] = [];
  const base = opts.baseHeightMM;
  const top = base + height;
  for (const ring of rings.slice(0, 900)) {
    if (ring.length < 3) continue;
    const poly: V3[] = ring.map((c) => { const { x, z } = layout.toModel(c); return { x, y: top, z }; });
    const clipped = clipPolyHex(poly, hex);
    if (clipped.length < 3) continue;
    fan(pos, clipped); // teto
    for (let k = 0; k < clipped.length; k++) {
      const v0 = clipped[k], v1 = clipped[(k + 1) % clipped.length];
      const b0 = { x: v0.x, y: base, z: v0.z }, b1 = { x: v1.x, y: base, z: v1.z };
      tri(pos, v0, v1, b1); // parede
      tri(pos, v0, b1, b0);
    }
  }
  if (!pos.length) return null;
  const m = new THREE.Mesh(geomFrom(pos), mat(opts.colors.building));
  m.name = "quadras";
  return m;
}

// ---- rota (cordão em relevo, sempre por cima) ----

function buildRoute(route: RoutePoint[], hex: Hex, layout: Layout, opts: BuildOptions, heightAt: (p: LngLat) => number): THREE.Mesh {
  const pts: THREE.Vector3[] = [];
  for (const p of route) {
    const { x, z } = layout.toModel(p);
    if (!insideHex(hex, x, z, opts.routeWidthMM)) continue; // ignora pontas fora do enquadramento
    pts.push(new THREE.Vector3(x, heightAt(p) + opts.routeHeightMM, z));
  }
  const use = pts.length >= 2 ? pts : route.map((p) => {
    const { x, z } = layout.toModel(p);
    return new THREE.Vector3(x, heightAt(p) + opts.routeHeightMM, z);
  });
  const curve = new THREE.CatmullRomCurve3(use, false, "catmullrom", 0.2);
  const segments = Math.min(4000, Math.max(64, use.length * 2));
  const geo = new THREE.TubeGeometry(curve, segments, opts.routeWidthMM / 2, 10, false);
  const m = new THREE.Mesh(geo, mat(opts.colors.route, { roughness: 0.45, metalness: 0.05 }));
  m.name = "rota";
  return m;
}

// ---- montagem ----

export function buildModel(
  route: RoutePoint[],
  bbox: BBox,
  opts: BuildOptions,
  heightmap?: Heightmap | null,
  osm?: OsmData | null
): THREE.Group {
  const layout = makeLayout(bbox, route, opts.sizeMM);
  const hex = makeHex(layout.Rc);
  const group = new THREE.Group();
  group.name = "peca";

  let heightAt: (p: LngLat) => number;

  if (opts.mode === "terrain" && heightmap) {
    group.add(buildTerrain(heightmap, hex, layout, opts));
    heightAt = (p) => terrainHeightAt(p, heightmap, layout, opts);
  } else {
    group.add(buildHexBase(hex, opts));
    const buildingH = Math.max(1.2, opts.sizeMM / 70);
    const hasBuildings = Boolean(osm && osm.buildings.length);
    if (osm) {
      const green = buildAreas(osm.green, hex, layout, opts.baseHeightMM + 0.5, opts.colors.green, "verde");
      const water = buildAreas(osm.water, hex, layout, opts.baseHeightMM + 0.3, opts.colors.water, "agua");
      const roads = buildRoads(osm.roads, hex, layout, opts);
      const bld = buildBuildings(osm.buildings, hex, layout, opts, buildingH);
      for (const m of [green, water, bld, roads]) if (m) group.add(m);
    }
    // rota elevada acima das quadras para ser o elemento em destaque
    const lift = opts.baseHeightMM + (hasBuildings ? buildingH : 0);
    heightAt = () => lift;
  }

  group.add(buildRoute(route, hex, layout, opts, heightAt));
  return group;
}
