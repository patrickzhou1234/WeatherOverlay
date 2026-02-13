// ─────────────────────────────────────────────────────────
// HydroBlast.tsx — Explosive water-spray particle effect.
// A central burst point sends droplets arcing outward in
// all directions with gravity pull-back, creating a looping
// fountain / hydro-cannon aesthetic.
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

/** Soft radial water-droplet texture. */
function makeDropletTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  grad.addColorStop(0, 'rgba(120,200,255,1.0)');
  grad.addColorStop(0.15, 'rgba(100,180,255,0.85)');
  grad.addColorStop(0.4, 'rgba(70,150,240,0.45)');
  grad.addColorStop(0.7, 'rgba(50,120,220,0.15)');
  grad.addColorStop(1, 'rgba(30,100,200,0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Elongated streak for fast-moving particles. */
function makeStreakTexture(): THREE.CanvasTexture {
  const w = 8;
  const h = 48;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(w / 2, 0, w / 2, h);
  grad.addColorStop(0, 'rgba(140,210,255,0.0)');
  grad.addColorStop(0.2, 'rgba(120,200,255,0.7)');
  grad.addColorStop(0.5, 'rgba(100,190,255,0.9)');
  grad.addColorStop(0.8, 'rgba(120,200,255,0.7)');
  grad.addColorStop(1, 'rgba(140,210,255,0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2.2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const GRAVITY = -0.06;
const BURST_INTERVAL = 3.5; // seconds between bursts

export const HydroBlast: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const mistRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const particleSpeed = useStore((s) => s.config.particleSpeed);

  const count = useMemo(
    () => Math.round((highPerf ? PARTICLE_CAP_HIGH : PARTICLE_CAP_NORMAL) * 0.5),
    [highPerf],
  );
  const mistCount = useMemo(() => Math.round(count * 0.15), [count]);

  // Per-droplet data
  const drops = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const maxLife = new Float32Array(count);
    const size = new Float32Array(count);

    const reset = (i: number) => {
      // Spawn from center-bottom area
      pos[i * 3] = (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = -2 + Math.random() * 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;

      // Burst velocity — upward and outward
      const angle = Math.random() * Math.PI * 2;
      const upForce = 0.12 + Math.random() * 0.18;
      const spread = 0.04 + Math.random() * 0.08;
      vel[i * 3] = Math.cos(angle) * spread;
      vel[i * 3 + 1] = upForce;
      vel[i * 3 + 2] = Math.sin(angle) * spread * 0.5;

      maxLife[i] = 1.5 + Math.random() * 2.0;
      life[i] = maxLife[i];
      size[i] = 0.02 + Math.random() * 0.04;
    };

    for (let i = 0; i < count; i++) {
      reset(i);
      // Stagger initial lifetimes so they don't all burst at once
      life[i] = Math.random() * maxLife[i];
    }

    return { pos, vel, life, maxLife, size, reset };
  }, [count]);

  // Mist puffs (slow, large, low opacity)
  const mist = useMemo(() => {
    const pos = new Float32Array(mistCount * 3);
    const size = new Float32Array(mistCount);
    const phase = new Float32Array(mistCount);

    for (let i = 0; i < mistCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = -3 + Math.random() * 3;
      pos[i * 3 + 2] = -1 - Math.random() * 3;
      size[i] = 0.5 + Math.random() * 1.5;
      phase[i] = Math.random() * Math.PI * 2;
    }
    return { pos, size, phase };
  }, [mistCount]);

  const dropTexture = useMemo(() => makeStreakTexture(), []);
  const mistTexture = useMemo(() => makeDropletTexture(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const frameInterval = 1 / TARGET_FPS;
  let accum = 0;
  let burstTimer = 0;

  useFrame((_, delta) => {
    accum += delta;
    burstTimer += delta;
    if (accum < frameInterval) return;
    const dt = accum;
    accum = 0;

    // Periodic burst reset
    const doBurst = burstTimer >= BURST_INTERVAL;
    if (doBurst) burstTimer = 0;

    // ── Update droplets ──
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        const { pos, vel, life, maxLife, size, reset } = drops;

        life[i] -= dt;

        if (life[i] <= 0 || doBurst) {
          reset(i);
        }

        // Apply gravity
        vel[i * 3 + 1] += GRAVITY * particleSpeed * dt * 60;

        // Move
        pos[i * 3] += vel[i * 3] * particleSpeed * dt * 60;
        pos[i * 3 + 1] += vel[i * 3 + 1] * particleSpeed * dt * 60;
        pos[i * 3 + 2] += vel[i * 3 + 2] * particleSpeed * dt * 60;

        // Fade based on remaining life
        const lifeRatio = Math.max(0, life[i] / maxLife[i]);
        const s = size[i] * (0.5 + lifeRatio * 0.5);

        // Orient streak along velocity
        const vx = vel[i * 3];
        const vy = vel[i * 3 + 1];
        const angle = Math.atan2(vy, vx) - Math.PI / 2;
        const speed = Math.sqrt(vx * vx + vy * vy);
        const stretch = 1 + speed * 8;

        dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        dummy.rotation.set(0, 0, angle);
        dummy.scale.set(s, s * stretch, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    // ── Update mist puffs ──
    if (mistRef.current) {
      for (let i = 0; i < mistCount; i++) {
        const { pos, size, phase } = mist;
        const t = burstTimer;
        const breathe = 1 + Math.sin(t * 0.8 + phase[i]) * 0.15;
        const s = size[i] * breathe;

        dummy.position.set(
          pos[i * 3] + Math.sin(t * 0.3 + phase[i]) * 0.3,
          pos[i * 3 + 1],
          pos[i * 3 + 2],
        );
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(s, s * 0.6, 1);
        dummy.updateMatrix();
        mistRef.current.setMatrixAt(i, dummy.matrix);
      }
      mistRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Fast droplet streaks */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={dropTexture}
          transparent
          opacity={0.6}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          color="#78c8ff"
        />
      </instancedMesh>

      {/* Background mist puffs */}
      <instancedMesh ref={mistRef} args={[undefined, undefined, mistCount]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={mistTexture}
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          color="#a0d8ff"
        />
      </instancedMesh>
    </>
  );
};
