// ─────────────────────────────────────────────────────────
// Snow.tsx — Soft-glow snowflakes with gentle tumbling,
// varied sizes, and natural sine-wave drift.
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

/** Soft radial glow snowflake texture. */
function makeSnowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  grad.addColorStop(0, 'rgba(255,255,255,1.0)');
  grad.addColorStop(0.2, 'rgba(240,245,255,0.8)');
  grad.addColorStop(0.5, 'rgba(220,230,255,0.35)');
  grad.addColorStop(1, 'rgba(200,220,255,0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export const Snow: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const windSpeed = useStore((s) => s.environment.windSpeed);

  const count = useMemo(
    () => Math.round((highPerf ? PARTICLE_CAP_HIGH : PARTICLE_CAP_NORMAL) * 0.6),
    [highPerf],
  );

  // Per-flake data
  const flakes = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const swayAmp = new Float32Array(count);
    const rotSpd = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = Math.random() * 18 - 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      spd[i] = 0.015 + Math.random() * 0.035;
      size[i] = 0.03 + Math.random() * 0.06;
      phase[i] = Math.random() * Math.PI * 2;
      swayAmp[i] = 0.002 + Math.random() * 0.005;
      rotSpd[i] = (Math.random() - 0.5) * 1.5;
    }
    return { pos, spd, size, phase, swayAmp, rotSpd };
  }, [count]);

  const texture = useMemo(() => makeSnowTexture(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const frameInterval = 1 / TARGET_FPS;
  let accum = 0;
  let globalTime = 0;

  useFrame((_, delta) => {
    accum += delta;
    globalTime += delta;
    if (accum < frameInterval) return;
    const dt = accum;
    accum = 0;
    if (!meshRef.current) return;

    const windDrift = windSpeed * 0.006;

    for (let i = 0; i < count; i++) {
      const { pos, spd, size, phase, swayAmp, rotSpd } = flakes;

      // Fall
      pos[i * 3 + 1] -= spd[i] * dt * 60;

      // Gentle sway
      pos[i * 3] +=
        Math.sin(globalTime * 1.2 + phase[i]) * swayAmp[i] +
        windDrift * dt * 60;

      // Slight vertical bobbing for organic feel
      pos[i * 3 + 1] += Math.cos(globalTime * 0.8 + phase[i] * 2) * 0.0008;

      // Reset
      if (pos[i * 3 + 1] < -10) {
        pos[i * 3] = (Math.random() - 0.5) * 22;
        pos[i * 3 + 1] = 10 + Math.random() * 5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      }

      const s = size[i];
      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      dummy.rotation.set(0, 0, globalTime * rotSpd[i]);
      dummy.scale.set(s, s, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.8}
        depthWrite={false}
        side={THREE.DoubleSide}
        color="#ffffff"
      />
    </instancedMesh>
  );
};
