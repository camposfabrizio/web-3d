"use client";

// Visualizador 3D interativo (girar/zoom) do modelo gerado.

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Bounds, Grid } from "@react-three/drei";
import * as THREE from "three";

export default function Viewer3D({ object }: { object: THREE.Group | null }) {
  return (
    <Canvas
      shadows
      camera={{ position: [90, 90, 120], fov: 40 }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0f1420"]} />
      <hemisphereLight args={[0xffffff, 0x33404d, 1.1]} />
      <directionalLight position={[60, 120, 40]} intensity={1.6} castShadow />
      <directionalLight position={[-80, 40, -60]} intensity={0.5} />

      {object && (
        <Bounds fit clip observe margin={1.2}>
          <primitive object={object} />
        </Bounds>
      )}

      <Grid
        args={[400, 400]}
        cellSize={10}
        cellColor="#2a3340"
        sectionSize={50}
        sectionColor="#3a4657"
        infiniteGrid
        fadeDistance={500}
        position={[0, -0.01, 0]}
      />
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
