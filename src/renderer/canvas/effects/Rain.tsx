// ─────────────────────────────────────────────────────────
// Rain.tsx — Instanced particle system for rain / drizzle.
// Particle count is hard-capped (§5-1 Feedback Loop).
// Wind speed from the store drives horizontal drift.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import {
  PARTICLE_CAP_NORMAL,
  PARTICLE_CAP_HIGH,
  TARGET_FPS,
} from '../../../shared/constants';

export const Rain: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const windSpeed = useStore((s) => s.environment.windSpeed);
  const condition = useStore((s) => s.environment.condition);

  // §5-1 — hard cap on particles
  const count = useMemo(
    () => (highPerf ? PARTICLE_CAP_HIGH : PARTICLE_CAP_NORMAL),
    [highPerf],
  );

  // Initial positions: spread over a wide horizontal band, tall vertical band
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;     // x
      arr[i * 3 + 1] = Math.random() * 15;          // y (start high)
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;  // z
    }
    return arr;
  }, [count]);

  // Speeds per drop (slight variance)
  const speeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = 0.15 + Math.random() * 0.15;
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const frameInterval = 1 / TARGET_FPS;
  let accum = 0;

  useFrame((_, delta) => {
    accum += delta;
    if (accum < frameInterval) return;
    accum = 0;

    if (!meshRef.current) return;

    const windDrift = windSpeed * 0.02;
    const isThunder = condition === 'THUNDERSTORM';

    for (let i = 0; i < count; i++) {
      // Move down and to the side
      positions[i * 3] += windDrift * delta * 60;
      positions[i * 3 + 1] -= speeds[i] * (isThunder ? 1.8 : 1) * delta * 60;

      // Reset when below viewport
      if (positions[i * 3 + 1] < -8) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = 8 + Math.random() * 4;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }

      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
      );
      // Slight rotation to look like an elongated streak
      dummy.rotation.z = -0.15 + windDrift * 0.05;
      dummy.scale.set(0.01, 0.15, 0.01);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={condition === 'THUNDERSTORM' ? '#b0c4ff' : '#8ec8f0'}
        transparent
        opacity={0.5}
      />
    </instancedMesh>
  );
};
