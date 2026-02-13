// ─────────────────────────────────────────────────────────
// SakuraPetals.tsx — Cherry blossom petals gently tumbling
// and drifting across the screen. Each petal has a unique
// wobble, spin, and fall rate for a natural feel.
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

/** Soft petal-shaped texture with pink gradient. */
function makePetalTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Draw a petal shape — two overlapping ellipses
  ctx.save();
  ctx.translate(size / 2, size / 2);

  // First lobe
  const grad1 = ctx.createRadialGradient(-6, -4, 0, -6, -4, 24);
  grad1.addColorStop(0, 'rgba(255,183,197,0.95)');
  grad1.addColorStop(0.5, 'rgba(255,150,170,0.7)');
  grad1.addColorStop(1, 'rgba(255,120,150,0.0)');
  ctx.fillStyle = grad1;
  ctx.beginPath();
  ctx.ellipse(-4, -2, 18, 12, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Second lobe — slightly offset for asymmetry
  const grad2 = ctx.createRadialGradient(6, 2, 0, 6, 2, 22);
  grad2.addColorStop(0, 'rgba(255,200,210,0.9)');
  grad2.addColorStop(0.5, 'rgba(255,170,185,0.6)');
  grad2.addColorStop(1, 'rgba(255,140,165,0.0)');
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.ellipse(4, 2, 16, 11, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Tiny bright center
  const center = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
  center.addColorStop(0, 'rgba(255,230,235,0.8)');
  center.addColorStop(1, 'rgba(255,200,210,0.0)');
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export const SakuraPetals: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const windSpeed = useStore((s) => s.environment.windSpeed);

  const count = useMemo(
    () => Math.round((highPerf ? PARTICLE_CAP_HIGH : PARTICLE_CAP_NORMAL) * 0.4),
    [highPerf],
  );

  const petals = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const wobbleAmp = new Float32Array(count);
    const spinSpd = new Float32Array(count);
    const tiltSpd = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = Math.random() * 20 - 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      spd[i] = 0.008 + Math.random() * 0.018;
      size[i] = 0.04 + Math.random() * 0.07;
      phase[i] = Math.random() * Math.PI * 2;
      wobbleAmp[i] = 0.003 + Math.random() * 0.008;
      spinSpd[i] = (Math.random() - 0.5) * 2.5;
      tiltSpd[i] = (Math.random() - 0.5) * 1.2;
    }
    return { pos, spd, size, phase, wobbleAmp, spinSpd, tiltSpd };
  }, [count]);

  const texture = useMemo(() => makePetalTexture(), []);
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

    const windDrift = windSpeed * 0.008 + 0.004; // always a little breeze

    for (let i = 0; i < count; i++) {
      const { pos, spd, size, phase, wobbleAmp, spinSpd, tiltSpd } = petals;

      // Gentle fall
      pos[i * 3 + 1] -= spd[i] * dt * 60;

      // Horizontal sway — sinusoidal wobble + wind
      pos[i * 3] +=
        Math.sin(globalTime * 0.9 + phase[i]) * wobbleAmp[i] +
        windDrift * dt * 60;

      // Slight depth wobble
      pos[i * 3 + 2] += Math.cos(globalTime * 0.5 + phase[i] * 1.3) * 0.0005;

      // Reset when below screen
      if (pos[i * 3 + 1] < -10) {
        pos[i * 3] = (Math.random() - 0.5) * 24;
        pos[i * 3 + 1] = 10 + Math.random() * 5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
      // Wrap horizontally
      if (pos[i * 3] > 14) pos[i * 3] = -14;

      const s = size[i];
      // Petal tumbles on both axes for a fluttering look
      const rotZ = globalTime * spinSpd[i];
      const scaleFlutter = 0.6 + Math.abs(Math.sin(globalTime * tiltSpd[i] + phase[i])) * 0.4;

      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      dummy.rotation.set(0, 0, rotZ);
      dummy.scale.set(s * scaleFlutter, s, 1);
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
        opacity={0.85}
        depthWrite={false}
        side={THREE.DoubleSide}
        color="#ffb7c5"
      />
    </instancedMesh>
  );
};
