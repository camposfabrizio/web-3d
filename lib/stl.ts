// Exportador binário de STL. Percorre um Object3D, transforma cada triângulo
// para coordenadas de mundo e serializa em STL binário — pronto para o slicer.

import * as THREE from "three";

export function exportSTL(root: THREE.Object3D): ArrayBuffer {
  root.updateMatrixWorld(true);

  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });

  // Conta triângulos
  let triCount = 0;
  for (const m of meshes) {
    const g = m.geometry as THREE.BufferGeometry;
    const pos = g.getAttribute("position");
    if (!pos) continue;
    triCount += g.index ? g.index.count / 3 : pos.count / 3;
  }

  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);
  let offset = 80;
  view.setUint32(offset, triCount, true);
  offset += 4;

  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nrm = new THREE.Vector3();

  const writeTri = () => {
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    nrm.crossVectors(ab, ac).normalize();
    view.setFloat32(offset, nrm.x, true); offset += 4;
    view.setFloat32(offset, nrm.y, true); offset += 4;
    view.setFloat32(offset, nrm.z, true); offset += 4;
    for (const v of [a, b, c]) {
      view.setFloat32(offset, v.x, true); offset += 4;
      view.setFloat32(offset, v.y, true); offset += 4;
      view.setFloat32(offset, v.z, true); offset += 4;
    }
    view.setUint16(offset, 0, true); offset += 2;
  };

  for (const m of meshes) {
    const g = m.geometry as THREE.BufferGeometry;
    const pos = g.getAttribute("position");
    if (!pos) continue;
    const mw = m.matrixWorld;
    const idx = g.index;
    const triangles = idx ? idx.count / 3 : pos.count / 3;
    for (let t = 0; t < triangles; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(mw);
      b.fromBufferAttribute(pos, i1).applyMatrix4(mw);
      c.fromBufferAttribute(pos, i2).applyMatrix4(mw);
      writeTri();
    }
  }

  return buffer;
}

/** Dispara o download de um Object3D como .stl no navegador. */
export function downloadSTL(root: THREE.Object3D, filename: string) {
  const buf = exportSTL(root);
  const blob = new Blob([buf], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".stl") ? filename : `${filename}.stl`;
  a.click();
  URL.revokeObjectURL(url);
}
