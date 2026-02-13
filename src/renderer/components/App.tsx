// ─────────────────────────────────────────────────────────
// App.tsx — Root component
// Boots hooks, wires tray IPC, and renders Layout.
// ─────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { Layout } from './Layout';
import { useWeather } from '../hooks/useWeather';
import { useSystemStats } from '../hooks/useSystemStats';
import { useMousePassthrough } from '../hooks/useMousePassthrough';
import { useStore } from '../store/useStore';
import { IPC_CHANNELS } from '../../shared/types';

export const App: React.FC = () => {
  // Boot global side-effect hooks
  useWeather();
  useSystemStats();
  useMousePassthrough();

  const setSettingsVisible = useStore((s) => s.setSettingsVisible);
  const setConfig = useStore((s) => s.setConfig);
  const resetView = useStore((s) => s.resetView);

  // §5-6 — Listen for tray menu actions forwarded from main process
  useEffect(() => {
    if (!window.electronAPI) return;

    const offSettings = window.electronAPI.on(
      IPC_CHANNELS.OPEN_SETTINGS,
      () => setSettingsVisible(true),
    );
    const offReset = window.electronAPI.on(
      IPC_CHANNELS.RESET_VIEW,
      () => resetView(),
    );
    // Keep store in sync when tray toggles transparency
    const offOpaque = window.electronAPI.on(
      IPC_CHANNELS.SET_OPAQUE,
      (opaque: unknown) => setConfig({ opaqueBackground: !!opaque }),
    );

    return () => {
      offSettings();
      offReset();
      offOpaque();
    };
  }, [setSettingsVisible, setConfig, resetView]);

  return <Layout />;
};
