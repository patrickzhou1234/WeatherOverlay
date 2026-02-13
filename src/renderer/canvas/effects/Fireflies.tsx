// ─────────────────────────────────────────────────────────
// Fireflies.tsx — Warm glowing fireflies that drift lazily
// around the screen, pulsing in and out. Each firefly has
// its own orbit, pulse rhythm, and color warmth.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { TARGET_FPS } from '../../../shared/constants';

/** Soft radial glow texture. */
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  grad.addColorStop(0, 'rgba(255,240,150,1.0)');
  grad.addColorStop(0.1, 'rgba(255,230,120,0.8)');
  grad.addColorStop(0.3, 'rgba(255,210,80,0.4)');
  grad.addColorStop(0.6, 'rgba(255,190,50,0.1)');
  grad.addColorStop(1, 'rgba(255,180,30,0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const FLY_COUNT = 60;

export const Fireflies: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const count = useMemo(() => (highPerf ? FLY_COUNT * 2 : FLY_COUNT), [highPerf]);

  const flies = useMemo(() => {
    const baseX = new Float32Array(count);
    const baseY = new Float32Array(count);
    const baseZ = new Float32Array(count);
    const orbitR = new Float32Array(count);
    const orbitSpd = new Float32Array(count);
    const phase = new Float32Array(count);
    const pulseSpd = new Float32Array(count);
    const pulsePhase = new Float32Array(count);
    const size = new Float32Array(count);
    const warmth = new Float32Array(count); // 0 = yellow, 1 = green

    for (let i = 0; i < count; i++) {
      baseX[i] = (Math.random() - 0.5) * 18;
      baseY[i] = (Math.random() - 0.5) * 10;
      baseZ[i] = (Math.random() - 0.5) * 8;
      orbitR[i] = 0.3 + Math.random() * 1.2;
      orbitSpd[i] = 0.2 + Math.random() * 0.6;
      phase[i] = Math.random() * Math.PI * 2;
      pulseSpd[i] = 1.5 + Math.random() * 3;
      pulsePhase[i] = Math.random() * Math.PI * 2;
      size[i] = 0.06 + Math.random() * 0.12;
      warmth[i] = Math.random();
    }

    return { baseX, baseY, baseZ, orbitR, orbitSpd, phase, pulseSpd, pulsePhase, size, warmth };
  }, [count]);

  const texture = useMemo(() => makeGlowTexture(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);
  const frameInterval = 1 / TARGET_FPS;
  let accum = 0;
  let globalTime = 0;

  useFrame((_, delta) => {
    accum += delta;
    globalTime += delta;
    if (accum < frameInterval) return;
    accum = 0;
    if (!meshRef.current) return;

    for (let i = 0; i < count; i++) {
      const {
        baseX, baseY, baseZ, orbitR, orbitSpd, phase,
        pulseSpd, pulsePhase, size, warmth,
      } = flies;

      const t = globalTime;
      const angle = t * orbitSpd[i] + phase[i];

      // Figure-8ish orbit
      const x = baseX[i] + Math.sin(angle) * orbitR[i];
      const y = baseY[i] + Math.sin(angle * 0.7 + phase[i]) * orbitR[i] * 0.6;
      const z = baseZ[i] + Math.cos(angle * 0.5) * orbitR[i] * 0.3;

      // Pulse brightness: sharp on/off with smooth easing
      const pulse = Math.pow(
        Math.max(0, Math.sin(t * pulseSpd[i] + pulsePhase[i])),
        2.5,
      );

      const s = size[i] * (0.3 + pulse * 0.7);

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(s, s, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Tint between warm yellow and yellow-green
      colorObj.setHSL(0.12 + warmth[i] * 0.1, 0.9, 0.5 + pulse * 0.3);
      meshRef.current.setColorAt(i, colorObj);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.9}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  );
};
