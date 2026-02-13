// ─────────────────────────────────────────────────────────
// System Stats Polling — Main Process
// Uses `systeminformation` to collect CPU / Memory / Battery
// and pushes snapshots to the Renderer on a fixed cadence.
// ─────────────────────────────────────────────────────────

import { BrowserWindow } from 'electron';
import * as si from 'systeminformation';
import { IPC_CHANNELS } from '../shared/types';
import type { SystemStatsPayload } from '../shared/types';
import { STATS_POLL_INTERVAL } from '../shared/constants';

let pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Fetch a single snapshot of system metrics.
 *
 * §5-1 (Feedback Loop):
 * Ideally we would subtract the CozyOverlay process's own CPU usage from the
 * total.  `systeminformation` doesn't trivially expose per-PID stats in all
 * OSes, so we accept the minor inaccuracy for v1 and rely on the hard
 * particle cap + FPS throttle to prevent runaway visuals.
 */
export async function getStats(): Promise<SystemStatsPayload> {
  const [cpu, mem, battery] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.battery(),
  ]);

  const payload: SystemStatsPayload = {
    cpuLoad: Math.round(cpu.currentLoad),
    memFree: Math.round((mem.available / mem.total) * 100),
    batteryPercent: battery.hasBattery ? battery.percent : undefined,
  };

  return payload;
}

/** Begin periodic push of stats to the renderer. */
export function startStatsPolling(win: BrowserWindow): void {
  if (pollTimer) return; // idempotent

  pollTimer = setInterval(async () => {
    if (win.isDestroyed()) {
      stopStatsPolling();
      return;
    }
    try {
      const stats = await getStats();
      win.webContents.send(IPC_CHANNELS.SYSTEM_STATS, stats);
    } catch {
      // Swallow — a single failed poll is not fatal
    }
  }, STATS_POLL_INTERVAL);
}

/** Stop polling (called on app exit). */
export function stopStatsPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
