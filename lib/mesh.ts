// Construção da malha 3D da peça a partir da rota (GPX), do heightmap (terreno)
// e das feições do OSM (modo urbano). Gera um THREE.Group pronto para preview e
// para exportar em STL. Constrói em Y-up (X=leste, Z=norte, Y=altura).

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

export type BuildOptions = {
  mode: "terrain" | "urban";
  sizeMM: number;        // maior dimensão horizontal da peça
  baseHeightMM: number;  // espessura da base sólida
  exaggeration: number;  // exagero vertical do relevo (modo terreno)
  routeWidthMM: number;  // espessura do cordão da rota
  routeHeightMM: number; // quanto a rota se eleva sobre a superfície
};

const COLORS = {
  terrain: 0xcbd2d3,
  base: 0xece4d6,
  route: 0xff5a36,
  water: 0x8ecae6,
  green: 0xa7c957,
  building: 0xd8ccbe,
};

/** Layout: projeção lng/lat -> coordenadas do modelo (mm), centrado na origem. */
function makeLayout(bbox: BBox, sizeMM: number) {
  const ref = { lng: (bbox.minLng + bbox.maxLng) / 2, lat: (bbox.minLat + bbox.maxLat) / 2 };
  const proj = localProjection(ref);
  const c0 = proj.toMeters({ lng: bbox.minLng, lat: bbox.minLat });
  const c1 = proj.toMeters({ lng: bbox.maxLng, lat: bbox.maxLat });
  const widthM = Math.abs(c1.x - c0.x);
  const depthM = Math.abs(c1.y - c0.y);
  const scale = sizeMM / Math.max(widthM, depthM); // mm por metro

  return {
    scale,
    toModel(p: LngLat) {
      const m = proj.toMeters(p);
      return { X: m.x * scale, Z: -m.y * scale };
    },
    reliefMM(eleMeters: number, minEle: number, exaggeration: number) {
      return (eleMeters - minEle) * scale * exaggeration;
    },
  };
}
type Layout = ReturnType<typeof makeLayout>;

// ---- helpers de geometria ----

function pushTri(a: number[], p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3) {
  a.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
}

function geomFrom(positions: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

// ---- terreno sólido (watertight) ----

function buildTerrain(hm: Heightmap, layout: Layout, opts: BuildOptions): THREE.Mesh {
  const { nx, ny, heights, minEle } = hm;
  const base = opts.baseHeightMM;
  const exag = opts.exaggeration;

  // Vértices do topo numa grade regular
  const top: THREE.Vector3[] = new Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const lat = hm.bbox.maxLat + (hm.bbox.minLat - hm.bbox.maxLat) * (j / (ny - 1));
    for (let i = 0; i < nx; i++) {
      const lng = hm.bbox.minLng + (hm.bbox.maxLng - hm.bbox.minLng) * (i / (nx - 1));
      const { X, Z } = layout.toModel({ lng, lat });
      const Y = base + layout.reliefMM(heights[j * nx + i], minEle, exag);
      top[j * nx + i] = new THREE.Vector3(X, Y, Z);
    }
  }

  const pos: number[] = [];
  const at = (i: number, j: number) => top[j * nx + i];

  // Superfície superior
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      pushTri(pos, a, c, b);
      pushTri(pos, b, c, d);
    }
  }

  // Paredes laterais (topo -> y=0) para fechar o sólido
  const drop = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z);
  const wall = (v0: THREE.Vector3, v1: THREE.Vector3) => {
    const b0 = drop(v0), b1 = drop(v1);
    pushTri(pos, v0, v1, b0);
    pushTri(pos, v1, b1, b0);
  };
  for (let i = 0; i < nx - 1; i++) { wall(at(i, 0), at(i + 1, 0)); wall(at(i + 1, ny - 1), at(i, ny - 1)); }
  for (let j = 0; j < ny - 1; j++) { wall(at(nx - 1, j), at(nx - 1, j + 1)); wall(at(0, j + 1), at(0, j)); }

  // Fundo (retângulo em y=0)
  const b00 = drop(at(0, 0)), b10 = drop(at(nx - 1, 0));
  const b01 = drop(at(0, ny - 1)), b11 = drop(at(nx - 1, ny - 1));
  pushTri(pos, b00, b10, b01);
  pushTri(pos, b10, b11, b01);

  const mesh = new THREE.Mesh(geomFrom(pos), new THREE.MeshStandardMaterial({ color: COLORS.terrain, roughness: 0.95, flatShading: true }));
  mesh.name = "terreno";
  return mesh;
}

/** Altura (mm) da superfície do terreno num ponto lng/lat (amostra bilinear). */
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

// ---- base plana (modo urbano) ----

function buildBaseSlab(bbox: BBox, layout: Layout, opts: BuildOptions): THREE.Mesh {
  const a = layout.toModel({ lng: bbox.minLng, lat: bbox.minLat });
  const b = layout.toModel({ lng: bbox.maxLng, lat: bbox.maxLat });
  const w = Math.abs(b.X - a.X), d = Math.abs(b.Z - a.Z);
  const geo = new THREE.BoxGeometry(w, opts.baseHeightMM, d);
  geo.translate(0, opts.baseHeightMM / 2, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: COLORS.base, roughness: 0.9 }));
  mesh.name = "base";
  return mesh;
}

// ---- rota (cordão em relevo) ----

