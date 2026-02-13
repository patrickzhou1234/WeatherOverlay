// ─────────────────────────────────────────────────────────
// Scene.tsx — R3F Canvas root
// Sets up the Three.js canvas with a transparent background,
// the sky-gradient backdrop, and weather effects.
// FPS is capped at TARGET_FPS (§5-1 Feedback Loop mitigation).
// ─────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Rain } from './effects/Rain';
import { Snow } from './effects/Snow';
import { Clouds } from './effects/Clouds';
import { SkyGradient } from './effects/SkyGradient';
import { useStore } from '../store/useStore';
import { TARGET_FPS } from '../../shared/constants';

/** An in-scene component that caps the render loop to TARGET_FPS. */
const FrameLimiter: React.FC = () => {
  const { clock } = useThree();
  const interval = 1 / TARGET_FPS;
  let elapsed = 0;

  useFrame((_, delta) => {
    elapsed += delta;
    if (elapsed < interval) return;
    elapsed = 0;
  });

  return null;
};

/** Selects the weather-effect component(s) to render. */
const WeatherEffects: React.FC = () => {
  const condition = useStore((s) => s.environment.condition);

  if (condition === 'CLEAR') return null;

  return (
    <>
      {(condition === 'RAIN' || condition === 'THUNDERSTORM') && <Rain />}
      {condition === 'SNOW' && <Snow />}
      {(condition === 'CLOUDY' || condition === 'FOG') && <Clouds />}
    </>
  );
};

export const Scene: React.FC = () => {
  const overlayOpacity = useStore((s) => s.config.overlayOpacity);
  const condition = useStore((s) => s.environment.condition);

  const isClear = condition === 'CLEAR';

  return (
    <Canvas
      gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'transparent',
        opacity: overlayOpacity,
      }}
      camera={{ position: [0, 0, 5], fov: 60 }}
      frameloop="always"
    >
      <FrameLimiter />
      {!isClear && <SkyGradient />}
      <WeatherEffects />
    </Canvas>
  );
};
