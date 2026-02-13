// ─────────────────────────────────────────────────────────
// HUD.tsx — Glassmorphism overlay UI
// Modern, clean settings panel + minimal status chips.
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, FormEvent } from 'react';
import { useStore } from '../store/useStore';
import { IPC_CHANNELS } from '../../shared/types';

// ── Shared style tokens ───────────────────────────────

const FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
const GLASS = {
  background: 'rgba(12, 12, 20, 0.72)',
  backdropFilter: 'blur(20px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
  border: '1px solid rgba(255,255,255,0.08)',
} as React.CSSProperties;

const ACCENT = '#6b8afd';
const MUTED = 'rgba(255,255,255,0.45)';

/** Weather condition → emoji + label map */
const CONDITION_LABELS: Record<string, string> = {
  CLEAR: '☀ Clear',
  CLOUDY: '☁ Cloudy',
  RAIN: '🌧 Rain',
  THUNDERSTORM: '⛈ Storm',
  SNOW: '❄ Snow',
  FOG: '🌫 Fog',
};

export const HUD: React.FC = () => {
  const config = useStore((s) => s.config);
  const ui = useStore((s) => s.ui);
  const environment = useStore((s) => s.environment);
  const system = useStore((s) => s.system);
  const setConfig = useStore((s) => s.setConfig);
  const setSettingsVisible = useStore((s) => s.setSettingsVisible);
  const setError = useStore((s) => s.setError);

  const settingsOpen = ui.settingsVisible;
  const [localZip, setLocalZip] = useState(config.zipCode ?? '');

  // ── Sync interactive state on mount ──
  useEffect(() => {
    if (useStore.getState().ui.settingsVisible) {
      window.electronAPI?.send(IPC_CHANNELS.SET_INTERACTIVE, true);
    }
    if (useStore.getState().config.opaqueBackground) {
      window.electronAPI?.send(IPC_CHANNELS.SET_OPAQUE, true);
    }
  }, []);

  const toggleSettings = useCallback(() => {
    const next = !settingsOpen;
    setSettingsVisible(next);
    window.electronAPI?.send(IPC_CHANNELS.SET_INTERACTIVE, next);
  }, [settingsOpen, setSettingsVisible]);

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

  const overlayAlpha = config.overlayOpacity ?? 1;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        fontFamily: FONT,
        color: '#e8eaed',
        zIndex: 10,
      }}
    >
      {/* ── Settings gear (bottom-right) ── */}
      <button
        data-interactive="true"
        onClick={toggleSettings}
        title="Settings"
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.1)',
          ...GLASS,
          color: 'rgba(255,255,255,0.7)',
          fontSize: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        ⚙
      </button>

      {/* ── Status chips (bottom-left) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          display: 'flex',
          gap: 6,
          opacity: overlayAlpha * 0.85,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Weather chip */}
        <div style={chipStyle}>
          {CONDITION_LABELS[environment.condition] ?? environment.condition}
          {' · '}
          {Math.round(environment.temperature)}°
        </div>

        {/* Wind chip */}
        <div style={chipStyle}>
          💨 {environment.windSpeed.toFixed(1)} m/s
        </div>

        {/* System chip */}
        <div style={chipStyle}>
          CPU {system.cpuLoad}%
          {' · '}
          MEM {system.memoryUsage}%
        </div>

        {system.isBatteryLow && (
          <div style={{ ...chipStyle, borderColor: 'rgba(255,100,100,0.3)', color: '#ff8a8a' }}>
            🔋 Low
          </div>
        )}
      </div>

      {/* ── Error banner ── */}
      {ui.isError && ui.errorMessage && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            padding: '10px 14px',
            ...GLASS,
            background: 'rgba(200,40,40,0.65)',
            borderRadius: 10,
            borderColor: 'rgba(255,100,100,0.2)',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 0.2,
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
            bottom: 64,
            right: 20,
            width: 300,
            padding: 20,
            ...GLASS,
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Title */}
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5, color: 'rgba(255,255,255,0.9)' }}>
            Settings
          </div>

          {/* Divider */}
          <div style={dividerStyle} />

          {/* ZIP Code */}
          <div style={fieldWrap}>
            <span style={labelStyle}>Location (US ZIP)</span>
            <input
              data-interactive="true"
              type="text"
              value={localZip}
              onChange={(e) => setLocalZip(e.target.value)}
              placeholder="e.g. 90210"
              style={inputStyle}
            />
          </div>

          {/* Weather override */}
          <div style={fieldWrap}>
            <span style={labelStyle}>Weather</span>
            <select
              data-interactive="true"
              value={config.weatherOverride ?? ''}
              onChange={(e) =>
                setConfig({
                  weatherOverride: e.target.value === '' ? null : (e.target.value as any),
                })
              }
              style={inputStyle}
            >
              <option value="">Auto (live)</option>
              <option value="CLEAR">☀ Clear</option>
              <option value="CLOUDY">☁ Cloudy</option>
              <option value="RAIN">🌧 Rain</option>
              <option value="THUNDERSTORM">⛈ Thunderstorm</option>
              <option value="SNOW">❄ Snow</option>
              <option value="FOG">🌫 Fog</option>
            </select>
          </div>

          {/* Opacity slider */}
          <div style={fieldWrap}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={labelStyle}>Opacity</span>
              <span style={{ ...labelStyle, fontVariantNumeric: 'tabular-nums' }}>
                {Math.round((config.overlayOpacity ?? 1) * 100)}%
              </span>
            </div>
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
              style={sliderStyle}
            />
          </div>

          <div style={dividerStyle} />

          {/* Toggles */}
          <label style={toggleRowStyle}>
            <input
              data-interactive="true"
              type="checkbox"
              checked={config.highPerformanceMode}
              onChange={(e) => setConfig({ highPerformanceMode: e.target.checked })}
              style={checkboxStyle}
            />
            <span>High quality particles</span>
          </label>

          <label style={toggleRowStyle}>
            <input
              data-interactive="true"
              type="checkbox"
              checked={config.opaqueBackground}
              onChange={(e) => {
                setConfig({ opaqueBackground: e.target.checked });
                window.electronAPI?.send(IPC_CHANNELS.SET_OPAQUE, e.target.checked);
              }}
              style={checkboxStyle}
            />
            <span>Opaque background</span>
          </label>

          <div style={dividerStyle} />

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button data-interactive="true" type="submit" style={primaryBtnStyle}>
              Save
            </button>
            <button
              data-interactive="true"
              type="button"
              onClick={toggleSettings}
              style={ghostBtnStyle}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ── Style constants ───────────────────────────────────

const chipStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 8,
  background: 'rgba(12, 12, 20, 0.55)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.06)',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: 0.3,
  color: 'rgba(255,255,255,0.7)',
  whiteSpace: 'nowrap',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.06)',
  margin: '0 -4px',
};

const fieldWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: MUTED,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e8eaed',
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 400,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  accentColor: ACCENT,
  cursor: 'pointer',
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  fontWeight: 400,
  color: 'rgba(255,255,255,0.75)',
  cursor: 'pointer',
};

const checkboxStyle: React.CSSProperties = {
  accentColor: ACCENT,
  width: 14,
  height: 14,
  cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 0',
  borderRadius: 8,
  border: 'none',
  background: ACCENT,
  color: '#fff',
  fontFamily: FONT,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.3,
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
};

const ghostBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 0',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.6)',
  fontFamily: FONT,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: 0.3,
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
};
