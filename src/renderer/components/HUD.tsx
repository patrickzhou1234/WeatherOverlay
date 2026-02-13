// ─────────────────────────────────────────────────────────
// HUD.tsx — Material Design 3 overlay UI
// Gradient accents, elevated surfaces, clean typography.
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, FormEvent } from 'react';
import { useStore } from '../store/useStore';
import { IPC_CHANNELS } from '../../shared/types';

// ── Design tokens (Material Design 3 inspired) ───────

const FONT = "'Inter', 'Roboto', 'Segoe UI', system-ui, sans-serif";

/** Primary gradient used on buttons, slider track, accents */
const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

/** Surface elevations — Material 3 tonal surfaces */
const SURFACE = {
  1: 'rgba(15, 15, 25, 0.78)',
  2: 'rgba(22, 22, 38, 0.82)',
  3: 'rgba(30, 30, 48, 0.85)',
} as const;

const BLUR = 'blur(24px) saturate(1.6)';

/** Material 3 elevation shadows */
const ELEVATION = {
  1: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.24)',
  2: '0 3px 6px rgba(0,0,0,0.32), 0 3px 6px rgba(0,0,0,0.23)',
  3: '0 10px 20px rgba(0,0,0,0.35), 0 6px 6px rgba(0,0,0,0.23)',
  4: '0 14px 28px rgba(0,0,0,0.4), 0 10px 10px rgba(0,0,0,0.22)',
} as const;

const ON_SURFACE = 'rgba(255,255,255,0.92)';
const ON_SURFACE_MED = 'rgba(255,255,255,0.6)';
const ON_SURFACE_LOW = 'rgba(255,255,255,0.38)';
const OUTLINE = 'rgba(255,255,255,0.06)';

/** Convert Celsius to Fahrenheit or display as-is, with unit symbol. */
function displayTemp(tempC: number, unit: 'C' | 'F'): string {
  if (unit === 'F') {
    return `${Math.round(tempC * 9 / 5 + 32)}°F`;
  }
  return `${Math.round(tempC)}°C`;
}

/** Weather condition → Material icon + label + accent color */
const WEATHER_INFO: Record<string, { icon: string; label: string; color: string }> = {
  CLEAR:        { icon: 'wb_sunny',      label: 'Clear',        color: '#FFD54F' },
  CLOUDY:       { icon: 'cloud',         label: 'Cloudy',       color: '#90A4AE' },
  RAIN:         { icon: 'water_drop',    label: 'Rain',         color: '#4FC3F7' },
  THUNDERSTORM: { icon: 'thunderstorm',  label: 'Thunderstorm', color: '#CE93D8' },
  SNOW:         { icon: 'ac_unit',       label: 'Snow',         color: '#E0E0E0' },
  FOG:          { icon: 'foggy',         label: 'Fog',          color: '#78909C' },
};

// ── Material Icon helper ─────────────────────────────

const MIcon: React.FC<{
  name: string;
  size?: number;
  color?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}> = ({ name, size = 20, color, filled = true, style }) => (
  <span
    className="material-symbols-rounded"
    style={{
      fontSize: size,
      color,
      fontVariationSettings: filled ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400",
      lineHeight: 1,
      userSelect: 'none',
      ...style,
    }}
  >
    {name}
  </span>
);

// ── Toggle Switch ────────────────────────────────────

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <div
    data-interactive="true"
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    style={{
      width: 44,
      height: 24,
      borderRadius: 12,
      background: checked ? GRADIENT : 'rgba(255,255,255,0.12)',
      padding: 2,
      cursor: 'pointer',
      transition: 'background 0.25s ease',
      flexShrink: 0,
      position: 'relative',
    }}
  >
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  </div>
);

