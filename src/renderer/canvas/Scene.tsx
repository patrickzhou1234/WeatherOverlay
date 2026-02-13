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
import { Sunshine } from './effects/Sunshine';
import { SakuraPetals } from './effects/SakuraPetals';
import { HydroBlast } from './effects/HydroBlast';
import { TechnoTunnel } from './effects/TechnoTunnel';
import { Fireflies } from './effects/Fireflies';
import { Aurora } from './effects/Aurora';
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

  return (
    <>
      {condition === 'CLEAR' && <Sunshine />}
      {(condition === 'RAIN' || condition === 'THUNDERSTORM') && <Rain />}
      {condition === 'SNOW' && <Snow />}
      {(condition === 'CLOUDY' || condition === 'FOG') && <Clouds />}
    </>
  );
};

/** Renders the selected custom visual effect (layered alongside weather). */
const CustomEffects: React.FC = () => {
  const customEffect = useStore((s) => s.config.customEffect);

  if (!customEffect) return null;

  return (
    <>
      {customEffect === 'SAKURA' && <SakuraPetals />}
      {customEffect === 'HYDRO_BLAST' && <HydroBlast />}
      {customEffect === 'TECHNO_TUNNEL' && <TechnoTunnel />}
      {customEffect === 'FIREFLIES' && <Fireflies />}
      {customEffect === 'AURORA' && <Aurora />}
    </>
  );
};

export const Scene: React.FC = () => {
  const overlayOpacity = useStore((s) => s.config.overlayOpacity);

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
      <WeatherEffects />
      <CustomEffects />
    </Canvas>
  );
};
