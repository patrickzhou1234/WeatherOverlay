// ─────────────────────────────────────────────────────────
// HydroBlast.tsx — Underwater shader effect.
// A fullscreen quad runs a procedural GLSL shader that
// generates realistic underwater caustics, god rays,
// surface ripples, and volumetric depth — all GPU-side.
// A small instanced-mesh layer adds rising bubble particles.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { TARGET_FPS } from '../../../shared/constants';
import waterfallFrag from '../shaders/waterfall.glsl';

/** Minimal vertex shader — passes UV to fragment. */
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Bubble texture — translucent sphere with bright rim highlight. */
function makeBubbleTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  // Outer ring — the bubble edge
  const ring = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r);
  ring.addColorStop(0, 'rgba(180,220,250,0.0)');
  ring.addColorStop(0.5, 'rgba(190,225,250,0.12)');
  ring.addColorStop(0.8, 'rgba(200,235,255,0.3)');
  ring.addColorStop(0.95, 'rgba(220,240,255,0.25)');
  ring.addColorStop(1, 'rgba(200,230,250,0.0)');
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, size, size);

  // Inner glow — slight fill so the bubble isn't invisible
  const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
  inner.addColorStop(0, 'rgba(200,235,255,0.06)');
  inner.addColorStop(0.5, 'rgba(180,220,250,0.04)');
  inner.addColorStop(1, 'rgba(160,210,245,0.0)');
  ctx.fillStyle = inner;
  ctx.fillRect(0, 0, size, size);

  // Specular highlight — small bright spot top-left
  const spec = ctx.createRadialGradient(
    cx - r * 0.3, cy - r * 0.3, 0,
    cx - r * 0.3, cy - r * 0.3, r * 0.25,
  );
  spec.addColorStop(0, 'rgba(255,255,255,0.5)');
  spec.addColorStop(0.5, 'rgba(230,245,255,0.2)');
  spec.addColorStop(1, 'rgba(200,230,250,0.0)');
  ctx.fillStyle = spec;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const BUBBLE_COUNT_NORMAL = 40;
const BUBBLE_COUNT_HIGH = 80;

export const HydroBlast: React.FC = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null!);
  const bubblesRef = useRef<THREE.InstancedMesh>(null!);

  const highPerf = useStore((s) => s.config.highPerformanceMode);
  const particleSpeed = useStore((s) => s.config.particleSpeed);
  const overlayOpacity = useStore((s) => s.config.overlayOpacity);

  const { viewport } = useThree();

  const bubbleCount = useMemo(
    () => (highPerf ? BUBBLE_COUNT_HIGH : BUBBLE_COUNT_NORMAL),
    [highPerf],
  );

  // Shader uniforms
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: 1.0 },
      uOpacity: { value: 0.6 },
    }),
    [],
  );

  // Bubble particle data — rise from bottom with wobble
  const bubbles = useMemo(() => {
    const pos = new Float32Array(bubbleCount * 3);
    const size = new Float32Array(bubbleCount);
    const phase = new Float32Array(bubbleCount);
    const riseSpeed = new Float32Array(bubbleCount);
    const wobbleAmt = new Float32Array(bubbleCount);

    const reset = (i: number) => {
      pos[i * 3] = (Math.random() - 0.5) * viewport.width * 0.9;
      pos[i * 3 + 1] = -viewport.height / 2 - Math.random() * 2;
      pos[i * 3 + 2] = 0.2 + Math.random() * 0.8;
      size[i] = 0.03 + Math.random() * 0.12;
      phase[i] = Math.random() * Math.PI * 2;
      riseSpeed[i] = 0.3 + Math.random() * 0.6;
      wobbleAmt[i] = 0.1 + Math.random() * 0.25;
    };

    for (let i = 0; i < bubbleCount; i++) {
      reset(i);
      // Stagger initial Y across the full height
      pos[i * 3 + 1] = (Math.random() - 0.5) * viewport.height;
    }

    return { pos, size, phase, riseSpeed, wobbleAmt, reset };
  }, [bubbleCount, viewport.width, viewport.height]);

  const bubbleTexture = useMemo(() => makeBubbleTexture(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const frameInterval = 1 / TARGET_FPS;
  let accum = 0;

  useFrame((_, delta) => {
    accum += delta;
    if (accum < frameInterval) return;
    const dt = accum;
    accum = 0;

    const time = shaderRef.current ? shaderRef.current.uniforms.uTime.value : 0;

    // ── Update shader uniforms ──
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value += dt;
      shaderRef.current.uniforms.uSpeed.value = particleSpeed;
      shaderRef.current.uniforms.uOpacity.value = Math.min(overlayOpacity, 0.7);
    }

    // ── Update bubble particles ──
    if (bubblesRef.current) {
      const halfH = viewport.height / 2;
      for (let i = 0; i < bubbleCount; i++) {
        const { pos, size, phase, riseSpeed, wobbleAmt, reset } = bubbles;

        // Rise
        pos[i * 3 + 1] += riseSpeed[i] * particleSpeed * dt;

        // Horizontal wobble — sinusoidal, like real bubbles
        pos[i * 3] += Math.sin(time * 1.5 + phase[i]) * wobbleAmt[i] * dt;

        // Reset when above viewport
        if (pos[i * 3 + 1] > halfH + 1) {
          reset(i);
        }

        // Slight size pulsation
        const pulse = 1 + Math.sin(time * 2.0 + phase[i]) * 0.1;
        const s = size[i] * pulse;

        dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(s, s, 1);
        dummy.updateMatrix();
        bubblesRef.current.setMatrixAt(i, dummy.matrix);
      }
      bubblesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const quadW = viewport.width;
  const quadH = viewport.height;

  return (
    <>
      {/* Underwater shader quad — fills viewport */}
      <mesh position={[0, 0, -1]}>
        <planeGeometry args={[quadW, quadH]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={vertexShader}
          fragmentShader={waterfallFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.NormalBlending}
        />
      </mesh>

      {/* Rising bubbles */}
      <instancedMesh ref={bubblesRef} args={[undefined, undefined, bubbleCount]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={bubbleTexture}
          transparent
          opacity={0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          color="#d0eaff"
        />
      </instancedMesh>
    </>
  );
};
