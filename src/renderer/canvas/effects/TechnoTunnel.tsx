// ─────────────────────────────────────────────────────────
// TechnoTunnel.tsx — Gentle wireframe tunnel with soft
// glowing rings that drift toward the camera. A calm,
// ambient warp aesthetic — more lo-fi than rave.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { TARGET_FPS } from '../../../shared/constants';

const RING_COUNT = 16;
const TUNNEL_DEPTH = 40;

/** Soft, muted palette. */
const COLORS = [
  new THREE.Color('#4488aa'), // teal
  new THREE.Color('#6677aa'), // slate blue
  new THREE.Color('#558899'), // steel
  new THREE.Color('#7766aa'), // dusty violet
  new THREE.Color('#448888'), // muted cyan
];

export const TechnoTunnel: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const ringsRef = useRef<THREE.Mesh[]>([]);
  const starsRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const particleSpeed = useStore((s) => s.config.particleSpeed);

  const starCount = useMemo(() => (highPerf ? 120 : 60), [highPerf]);

  // Ring data — evenly spaced, gentle drift
  const ringData = useMemo(() => {
    const arr: { z: number; radius: number; colorIdx: number; rotSpeed: number }[] = [];
    for (let i = 0; i < RING_COUNT; i++) {
      arr.push({
        z: -TUNNEL_DEPTH + (i / RING_COUNT) * TUNNEL_DEPTH,
        radius: 3.0 + Math.sin(i * 0.7) * 0.4,
        colorIdx: i % COLORS.length,
        rotSpeed: 0.03 + Math.random() * 0.05,
      });
    }
    return arr;
  }, []);

  // Subtle floating motes
  const stars = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const spd = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1.0 + Math.random() * 3.5;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.sin(angle) * r;
      pos[i * 3 + 2] = -Math.random() * TUNNEL_DEPTH;
      spd[i] = 0.03 + Math.random() * 0.06;
    }
    return { pos, spd };
  }, [starCount]);

  const starTexture = useMemo(() => {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    grad.addColorStop(0, 'rgba(180,210,240,0.8)');
    grad.addColorStop(0.4, 'rgba(150,185,220,0.3)');
    grad.addColorStop(1, 'rgba(120,160,200,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    return tex;
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

    const speed = 1.8 * particleSpeed; // gentle drift

    // ── Update rings ──
    for (let i = 0; i < RING_COUNT; i++) {
      const ring = ringData[i];
      const mesh = ringsRef.current[i];
      if (!mesh) continue;

      ring.z += speed * dt;
      if (ring.z > 2) {
        ring.z -= TUNNEL_DEPTH;
        ring.colorIdx = (ring.colorIdx + 1) % COLORS.length;
      }

      mesh.position.z = ring.z;
      mesh.rotation.z = globalTime * ring.rotSpeed;

      // Scale based on depth
      const t = (ring.z + TUNNEL_DEPTH) / TUNNEL_DEPTH;
      const scale = 0.3 + t * 0.7;
      mesh.scale.set(ring.radius * scale, ring.radius * scale, 1);

      // Gentle breathing opacity
      const proximity = Math.min(1, t * 1.2);
      const breathe = 0.6 + Math.sin(globalTime * 0.8 + i * 0.9) * 0.15;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(COLORS[ring.colorIdx]);
      mat.opacity = proximity * breathe * 0.25;
    }

    // ── Update floating motes ──
    if (starsRef.current) {
      for (let i = 0; i < starCount; i++) {
        const { pos, spd } = stars;

        pos[i * 3 + 2] += spd[i] * speed * dt;
        if (pos[i * 3 + 2] > 2) {
          pos[i * 3 + 2] -= TUNNEL_DEPTH;
          const angle = Math.random() * Math.PI * 2;
          const r = 1.0 + Math.random() * 3.5;
          pos[i * 3] = Math.cos(angle) * r;
          pos[i * 3 + 1] = Math.sin(angle) * r;
        }

        const zNorm = (pos[i * 3 + 2] + TUNNEL_DEPTH) / TUNNEL_DEPTH;
        const s = 0.02 + zNorm * 0.03;

        dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(s, s, 1);
        dummy.updateMatrix();
        starsRef.current.setMatrixAt(i, dummy.matrix);
      }
      starsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Soft wireframe rings */}
      {ringData.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringsRef.current[i] = el;
          }}
        >
          <ringGeometry args={[0.94, 1.0, 48]} />
          <meshBasicMaterial
            transparent
            opacity={0.2}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            color={COLORS[i % COLORS.length]}
          />
        </mesh>
      ))}

      {/* Floating motes */}
      <instancedMesh ref={starsRef} args={[undefined, undefined, starCount]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={starTexture}
          transparent
          opacity={0.35}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          color="#8ab4d0"
        />
      </instancedMesh>
    </group>
  );
};
