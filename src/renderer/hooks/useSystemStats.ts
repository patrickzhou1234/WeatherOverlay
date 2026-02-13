// ─────────────────────────────────────────────────────────
// useSystemStats — Subscribes to the IPC 'system:stats'
// push channel from the main process and updates the store.
// ─────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { SystemStatsPayload } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/types';

/** Global type augmentation for the preload-exposed API. */
declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, ...args: unknown[]) => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (
        channel: string,
        callback: (...args: unknown[]) => void,
      ) => () => void;
    };
  }
}

/**
 * Hook that listens to periodic system-stat pushes from the main process
 * and writes them into the Zustand store.
 */
export function useSystemStats(): void {
  const updateSystem = useStore((s) => s.updateSystem);

  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubscribe = window.electronAPI.on(
      IPC_CHANNELS.SYSTEM_STATS,
      (...args: unknown[]) => {
        const stats = args[0] as SystemStatsPayload;
        updateSystem(
          stats.cpuLoad,
          stats.memFree,
          stats.batteryPercent,
        );
      },
    );

    return unsubscribe;
  }, [updateSystem]);
}
