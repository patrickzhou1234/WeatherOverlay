// ─────────────────────────────────────────────────────────
// CityLights.tsx — Procedural sprite generation
// Renders a small grid of warm-colored "window" sprites
// near the bottom of the viewport to evoke a distant cityscape.
// During NIGHT / DUSK more lights are visible.
// ─────────────────────────────────────────────────────────

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { TARGET_FPS } from '../../../shared/constants';

/** Maximum window sprites (cheap quads). */
const MAX_LIGHTS = 200;

interface LightDef {
  x: number;
  y: number;
  z: number;
  baseOpacity: number;
  flickerSpeed: number;
  color: THREE.Color;
}

export const CityLights: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const timeOfDay = useStore((s) => s.environment.timeOfDay);

  // Generate deterministic light positions once
  const lights: LightDef[] = useMemo(() => {
    const arr: LightDef[] = [];
    const warm = [
      new THREE.Color('#ffcc66'),
      new THREE.Color('#ffe0a0'),
      new THREE.Color('#ffaa44'),
      new THREE.Color('#cc8833'),
    ];

    for (let i = 0; i < MAX_LIGHTS; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 18,
        y: -3.5 + Math.random() * 2.5, // low band
        z: -3 - Math.random() * 5,
        baseOpacity: 0.3 + Math.random() * 0.7,
        flickerSpeed: 0.5 + Math.random() * 2,
        color: warm[Math.floor(Math.random() * warm.length)],
      });
    }
    return arr;
  }, []);

  // Shared material whose color is set per-instance via userData
  // (instanced color not used here; we just pick a single warm tone)
  const colorArray = useMemo(() => {
    const arr = new Float32Array(MAX_LIGHTS * 3);
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const c = lights[i].color;
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [lights]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const frameInterval = 1 / TARGET_FPS;
  let accum = 0;
  let globalTime = 0;

  useFrame((_, delta) => {
    accum += delta;
    globalTime += delta;
    if (accum < frameInterval) return;
    accum = 0;
    if (!meshRef.current) return;

    // More lights visible at night / dusk
    const visibleRatio =
      timeOfDay === 'NIGHT' ? 1.0
        : timeOfDay === 'DUSK' ? 0.7
          : timeOfDay === 'DAWN' ? 0.4
            : 0.15;

    const visibleCount = Math.floor(MAX_LIGHTS * visibleRatio);

    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = lights[i];
      if (i < visibleCount) {
        // Flicker via sine
        const flicker =
          0.6 + 0.4 * Math.sin(globalTime * l.flickerSpeed + i);
        const scale = 0.04 + flicker * 0.03;
        dummy.position.set(l.x, l.y, l.z);
        dummy.scale.set(scale * 2.5, scale, scale);
      } else {
        // Hide extra lights by scaling to zero
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
      }
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_LIGHTS]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#ffcc66"
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
};
