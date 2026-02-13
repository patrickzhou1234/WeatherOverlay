// ─────────────────────────────────────────────────────────
// Aurora.tsx — Shimmering aurora borealis ribbons that
// undulate across the upper portion of the viewport.
// Multiple layered ribbon meshes with vertex displacement
// create a flowing curtain of green/purple/cyan light.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { TARGET_FPS } from '../../../shared/constants';

const RIBBON_COUNT = 5;
const SEGMENTS = 80;

interface RibbonDef {
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  color: THREE.Color;
  opacity: number;
  width: number;
  phaseOffset: number;
}

export const Aurora: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const ribbonRefs = useRef<THREE.Mesh[]>([]);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const particleSpeed = useStore((s) => s.config.particleSpeed);
  const segCount = useMemo(() => (highPerf ? SEGMENTS : Math.round(SEGMENTS * 0.6)), [highPerf]);

  const ribbons: RibbonDef[] = useMemo(
    () => [
      {
        baseY: 1.6,
        amplitude: 0.5,
        frequency: 0.5,
        speed: 0.3,
        color: new THREE.Color('#00ff88'),
        opacity: 0.35,
        width: 1.6,
        phaseOffset: 0,
      },
      {
        baseY: 2.0,
        amplitude: 0.6,
        frequency: 0.4,
        speed: 0.25,
        color: new THREE.Color('#22ddaa'),
        opacity: 0.3,
        width: 1.8,
        phaseOffset: 1.5,
      },
      {
        baseY: 1.2,
        amplitude: 0.4,
        frequency: 0.7,
        speed: 0.35,
        color: new THREE.Color('#8844ff'),
        opacity: 0.28,
        width: 1.4,
        phaseOffset: 3.0,
      },
      {
        baseY: 2.3,
        amplitude: 0.7,
        frequency: 0.3,
        speed: 0.2,
        color: new THREE.Color('#00ccdd'),
        opacity: 0.22,
        width: 2.0,
        phaseOffset: 4.5,
      },
      {
        baseY: 0.8,
        amplitude: 0.35,
        frequency: 0.6,
        speed: 0.28,
        color: new THREE.Color('#44ee99'),
        opacity: 0.2,
        width: 1.2,
        phaseOffset: 2.2,
      },
    ],
    [],
  );

  // Create geometries for each ribbon — a tall plane subdivided along X
  const geometries = useMemo(() => {
    return ribbons.map((r) => {
      const geo = new THREE.PlaneGeometry(20, r.width, segCount, 1);
      return geo;
    });
  }, [ribbons, segCount]);

  const frameInterval = 1 / TARGET_FPS;
  let accum = 0;
  let globalTime = 0;

  useFrame((_, delta) => {
    accum += delta;
    globalTime += delta * particleSpeed;
    if (accum < frameInterval) return;
    accum = 0;

    for (let ri = 0; ri < RIBBON_COUNT; ri++) {
      const mesh = ribbonRefs.current[ri];
      if (!mesh) continue;

      const geo = mesh.geometry as THREE.PlaneGeometry;
      const posAttr = geo.attributes.position;
      const ribbon = ribbons[ri];
      const t = globalTime * ribbon.speed + ribbon.phaseOffset;

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const isTop = posAttr.getY(i) > 0;

        // Wave displacement
        const wave1 = Math.sin(x * ribbon.frequency + t * 2) * ribbon.amplitude;
        const wave2 = Math.sin(x * ribbon.frequency * 1.7 + t * 1.3 + 1.5) * ribbon.amplitude * 0.4;
        const wave3 = Math.sin(x * ribbon.frequency * 0.3 + t * 0.8) * ribbon.amplitude * 0.6;

        const yDisp = wave1 + wave2 + wave3;

        // Top vertices get more displacement for a curtain drape effect
        const vertY = isTop
          ? ribbon.baseY + yDisp
          : ribbon.baseY + yDisp - ribbon.width * (0.6 + Math.sin(x * 0.5 + t) * 0.2);

        posAttr.setY(i, vertY);

        // Slight Z undulation for depth
        const zDisp = Math.sin(x * 0.4 + t * 0.6 + ribbon.phaseOffset) * 0.3;
        posAttr.setZ(i, zDisp);
      }

      posAttr.needsUpdate = true;

      // Pulse opacity gently
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = ribbon.opacity * (0.7 + Math.sin(globalTime * 0.4 + ribbon.phaseOffset) * 0.3);
    }
  });

  return (
    <group ref={groupRef}>
      {ribbons.map((ribbon, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ribbonRefs.current[i] = el;
          }}
          geometry={geometries[i]}
        >
          <meshBasicMaterial
            color={ribbon.color}
            transparent
            opacity={ribbon.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};
