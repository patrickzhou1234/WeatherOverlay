// ─────────────────────────────────────────────────────────
// Rain.tsx — Soft-streak rain with depth layers & parallax.
// Uses a canvas-generated soft streak texture instead of
// plain boxes for a much more natural look.
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

/** Generate a soft vertical streak texture via canvas. */
function makeRainTexture(): THREE.CanvasTexture {
  const w = 8;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(w / 2, 0, w / 2, h);
  grad.addColorStop(0, 'rgba(180,210,255,0.0)');
  grad.addColorStop(0.15, 'rgba(180,210,255,0.6)');
  grad.addColorStop(0.5, 'rgba(200,225,255,0.9)');
  grad.addColorStop(0.85, 'rgba(180,210,255,0.6)');
  grad.addColorStop(1, 'rgba(180,210,255,0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2.5, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export const Rain: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const windSpeed = useStore((s) => s.environment.windSpeed);
  const condition = useStore((s) => s.environment.condition);

  const count = useMemo(
    () => (highPerf ? PARTICLE_CAP_HIGH : PARTICLE_CAP_NORMAL),
    [highPerf],
  );

  const isThunder = condition === 'THUNDERSTORM';

  // Per-drop data
  const drops = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const layer = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = Math.random() * 20 - 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      spd[i] = 0.18 + Math.random() * 0.22;
      layer[i] = Math.random();
    }
    return { pos, spd, layer };
  }, [count]);

  const texture = useMemo(() => makeRainTexture(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const frameInterval = 1 / TARGET_FPS;
  let accum = 0;

  useFrame((_, delta) => {
    accum += delta;
    if (accum < frameInterval) return;
    const dt = accum;
    accum = 0;
    if (!meshRef.current) return;

    const windDrift = windSpeed * 0.025;
    const speedMul = isThunder ? 2.2 : 1.0;
    const windAngle = Math.atan2(windDrift, 1) * 0.6;

    for (let i = 0; i < count; i++) {
      const { pos, spd, layer } = drops;

      pos[i * 3] += windDrift * dt * 60;
      pos[i * 3 + 1] -= spd[i] * speedMul * dt * 60;

      if (pos[i * 3 + 1] < -10) {
        pos[i * 3] = (Math.random() - 0.5) * 22;
        pos[i * 3 + 1] = 10 + Math.random() * 5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      }

      // Near drops are bigger + longer
      const depth = layer[i];
      const scaleX = 0.012 + depth * 0.012;
      const scaleY = 0.12 + depth * 0.18 + (isThunder ? 0.08 : 0);

      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      dummy.rotation.set(0, 0, -windAngle);
      dummy.scale.set(scaleX, scaleY, 1);
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
        opacity={isThunder ? 0.55 : 0.4}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        color={isThunder ? '#a0b8ff' : '#b0d4f8'}
      />
    </instancedMesh>
  );
};
