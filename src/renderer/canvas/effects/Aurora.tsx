// ─────────────────────────────────────────────────────────
// Aurora.tsx — Shader-based aurora borealis effect.
// A fullscreen quad runs a procedural GLSL shader that
// generates realistic flowing aurora curtains with vertical
// ray structure, green/cyan/purple color bands, soft glow,
// and background stars — all GPU-computed.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { TARGET_FPS } from '../../../shared/constants';
import auroraFrag from '../shaders/aurora.glsl';

/** Minimal vertex shader — passes UV to fragment. */
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const Aurora: React.FC = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null!);

  const particleSpeed = useStore((s) => s.config.particleSpeed);
  const overlayOpacity = useStore((s) => s.config.overlayOpacity);

  const { viewport } = useThree();

  // Shader uniforms
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: 1.0 },
      uOpacity: { value: 0.7 },
    }),
    [],
  );

  const frameInterval = 1 / TARGET_FPS;
  let accum = 0;

  useFrame((_, delta) => {
    accum += delta;
    if (accum < frameInterval) return;
    const dt = accum;
    accum = 0;

    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value += dt;
      shaderRef.current.uniforms.uSpeed.value = particleSpeed;
      shaderRef.current.uniforms.uOpacity.value = Math.min(overlayOpacity, 0.8);
    }
  });

  const quadW = viewport.width;
  const quadH = viewport.height;

  return (
    <mesh position={[0, 0, -1]}>
      <planeGeometry args={[quadW, quadH]} />
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={auroraFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
