// ─────────────────────────────────────────────────────────
// SkyGradient.tsx — Full-screen quad with a custom shader
// that produces a smooth time-of-day gradient.
// Uses the skyGradient.glsl fragment shader.
// ─────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import skyFragmentShader from '../shaders/skyGradient.glsl';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const SkyGradient: React.FC = () => {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const timeOfDay = useStore((s) => s.environment.timeOfDay);
  const condition = useStore((s) => s.environment.condition);

  // Map time-of-day to a 0-1 range the shader can lerp
  const timeValue = useMemo(() => {
    switch (timeOfDay) {
      case 'DAWN': return 0.2;
      case 'DAY': return 0.5;
      case 'DUSK': return 0.75;
      case 'NIGHT': return 1.0;
      default: return 0.5;
    }
  }, [timeOfDay]);

  // Weather tints the sky (overcast → desaturate, fog → whitish)
  const weatherTint = useMemo(() => {
    switch (condition) {
      case 'CLOUDY':
      case 'FOG': return 0.6;
      case 'RAIN':
      case 'THUNDERSTORM': return 0.8;
      default: return 0.0;
    }
  }, [condition]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTimeOfDay: { value: timeValue },
      uWeatherTint: { value: weatherTint },
    }),
    [], // create once; we update values in useFrame
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += delta;
    matRef.current.uniforms.uTimeOfDay.value = timeValue;
    matRef.current.uniforms.uWeatherTint.value = weatherTint;
  });

  return (
    <mesh renderOrder={-1}>
      {/* Full-screen quad in NDC ([-1,1]) */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={skyFragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        transparent
      />
    </mesh>
  );
};
