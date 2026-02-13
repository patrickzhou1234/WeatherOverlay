// ─────────────────────────────────────────────────────────
// Preload Script — Exposes a safe subset of Electron APIs
// to the renderer through contextBridge.
// ─────────────────────────────────────────────────────────

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  /** Send fire-and-forget messages to the main process. */
  send: (channel: string, ...args: unknown[]) => {
    const allowed = Object.values(IPC_CHANNELS) as string[];
    if (allowed.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  /** Invoke an async handler on the main process and await the result. */
  invoke: (channel: string, ...args: unknown[]) => {
    const allowed = Object.values(IPC_CHANNELS) as string[];
    if (allowed.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`IPC channel "${channel}" not allowed`));
  },

  /** Subscribe to messages from the main process. Returns an unsubscribe fn. */
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const allowed = Object.values(IPC_CHANNELS) as string[];
    if (!allowed.includes(channel)) return () => {};

    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
