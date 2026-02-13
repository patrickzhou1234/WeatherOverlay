// ─────────────────────────────────────────────────────────
// Main Process — Entry Point
// Creates a frameless, transparent, always-on-top window
// constrained to the primary display.
// ─────────────────────────────────────────────────────────

import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipcHandlers';
import { startStatsPolling, stopStatsPolling } from './systemStats';
import { createTray } from './tray';

let mainWindow: BrowserWindow | null = null;

/**
 * Edge-case §5 (OS-Specific Transparency):
 * On certain Windows GPU drivers a transparent window produces a black
 * artifact border.  We disable HW acceleration when the `--disable-gpu`
 * flag is present so the user has an escape hatch.
 */
if (process.argv.includes('--disable-gpu')) {
  app.disableHardwareAcceleration();
}

const isDev = !app.isPackaged;
const DEV_SERVER_URL = 'http://localhost:9000';

/**
 * In dev mode the webpack-dev-server may not be ready when Electron
 * launches (race condition).  We retry loading until it responds.
 */
function loadRendererWithRetry(
  win: BrowserWindow,
  url: string,
  retries = 30,
  delayMs = 1000,
): void {
  win.loadURL(url).catch(() => {
    if (retries > 0 && !win.isDestroyed()) {
      setTimeout(() => loadRendererWithRetry(win, url, retries - 1, delayMs), delayMs);
    } else {
      console.error('Failed to connect to dev server after multiple retries.');
    }
  });
}

function createWindow(): void {
  // §5-5 — Constrain to primaryDisplay to avoid multi-monitor perf issues
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // §3-A — Default state: click-through with forwarded events
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Load the renderer
  if (isDev) {
    loadRendererWithRetry(mainWindow, DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  // Reload on load failure (network error, etc.)
  mainWindow.webContents.on('did-fail-load', (_event, _code, description) => {
    console.warn(`Page failed to load: ${description}. Retrying…`);
    if (isDev && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => loadRendererWithRetry(mainWindow!, DEV_SERVER_URL), 1500);
    }
  });

  // Wire up IPC channels
  registerIpcHandlers(mainWindow);

  // Start polling system stats → pushes to renderer
  startStatsPolling(mainWindow);

  // §5-6 — System tray as fallback control
  createTray(mainWindow);

  // Apply persisted opaqueBackground once renderer has loaded its localStorage
  // by listening for the renderer to send the state via IPC.
  // The renderer will fire SET_OPAQUE if the user previously enabled it.

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Lifecycle ─────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopStatsPolling();
  app.quit();
});

app.on('activate', () => {
  // macOS dock re-open behaviour
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
