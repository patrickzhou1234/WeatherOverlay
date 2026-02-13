// ─────────────────────────────────────────────────────────
// Snow.tsx — Instanced particle system for snowfall.
// Particles drift gently with sine-wave sway and wind.
// Hard-capped (§5-1).
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

export const Snow: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const windSpeed = useStore((s) => s.environment.windSpeed);

  const count = useMemo(
    () => Math.round((highPerf ? PARTICLE_CAP_HIGH : PARTICLE_CAP_NORMAL) * 0.6),
    [highPerf],
  );

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = Math.random() * 15;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, [count]);

  // Random phase offset per flake for sway
  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = Math.random() * Math.PI * 2;
    }
    return arr;
  }, [count]);

  const speeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = 0.02 + Math.random() * 0.04;
    }
    return arr;
  }, [count]);

  const sizes = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = 0.02 + Math.random() * 0.04;
    }
    return arr;
  }, [count]);

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

    const windDrift = windSpeed * 0.008;

    for (let i = 0; i < count; i++) {
      // Gentle downward fall
      positions[i * 3 + 1] -= speeds[i] * delta * 60;
      // Sway left-right on a sine wave + wind push
      positions[i * 3] +=
        Math.sin(globalTime * 1.5 + phases[i]) * 0.003 +
        windDrift * delta * 60;

      if (positions[i * 3 + 1] < -8) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = 8 + Math.random() * 4;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }

      const s = sizes[i];
      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
      );
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
    </instancedMesh>
  );
};
