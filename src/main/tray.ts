// ─────────────────────────────────────────────────────────
// System Tray — Main Process
// §5-6 "Invisible App" Panic fallback.
// Always provides Open Settings / Reset View / Quit so the
// user is never locked out of the application.
// ─────────────────────────────────────────────────────────

import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

let tray: Tray | null = null;

/**
 * Create a system-tray icon with a context menu.
 * The icon uses a tiny inline 16×16 data URI so we don't need an
 * external asset for the MVP.
 */
export function createTray(win: BrowserWindow): void {
  // Create a 16x16 tray icon programmatically (blue circle)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
    'dklEQVQ4y2P4z8BQz0BAwMDAwPD/PwMDIwMDA8P///8ZGJiANAMDwz8GBgZGBkYGRiYm' +
    'JkYmZmZGZhYWRhZWVkZWNjZGNnZ2Rg5OTkYOLi5GLm4eRi4eXkYePn5GHgFBRh4hYUZe' +
    'EVFGXjFxRl5JSSZeKWkmPgAYSBUQYVgIJAAAAABJRU5ErkJggg==',
  );

  tray = new Tray(icon);
  tray.setToolTip('CozyOverlay');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
      click: () => {
        if (win.isDestroyed()) return;
        // First tell the renderer to show the settings UI
        win.webContents.send(IPC_CHANNELS.OPEN_SETTINGS);
        // Make the window interactive and focused
        win.setIgnoreMouseEvents(false);
        win.focus();
        win.show();

        // Safety: if the user can't interact after 8 seconds
        // (e.g. page didn't load), automatically restore click-through
        // so they aren't stuck with an invisible wall.
        setTimeout(() => {
          if (!win.isDestroyed()) {
            // Check with renderer if settings are actually visible
            win.webContents
              .executeJavaScript(
                'document.querySelector("[data-interactive=\\"true\\"]") !== null',
              )
              .then((hasUI: boolean) => {
                if (!hasUI) {
                  console.warn('No interactive UI detected — restoring click-through.');
                  win.setIgnoreMouseEvents(true, { forward: true });
                }
              })
              .catch(() => {
                // Page not loaded — definitely restore
                win.setIgnoreMouseEvents(true, { forward: true });
              });
          }
        }, 8000);
      },
    },
    {
      label: 'Toggle Transparency',
      click: () => {
        if (win.isDestroyed()) return;
        // Read current bg — if fully transparent, make opaque and vice-versa
        const current = win.getBackgroundColor();
        const isTransparent = current === '#00000000';
        win.setBackgroundColor(isTransparent ? '#1a1a2e' : '#00000000');
        // Notify renderer so the store stays in sync
        win.webContents.send(IPC_CHANNELS.SET_OPAQUE, isTransparent);
      },
    },
    {
      label: 'Restore Click-Through',
      click: () => {
        if (!win.isDestroyed()) {
          win.setIgnoreMouseEvents(true, { forward: true });
        }
      },
    },
    {
      label: 'Reset View',
      click: () => {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.RESET_VIEW);
          win.setIgnoreMouseEvents(true, { forward: true });
        }
      },
    },
    {
      label: 'Reload',
      click: () => {
        if (!win.isDestroyed()) {
          win.setIgnoreMouseEvents(true, { forward: true });
          win.webContents.reload();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit CozyOverlay',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}
