// ─────────────────────────────────────────────────────────
// TechnoTunnel.tsx — Neon wireframe tunnel with pulsing
// rings that fly toward the camera. Creates a retro/cyber
// warp-speed aesthetic layered over the desktop.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { TARGET_FPS } from '../../../shared/constants';

const RING_COUNT = 28;
const TUNNEL_DEPTH = 30;

/** Neon color palette — cycles through these. */
const NEON_COLORS = [
  new THREE.Color('#00ffff'), // cyan
  new THREE.Color('#ff00ff'), // magenta
  new THREE.Color('#00ff88'), // mint
  new THREE.Color('#ff3366'), // hot pink
  new THREE.Color('#6644ff'), // purple
  new THREE.Color('#ffaa00'), // amber
];

export const TechnoTunnel: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const ringsRef = useRef<THREE.Mesh[]>([]);
  const starsRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const particleSpeed = useStore((s) => s.config.particleSpeed);

  const starCount = useMemo(() => (highPerf ? 400 : 200), [highPerf]);

  // Ring data: z positions that loop
  const ringData = useMemo(() => {
    const arr: { z: number; radius: number; colorIdx: number; rotSpeed: number }[] = [];
    for (let i = 0; i < RING_COUNT; i++) {
      arr.push({
        z: -TUNNEL_DEPTH + (i / RING_COUNT) * TUNNEL_DEPTH,
        radius: 2.5 + Math.sin(i * 0.5) * 0.8,
        colorIdx: i % NEON_COLORS.length,
        rotSpeed: 0.2 + Math.random() * 0.4,
      });
    }
    return arr;
  }, []);

  // Speed-line stars
  const stars = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const spd = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 4;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.sin(angle) * r;
      pos[i * 3 + 2] = -Math.random() * TUNNEL_DEPTH;
      spd[i] = 0.15 + Math.random() * 0.25;
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
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(200,220,255,0.6)');
    grad.addColorStop(1, 'rgba(150,180,255,0)');
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

    const speed = 6 * particleSpeed; // tunnel scroll speed

    // ── Update rings ──
    for (let i = 0; i < RING_COUNT; i++) {
      const ring = ringData[i];
      const mesh = ringsRef.current[i];
      if (!mesh) continue;

      // Move toward camera
      ring.z += speed * dt;
      if (ring.z > 2) {
        ring.z -= TUNNEL_DEPTH;
        ring.colorIdx = (ring.colorIdx + 1) % NEON_COLORS.length;
      }

      mesh.position.z = ring.z;
      mesh.rotation.z = globalTime * ring.rotSpeed;

      // Scale based on distance (perspective)
      const t = (ring.z + TUNNEL_DEPTH) / TUNNEL_DEPTH;
      const scale = 0.3 + t * 0.7;
      mesh.scale.set(ring.radius * scale, ring.radius * scale, 1);

      // Pulse opacity based on proximity to camera
      const opacity = Math.min(1, t * 1.5) * (0.5 + Math.sin(globalTime * 3 + i) * 0.2);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(NEON_COLORS[ring.colorIdx]);
      mat.opacity = opacity * 0.7;
    }

    // ── Update speed-line stars ──
    if (starsRef.current) {
      for (let i = 0; i < starCount; i++) {
        const { pos, spd } = stars;

        pos[i * 3 + 2] += spd[i] * speed * dt;
        if (pos[i * 3 + 2] > 2) {
          pos[i * 3 + 2] -= TUNNEL_DEPTH;
          const angle = Math.random() * Math.PI * 2;
          const r = 1.5 + Math.random() * 4;
          pos[i * 3] = Math.cos(angle) * r;
          pos[i * 3 + 1] = Math.sin(angle) * r;
        }

        const zNorm = (pos[i * 3 + 2] + TUNNEL_DEPTH) / TUNNEL_DEPTH;
        const s = 0.01 + zNorm * 0.04;

        dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(s, s * (1 + spd[i] * 3), 1);
        dummy.updateMatrix();
        starsRef.current.setMatrixAt(i, dummy.matrix);
      }
      starsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Wireframe rings */}
      {ringData.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringsRef.current[i] = el;
          }}
        >
          <ringGeometry args={[0.92, 1.0, 32]} />
          <meshBasicMaterial
            transparent
            opacity={0.5}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            color={NEON_COLORS[i % NEON_COLORS.length]}
          />
        </mesh>
      ))}

      {/* Speed-line stars */}
      <instancedMesh ref={starsRef} args={[undefined, undefined, starCount]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={starTexture}
          transparent
          opacity={0.7}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          color="#aaccff"
        />
      </instancedMesh>
    </group>
  );
};
