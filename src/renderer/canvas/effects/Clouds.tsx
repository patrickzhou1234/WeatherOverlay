// ─────────────────────────────────────────────────────────
// Clouds.tsx — Multi-layered drifting cloud / fog system.
// CLOUDY → large fluffy patches at varied heights.
// FOG    → dense low-hanging blanket that fills the screen.
// Uses multiple overlapping soft sprites per "cloud" for volume.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { TARGET_FPS } from '../../../shared/constants';

const MAX_PUFFS = 90;

interface PuffDef {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  speed: number;
  baseOpacity: number;
  phase: number;
  rotSpeed: number;
}

/** Create a high-quality soft cloud puff texture. */
function makeCloudTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Layer multiple offset radial gradients for an organic shape
  ctx.globalCompositeOperation = 'lighter';

  const blobs = [
    { x: 0.5, y: 0.5, r: 0.5, a: 0.4 },
    { x: 0.35, y: 0.45, r: 0.35, a: 0.3 },
    { x: 0.65, y: 0.45, r: 0.35, a: 0.3 },
    { x: 0.5, y: 0.35, r: 0.3, a: 0.25 },
    { x: 0.4, y: 0.55, r: 0.28, a: 0.2 },
    { x: 0.6, y: 0.55, r: 0.28, a: 0.2 },
  ];

  for (const b of blobs) {
    const grad = ctx.createRadialGradient(
      b.x * size, b.y * size, 0,
      b.x * size, b.y * size, b.r * size,
    );
    grad.addColorStop(0, `rgba(220,225,235,${b.a})`);
    grad.addColorStop(0.4, `rgba(200,208,220,${b.a * 0.6})`);
    grad.addColorStop(0.7, `rgba(180,190,205,${b.a * 0.25})`);
    grad.addColorStop(1, 'rgba(160,170,190,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export const Clouds: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const condition = useStore((s) => s.environment.condition);
  const windSpeed = useStore((s) => s.environment.windSpeed);

  const isFog = condition === 'FOG';

  const puffs: PuffDef[] = useMemo(() => {
    const arr: PuffDef[] = [];
    for (let i = 0; i < MAX_PUFFS; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 28,
        y: isFog
          ? (Math.random() - 0.5) * 10
          : -2 + Math.random() * 12,
        z: -3 - Math.random() * 8,
        scaleX: isFog
          ? 3 + Math.random() * 5
          : 2 + Math.random() * 4,
        scaleY: isFog
          ? 1.5 + Math.random() * 3
          : 1 + Math.random() * 2.5,
        speed: isFog
          ? 0.001 + Math.random() * 0.003
          : 0.003 + Math.random() * 0.008,
        baseOpacity: isFog
          ? 0.35 + Math.random() * 0.35
          : 0.12 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
      });
    }
    return arr;
  }, [isFog]);

  const texture = useMemo(() => makeCloudTexture(), []);
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

    const windDrift = windSpeed * (isFog ? 0.0008 : 0.003);

    for (let i = 0; i < MAX_PUFFS; i++) {
      const p = puffs[i];

      p.x += (p.speed + windDrift) * dt * 60;

      // Gentle vertical bob
      const yOff = Math.sin(globalTime * 0.3 + p.phase) * 0.08;

      if (p.x > 16) {
        p.x = -16 - Math.random() * 5;
        p.y = isFog
          ? (Math.random() - 0.5) * 10
          : -2 + Math.random() * 12;
      }

      // Subtle pulsing scale for organic breathing
      const breathe = 1 + Math.sin(globalTime * 0.25 + p.phase) * 0.06;

      dummy.position.set(p.x, p.y + yOff, p.z);
      dummy.rotation.set(0, 0, globalTime * p.rotSpeed);
      dummy.scale.set(p.scaleX * breathe, p.scaleY * breathe, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PUFFS]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={isFog ? 0.65 : 0.4}
        depthWrite={false}
        side={THREE.DoubleSide}
        color={isFog ? '#c0c5d0' : '#d5d8e0'}
      />
    </instancedMesh>
  );
};