function buildRoute(route: RoutePoint[], layout: Layout, opts: BuildOptions, heightAt: (p: LngLat) => number): THREE.Mesh {
  const pts = route.map((p) => {
    const { X, Z } = layout.toModel(p);
    return new THREE.Vector3(X, heightAt(p) + opts.routeHeightMM, Z);
  });
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.2);
  const segments = Math.min(4000, Math.max(64, pts.length * 2));
  const geo = new THREE.TubeGeometry(curve, segments, opts.routeWidthMM / 2, 8, false);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: COLORS.route, roughness: 0.5, metalness: 0.1 }));
  mesh.name = "rota";
  return mesh;
}

// ---- feições OSM (modo urbano) ----

function buildRoads(roads: OsmData["roads"], layout: Layout, opts: BuildOptions): THREE.Mesh | null {
  if (!roads.length) return null;
  const positions: number[] = [];
  const top = opts.baseHeightMM;
  for (const r of roads) {
    const halfW = (r.major ? 1.1 : 0.6) * (opts.sizeMM / 120); // largura relativa ao tamanho
    const p = r.coords.map((c) => layout.toModel(c));
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      const dx = b.X - a.X, dz = b.Z - a.Z;
      const len = Math.hypot(dx, dz) || 1e-6;
      const ox = (-dz / len) * halfW, oz = (dx / len) * halfW; // normal no plano
      const y = top + 0.5;
      const v0 = new THREE.Vector3(a.X + ox, y, a.Z + oz);
      const v1 = new THREE.Vector3(a.X - ox, y, a.Z - oz);
      const v2 = new THREE.Vector3(b.X + ox, y, b.Z + oz);
      const v3 = new THREE.Vector3(b.X - ox, y, b.Z - oz);
      pushTri(positions, v0, v2, v1);
      pushTri(positions, v1, v2, v3);
    }
  }
  if (!positions.length) return null;
  const mesh = new THREE.Mesh(geomFrom(positions), new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.85 }));
  mesh.name = "vias";
  return mesh;
}

function buildPolygons(rings: LngLat[][], layout: Layout, y: number, color: number, name: string): THREE.Mesh | null {
  const positions: number[] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const shape = new THREE.Shape();
    ring.forEach((c, i) => {
      const { X, Z } = layout.toModel(c);
      if (i === 0) shape.moveTo(X, Z); else shape.lineTo(X, Z);
    });
    const geo = new THREE.ShapeGeometry(shape);
    const p = geo.getAttribute("position");
    const idx = geo.index!;
    for (let t = 0; t < idx.count; t += 3) {
      // ShapeGeometry fica no plano XY -> mapeia para XZ, na altura y
      const va = new THREE.Vector3(p.getX(idx.getX(t)), y, p.getY(idx.getX(t)));
      const vb = new THREE.Vector3(p.getX(idx.getX(t + 1)), y, p.getY(idx.getX(t + 1)));
      const vc = new THREE.Vector3(p.getX(idx.getX(t + 2)), y, p.getY(idx.getX(t + 2)));
      pushTri(positions, va, vc, vb);
    }
    geo.dispose();
  }
  if (!positions.length) return null;
  const mesh = new THREE.Mesh(geomFrom(positions), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  mesh.name = name;
  return mesh;
}

function buildBuildings(rings: LngLat[][], layout: Layout, opts: BuildOptions): THREE.Mesh | null {
  const positions: number[] = [];
  const base = opts.baseHeightMM;
  const h = Math.max(1.2, opts.sizeMM / 60); // altura das quadras relativa ao tamanho
  for (const ring of rings.slice(0, 900)) {
    if (ring.length < 3) continue;
    const shape = new THREE.Shape();
    ring.forEach((c, i) => {
      const { X, Z } = layout.toModel(c);
      if (i === 0) shape.moveTo(X, Z); else shape.lineTo(X, Z);
    });
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    // Extrude gera em XY com profundidade em Z; rotaciona para ficar em pé (XZ + altura Y)
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, base, 0);
    const p = geo.getAttribute("position");
    for (let i = 0; i < p.count; i++) positions.push(p.getX(i), p.getY(i), p.getZ(i));
    geo.dispose();
  }
  if (!positions.length) return null;
  const mesh = new THREE.Mesh(geomFrom(positions), new THREE.MeshStandardMaterial({ color: COLORS.building, roughness: 0.9 }));
  mesh.name = "quadras";
  return mesh;
}

// ---- montagem ----

export function buildModel(
  route: RoutePoint[],
  bbox: BBox,
  opts: BuildOptions,
  heightmap?: Heightmap | null,
  osm?: OsmData | null
): THREE.Group {
  const layout = makeLayout(bbox, opts.sizeMM);
  const group = new THREE.Group();
  group.name = "peca";

  let heightAt: (p: LngLat) => number;

  if (opts.mode === "terrain" && heightmap) {
    group.add(buildTerrain(heightmap, layout, opts));
    heightAt = (p) => terrainHeightAt(p, heightmap, layout, opts);
  } else {
    group.add(buildBaseSlab(bbox, layout, opts));
    heightAt = () => opts.baseHeightMM;
    if (osm) {
      const green = buildPolygons(osm.green, layout, opts.baseHeightMM + 0.5, COLORS.green, "verde");
      const water = buildPolygons(osm.water, layout, opts.baseHeightMM + 0.3, COLORS.water, "agua");
      const roads = buildRoads(osm.roads, layout, opts);
      const bld = buildBuildings(osm.buildings, layout, opts);
      for (const m of [green, water, bld, roads]) if (m) group.add(m);
    }
  }

  group.add(buildRoute(route, layout, opts, heightAt));

  // Centraliza verticalmente para o preview (mantém base em y=0)
  return group;
}
