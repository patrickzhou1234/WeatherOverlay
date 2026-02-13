// ─────────────────────────────────────────────────────────
// Layout.tsx — Grid structure
// Renders the full-screen 3D canvas with the HUD overlay.
// ─────────────────────────────────────────────────────────

import React from 'react';
import { Scene } from '../canvas/Scene';
import { HUD } from './HUD';

export const Layout: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        // The outer container is transparent — the OS handles the backdrop
        background: 'transparent',
      }}
    >
      {/* Three.js canvas fills the entire viewport */}
      <Scene />

      {/* HTML overlay (settings, error messages) rendered on top */}
      <HUD />
    </div>
  );
};
