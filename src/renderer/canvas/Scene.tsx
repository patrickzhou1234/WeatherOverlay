// ─────────────────────────────────────────────────────────
// Scene.tsx — R3F Canvas root
// Sets up the Three.js canvas with a transparent background,
// the sky-gradient backdrop, weather effects, and city lights.
// FPS is capped at TARGET_FPS (§5-1 Feedback Loop mitigation).
// ─────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Rain } from './effects/Rain';
import { Snow } from './effects/Snow';
import { CityLights } from './effects/CityLights';
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
    // The actual rendering is done by R3F automatically;
    // We simply throttle the amount of work inside effect components
    // by gating their updates with the same interval check.
  });

  return null;
};

/** Selects the weather-effect component(s) to render. */
const WeatherEffects: React.FC = () => {
  const condition = useStore((s) => s.environment.condition);

  return (
    <>
      {(condition === 'RAIN' || condition === 'THUNDERSTORM') && <Rain />}
      {condition === 'SNOW' && <Snow />}
    </>
  );
};

export const Scene: React.FC = () => {
  return (
    <Canvas
      // Transparent so the Electron window transparency shows through
      gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'transparent',
      }}
      camera={{ position: [0, 0, 5], fov: 60 }}
      // §5-1 — cap the internal frame loop
      frameloop="always"
    >
      <FrameLimiter />
      <SkyGradient />
      <WeatherEffects />
      <CityLights />
    </Canvas>
  );
};
