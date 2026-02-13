// ─────────────────────────────────────────────────────────
// HUD.tsx — HTML Overlay (Settings panel, error banner)
// Interactive elements carry data-interactive="true" so the
// mouse-passthrough hook knows to capture clicks (§3-A).
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, FormEvent } from 'react';
import { useStore } from '../store/useStore';
import { IPC_CHANNELS } from '../../shared/types';

export const HUD: React.FC = () => {
  const config = useStore((s) => s.config);
  const ui = useStore((s) => s.ui);
  const environment = useStore((s) => s.environment);
  const system = useStore((s) => s.system);
  const setConfig = useStore((s) => s.setConfig);
  const setSettingsVisible = useStore((s) => s.setSettingsVisible);
  const setError = useStore((s) => s.setError);

  // Settings visibility is now driven by the store (synced with tray IPC)
  const settingsOpen = ui.settingsVisible;

  const [localZip, setLocalZip] = useState(config.zipCode ?? '');

  // ── Sync interactive state with main process on mount ──
  // If the store already has settings visible (e.g. first launch, no ZIP)
  // we must tell the main process to make the window clickable immediately.
  // Also sync the persisted opaqueBackground state.
  useEffect(() => {
    if (useStore.getState().ui.settingsVisible) {
      window.electronAPI?.send(IPC_CHANNELS.SET_INTERACTIVE, true);
    }
    if (useStore.getState().config.opaqueBackground) {
      window.electronAPI?.send(IPC_CHANNELS.SET_OPAQUE, true);
    }
  }, []);

  // ── Toggle settings panel ────────────────────────────
  const toggleSettings = useCallback(() => {
    const next = !settingsOpen;
    setSettingsVisible(next);
    // Inform main process so it can toggle click-through
    window.electronAPI?.send(IPC_CHANNELS.SET_INTERACTIVE, next);
  }, [settingsOpen, setSettingsVisible]);

  // ── Save config ──────────────────────────────────────
  const handleSave = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!localZip.trim()) {
        setError('A US ZIP code is required.');
        return;
      }
      setConfig({ zipCode: localZip.trim() });
      setError(null);
      toggleSettings();
    },
    [localZip, setConfig, setError, toggleSettings],
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none', // let clicks fall through by default
        fontFamily: "'Courier New', monospace",
        color: '#e0e0e0',
        zIndex: 10,
      }}
    >
      {/* ── Gear toggle button (always visible, bottom-right) ── */}
      <button
        data-interactive="true"
        onClick={toggleSettings}
        title="Settings"
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'rgba(0,0,0,0.45)',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
      >
        ⚙
      </button>

      {/* ── Mini status bar (top-left) ── */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 16,
          fontSize: 11,
          opacity: 0.7 * (config.overlayOpacity ?? 1),
          letterSpacing: 1,
        }}
      >
        {environment.condition} · {environment.timeOfDay} ·{' '}
        {Math.round(environment.temperature)}°C · 💨{' '}
        {environment.windSpeed.toFixed(1)} m/s
        <br />
        CPU {system.cpuLoad}% · MEM {system.memoryUsage}%
        {system.isBatteryLow && (
          <span style={{ color: '#ff6b6b' }}> · 🔋 LOW</span>
        )}
      </div>

      {/* ── Error banner ── */}
      {ui.isError && ui.errorMessage && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 16,
            right: 16,
            padding: '8px 12px',
            background: 'rgba(255,60,60,0.75)',
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          ⚠ {ui.errorMessage}
        </div>
      )}

      {/* ── Settings panel ── */}
      {settingsOpen && (
        <form
          onSubmit={handleSave}
          data-interactive="true"
          style={{
            pointerEvents: 'auto',
            position: 'absolute',
            bottom: 80,
            right: 24,
            width: 280,
            padding: 16,
            background: 'rgba(20,20,30,0.88)',
            borderRadius: 10,
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <label style={{ fontSize: 11, opacity: 0.7 }}>
            US ZIP Code
            <input
              data-interactive="true"
              type="text"
              value={localZip}
              onChange={(e) => setLocalZip(e.target.value)}
              placeholder="e.g. 90210"
              style={inputStyle}
            />
          </label>

          <label style={{ fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              data-interactive="true"
              type="checkbox"
              checked={config.highPerformanceMode}
              onChange={(e) =>
                setConfig({ highPerformanceMode: e.target.checked })
              }
            />
            High-Performance Mode (more particles)
          </label>

          <label style={{ fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              data-interactive="true"
              type="checkbox"
              checked={config.opaqueBackground}
              onChange={(e) => {
                setConfig({ opaqueBackground: e.target.checked });
                window.electronAPI?.send(IPC_CHANNELS.SET_OPAQUE, e.target.checked);
              }}
            />
            Opaque Background (disable transparency)
          </label>

          <label style={{ fontSize: 11, opacity: 0.7 }}>
            Overlay Opacity: {Math.round((config.overlayOpacity ?? 1) * 100)}%
            <input
              data-interactive="true"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={config.overlayOpacity ?? 1}
              onChange={(e) =>
                setConfig({ overlayOpacity: parseFloat(e.target.value) })
              }
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                accentColor: 'rgba(80,140,255,0.85)',
                cursor: 'pointer',
              }}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              data-interactive="true"
              type="submit"
              style={btnStyle}
            >
              Save
            </button>
            <button
              data-interactive="true"
              type="button"
              onClick={toggleSettings}
              style={{ ...btnStyle, background: 'rgba(255,255,255,0.08)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ── Inline style helpers ──────────────────────────────

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  padding: '6px 8px',
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e0e0e0',
  fontFamily: "'Courier New', monospace",
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  flex: 1,
  padding: '7px 0',
  borderRadius: 5,
  border: 'none',
  background: 'rgba(80,140,255,0.55)',
  color: '#fff',
  fontFamily: "'Courier New', monospace",
  fontSize: 12,
  cursor: 'pointer',
};