// ── Main HUD Component ──────────────────────────────

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
  const weather = WEATHER_INFO[environment.condition] ?? WEATHER_INFO.CLEAR;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        fontFamily: FONT,
        color: ON_SURFACE,
        zIndex: 10,
      }}
    >
      {/* ── FAB — Settings toggle (bottom-right) ── */}
      <button
        data-interactive="true"
        onClick={toggleSettings}
        title="Settings"
        className="md-fab"
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: 14,
          border: 'none',
          background: GRADIENT,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: ELEVATION[3],
          transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s ease',
        }}
      >
        <MIcon name={settingsOpen ? 'close' : 'settings'} size={22} />
      </button>

      {/* ── Status Card (bottom-left) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          opacity: overlayAlpha,
          transition: 'opacity 0.3s ease',
        }}
      >
        <div
          className="md-status-card"
          style={{
            background: SURFACE[2],
            backdropFilter: BLUR,
            WebkitBackdropFilter: BLUR,
            borderRadius: 16,
            boxShadow: ELEVATION[2],
            border: `1px solid ${OUTLINE}`,
            overflow: 'hidden',
          }}
        >
          {/* Gradient top accent strip */}
          <div style={{ height: 2, background: GRADIENT }} />

          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* City + condition row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: `linear-gradient(135deg, ${weather.color}28 0%, ${weather.color}0a 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `1px solid ${weather.color}18`,
                }}
              >
                <MIcon name={weather.icon} size={20} color={weather.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {environment.cityName && (
                  <span style={{ fontSize: 14, fontWeight: 600, color: ON_SURFACE, letterSpacing: -0.1 }}>
                    {environment.cityName}
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 500, color: ON_SURFACE_MED, letterSpacing: 0.2 }}>
                  {weather.label} · {displayTemp(environment.temperature, config.temperatureUnit)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: OUTLINE }} />

            {/* System stats row */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <StatPill icon="memory" label="CPU" value={`${system.cpuLoad}%`} />
              <StatPill icon="storage" label="MEM" value={`${system.memoryUsage}%`} />
              <StatPill icon="air" label="Wind" value={`${environment.windSpeed.toFixed(1)}`} />
              {system.isBatteryLow && (
                <span style={{ fontSize: 11, color: '#ef5350', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MIcon name="battery_alert" size={14} color="#ef5350" />
                  Low
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error snackbar ── */}
      {ui.isError && ui.errorMessage && (
        <div
          className="md-snackbar"
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 20px',
            background: SURFACE[3],
            backdropFilter: BLUR,
            WebkitBackdropFilter: BLUR,
            borderRadius: 12,
            boxShadow: ELEVATION[3],
            border: '1px solid rgba(239,83,80,0.2)',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: 480,
          }}
        >
          <MIcon name="error" size={18} color="#ef5350" />
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>{ui.errorMessage}</span>
        </div>
      )}

      {/* ── Settings panel ── */}
      {settingsOpen && (
        <form
          onSubmit={handleSave}
          data-interactive="true"
          className="md-settings"
          style={{
            pointerEvents: 'auto',
            position: 'absolute',
            bottom: 84,
            right: 24,
            width: 320,
            background: SURFACE[2],
            backdropFilter: BLUR,
            WebkitBackdropFilter: BLUR,
            borderRadius: 20,
            boxShadow: ELEVATION[4],
            border: `1px solid ${OUTLINE}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Gradient accent bar at top */}
          <div style={{ height: 3, background: GRADIENT }} />

          {/* Header */}
          <div style={{ padding: '18px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <MIcon name="tune" size={20} color="#667eea" />
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2, color: ON_SURFACE }}>
                Settings
              </span>
            </div>
            <span style={{ fontSize: 11, color: ON_SURFACE_LOW, letterSpacing: 0.2 }}>
              Customize your weather overlay
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Location ── */}
            <FieldGroup label="Location" icon="location_on">
              <input
                data-interactive="true"
                type="text"
                value={localZip}
                onChange={(e) => setLocalZip(e.target.value)}
                placeholder="US ZIP code"
                className="md-input"
                style={inputStyle}
              />
            </FieldGroup>

            {/* ── Weather override ── */}
            <FieldGroup label="Weather" icon="cloud">
              <select
                data-interactive="true"
                value={config.weatherOverride ?? ''}
                onChange={(e) =>
                  setConfig({
                    weatherOverride: e.target.value === '' ? null : (e.target.value as any),
                  })
                }
                className="md-select"
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
            </FieldGroup>

            {/* ── Custom visual effect ── */}
            <FieldGroup label="Custom Effect" icon="auto_fix_high">
              <select
                data-interactive="true"
                value={config.customEffect ?? ''}
                onChange={(e) =>
                  setConfig({
                    customEffect: e.target.value === '' ? null : (e.target.value as any),
                  })
                }
                className="md-select"
                style={inputStyle}
              >
                <option value="">None</option>
                <option value="SAKURA">🌸 Sakura Petals</option>
                <option value="HYDRO_BLAST">💦 Hydro Blast</option>
                <option value="TECHNO_TUNNEL">🔮 Techno Tunnel</option>
                <option value="FIREFLIES">✨ Fireflies</option>
                <option value="AURORA">🌌 Aurora Borealis</option>
              </select>
            </FieldGroup>

            {/* ── Opacity ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MIcon name="opacity" size={15} color={ON_SURFACE_MED} />
                  <span style={labelTextStyle}>Opacity</span>
                </div>
                <span className="md-badge">
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
                className="md-slider"
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* ── Particle Speed ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MIcon name="speed" size={15} color={ON_SURFACE_MED} />
                  <span style={labelTextStyle}>Particle Speed</span>
                </div>
                <span className="md-badge">
                  {Math.round((config.particleSpeed ?? 1) * 100)}%
                </span>
              </div>
              <input
                data-interactive="true"
                type="range"
                min={0.1}
                max={2}
                step={0.05}
                value={config.particleSpeed ?? 1}
                onChange={(e) =>
                  setConfig({ particleSpeed: parseFloat(e.target.value) })
                }
                className="md-slider"
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: OUTLINE }} />

            {/* ── Toggles ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ToggleRow
                icon="thermostat"
                label="Fahrenheit"
                checked={config.temperatureUnit === 'F'}
                onChange={(v) => setConfig({ temperatureUnit: v ? 'F' : 'C' })}
              />
              <ToggleRow
                icon="auto_awesome"
                label="High quality particles"
                checked={config.highPerformanceMode}
                onChange={(v) => setConfig({ highPerformanceMode: v })}
              />
              <ToggleRow
                icon="format_paint"
                label="Opaque background"
                checked={config.opaqueBackground}
                onChange={(v) => {
                  setConfig({ opaqueBackground: v });
                  window.electronAPI?.send(IPC_CHANNELS.SET_OPAQUE, v);
                }}
              />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: OUTLINE }} />

            {/* ── Action buttons ── */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                data-interactive="true"
                type="submit"
                className="md-btn-primary"
                style={primaryBtnStyle}
              >
                Save
              </button>
              <button
                data-interactive="true"
                type="button"
                onClick={toggleSettings}
                className="md-btn-ghost"
                style={ghostBtnStyle}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────

/** Tiny stat readout used in the status card */
const StatPill: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <MIcon name={icon} size={13} color={ON_SURFACE_LOW} filled={false} />
    <span style={{ fontSize: 11, color: ON_SURFACE_LOW, fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 11, color: ON_SURFACE_MED, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

/** Field label + icon row wrapping an input/select */
const FieldGroup: React.FC<{
  label: string;
  icon: string;
  children: React.ReactNode;
}> = ({ label, icon, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <MIcon name={icon} size={15} color={ON_SURFACE_MED} />
      <span style={labelTextStyle}>{label}</span>
    </div>
    {children}
  </div>
);

/** Toggle with icon, label, and Material switch */
const ToggleRow: React.FC<{
  icon: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ icon, label, checked, onChange }) => (
  <div
    data-interactive="true"
    onClick={() => onChange(!checked)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
    }}
  >
    <MIcon name={icon} size={17} color={checked ? '#667eea' : ON_SURFACE_LOW} filled={checked} />
    <span style={{ fontSize: 13, fontWeight: 400, color: ON_SURFACE_MED, flex: 1 }}>{label}</span>
    <ToggleSwitch checked={checked} onChange={onChange} />
  </div>
);

// ── Style constants ───────────────────────────────────

const labelTextStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: ON_SURFACE_MED,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.05)',
  color: ON_SURFACE,
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 400,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 0',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  fontFamily: "'Inter', 'Roboto', 'Segoe UI', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.3,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(102,126,234,0.35)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const ghostBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 0',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.6)',
  fontFamily: "'Inter', 'Roboto', 'Segoe UI', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: 0.3,
  cursor: 'pointer',
  transition: 'background 0.15s ease, color 0.15s ease',
};
