// ─────────────────────────────────────────────────────────
// IPC Handlers — Main Process
// Bridges renderer ↔ OS-level APIs
// ─────────────────────────────────────────────────────────

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type { IgnoreMousePayload } from '../shared/types';
import { getStats } from './systemStats';

/**
 * Register all IPC listeners/handlers for the given window.
 *
 * §3-A Click-Through state machine:
 *   • SET_IGNORE_MOUSE toggles setIgnoreMouseEvents
 *   • SET_INTERACTIVE is a high-level toggle (settings open/close)
 */
export function registerIpcHandlers(win: BrowserWindow): void {
  // ── Click-through toggle ──────────────────────────────
  ipcMain.on(
    IPC_CHANNELS.SET_IGNORE_MOUSE,
    (_event, payload: IgnoreMousePayload) => {
      if (win.isDestroyed()) return;

      if (payload.ignore) {
        // Return to pass-through — forward events so renderer can still
        // detect hover over interactive zones (§3-A).
        win.setIgnoreMouseEvents(true, { forward: payload.forward });
      } else {
        win.setIgnoreMouseEvents(false);
      }
    },
  );

  // ── High-level interactive mode (settings panel) ──────
  ipcMain.on(
    IPC_CHANNELS.SET_INTERACTIVE,
    (_event, active: boolean) => {
      if (win.isDestroyed()) return;

      if (active) {
        win.setIgnoreMouseEvents(false);
        win.focus();
      } else {
        win.setIgnoreMouseEvents(true, { forward: true });
        win.blur();
      }
    },
  );

  // ── On-demand system stats (invoke/handle pattern) ────
  ipcMain.handle(IPC_CHANNELS.GET_SYSTEM_STATS, async () => {
    return getStats();
  });

  // ── Transparency toggle ───────────────────────────────
  ipcMain.on(
    IPC_CHANNELS.SET_OPAQUE,
    (_event, opaque: boolean) => {
      if (win.isDestroyed()) return;
      win.setBackgroundColor(opaque ? '#1a1a2e' : '#00000000');
    },
  );
}
