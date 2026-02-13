// ─────────────────────────────────────────────────────────
// Sunshine.tsx — Warm sun glow, soft god-rays, and floating
// dust motes for CLEAR weather. Gives the overlay a gentle
// golden-hour feel without blocking the desktop.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { TARGET_FPS } from '../../../shared/constants';

// ── Sun glow (top-right corner) ─────────────────────────

function makeSunTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Outer soft halo
  const outer = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  outer.addColorStop(0, 'rgba(255,245,220,0.35)');
  outer.addColorStop(0.15, 'rgba(255,230,180,0.2)');
  outer.addColorStop(0.4, 'rgba(255,210,140,0.08)');
  outer.addColorStop(0.7, 'rgba(255,200,120,0.02)');
  outer.addColorStop(1, 'rgba(255,180,100,0.0)');
  ctx.fillStyle = outer;
  ctx.fillRect(0, 0, size, size);

  // Inner bright core
  const inner = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size * 0.12,
  );
  inner.addColorStop(0, 'rgba(255,255,240,0.5)');
  inner.addColorStop(0.5, 'rgba(255,240,200,0.25)');
  inner.addColorStop(1, 'rgba(255,230,180,0.0)');
  ctx.fillStyle = inner;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const SunGlow: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useMemo(() => makeSunTexture(), []);

  let globalTime = 0;

  useFrame((_, delta) => {
    globalTime += delta;
    if (!meshRef.current) return;
    // Gentle breathing pulse
    const pulse = 1 + Math.sin(globalTime * 0.4) * 0.06;
    meshRef.current.scale.set(pulse, pulse, 1);
  });

  return (
    <mesh ref={meshRef} position={[5.5, 3.5, -2]}>
      <planeGeometry args={[8, 8]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.6}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// ── Soft god-rays ───────────────────────────────────────

function makeRayTexture(): THREE.CanvasTexture {
  const w = 64;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(w / 2, 0, w / 2, h);
  grad.addColorStop(0, 'rgba(255,240,200,0.0)');
  grad.addColorStop(0.1, 'rgba(255,235,180,0.12)');
  grad.addColorStop(0.4, 'rgba(255,230,170,0.06)');
  grad.addColorStop(1, 'rgba(255,220,150,0.0)');

  // Soft horizontal falloff
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2.2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const RAY_COUNT = 5;

const GodRays: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const texture = useMemo(() => makeRayTexture(), []);

  const rays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < RAY_COUNT; i++) {
      arr.push({
        angle: -0.3 - i * 0.18 + (Math.random() - 0.5) * 0.1,
        length: 6 + Math.random() * 4,
        width: 0.4 + Math.random() * 0.6,
        opacity: 0.3 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        swaySpeed: 0.15 + Math.random() * 0.15,
      });
    }
    return arr;
  }, []);

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

    // Sun origin (top-right)
    const originX = 5.5;
    const originY = 3.5;

    for (let i = 0; i < RAY_COUNT; i++) {
      const r = rays[i];

      // Gentle sway
      const sway = Math.sin(globalTime * r.swaySpeed + r.phase) * 0.04;
      const angle = r.angle + sway;

      // Position ray center along its direction from the sun
      const midDist = r.length * 0.45;
      const cx = originX + Math.cos(angle) * midDist;
      const cy = originY + Math.sin(angle) * midDist;

      // Fade in/out
      const fade = 0.7 + 0.3 * Math.sin(globalTime * 0.3 + r.phase);

      dummy.position.set(cx, cy, -1.5);
      dummy.rotation.set(0, 0, angle + Math.PI / 2);
      dummy.scale.set(r.width * fade, r.length, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, RAY_COUNT]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.35}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        color="#fff0d0"
      />
    </instancedMesh>
  );
};

// ── Floating dust motes ─────────────────────────────────

function makeDustTexture(): THREE.CanvasTexture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  grad.addColorStop(0, 'rgba(255,250,230,0.9)');
  grad.addColorStop(0.3, 'rgba(255,240,200,0.4)');
  grad.addColorStop(1, 'rgba(255,230,180,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const DUST_COUNT = 80;

const DustMotes: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const texture = useMemo(() => makeDustTexture(), []);

  const motes = useMemo(() => {
    const pos = new Float32Array(DUST_COUNT * 3);
    const spd = new Float32Array(DUST_COUNT);
    const size = new Float32Array(DUST_COUNT);
    const phase = new Float32Array(DUST_COUNT);
    const drift = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      spd[i] = 0.003 + Math.random() * 0.008;
      size[i] = 0.02 + Math.random() * 0.04;
      phase[i] = Math.random() * Math.PI * 2;
      drift[i] = (Math.random() - 0.5) * 0.005;
    }
    return { pos, spd, size, phase, drift };
  }, []);

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

    for (let i = 0; i < DUST_COUNT; i++) {
      const { pos, spd, size, phase, drift: d } = motes;

      // Slow upward float + gentle horizontal drift
      pos[i * 3 + 1] += spd[i] * dt * 60;
      pos[i * 3] += d[i] * dt * 60 + Math.sin(globalTime * 0.6 + phase[i]) * 0.001;

      // Reset when above viewport
      if (pos[i * 3 + 1] > 8) {
        pos[i * 3] = (Math.random() - 0.5) * 18;
        pos[i * 3 + 1] = -8 - Math.random() * 3;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      }

      // Twinkle
      const twinkle = 0.5 + 0.5 * Math.sin(globalTime * 1.5 + phase[i]);
      const s = size[i] * (0.6 + twinkle * 0.4);

      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      dummy.scale.set(s, s, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, DUST_COUNT]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.5}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        color="#fff8e0"
      />
    </instancedMesh>
  );
};

// ── Main export ─────────────────────────────────────────

export const Sunshine: React.FC = () => {
  return (
    <>
      <SunGlow />
      <GodRays />
      <DustMotes />
    </>
  );
};
