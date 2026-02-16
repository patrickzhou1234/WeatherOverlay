// ─────────────────────────────────────────────────────────
// HUD.tsx — Overlay UI built with Material UI
// Glassmorphism cards, MUI inputs/sliders/switches/FAB.
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, FormEvent } from 'react';
import { useStore } from '../store/useStore';
import { IPC_CHANNELS } from '../../shared/types';

// ── MUI Components ───────────────────────────────────
import {
  Box,
  Card,
  CardContent,
  Typography,
  Fab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Switch,
  Button,
  Divider,
  Chip,
  Snackbar,
  Alert,
  Stack,
  Tooltip,
  Slide,
  Fade,
  alpha,
} from '@mui/material';

// ── MUI Icons ────────────────────────────────────────
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloudIcon from '@mui/icons-material/Cloud';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import OpacityIcon from '@mui/icons-material/Opacity';
import SpeedIcon from '@mui/icons-material/Speed';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import FoggyIcon from '@mui/icons-material/Foggy';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import AirIcon from '@mui/icons-material/Air';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import SaveIcon from '@mui/icons-material/Save';

// ── Helpers ──────────────────────────────────────────

const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

function displayTemp(tempC: number, unit: 'C' | 'F'): string {
  if (unit === 'F') return `${Math.round(tempC * 9 / 5 + 32)}°F`;
  return `${Math.round(tempC)}°C`;
}

const WEATHER_META: Record<string, { Icon: React.ElementType; label: string; color: string }> = {
  CLEAR: { Icon: WbSunnyIcon, label: 'Clear', color: '#FFD54F' },
  CLOUDY: { Icon: CloudQueueIcon, label: 'Cloudy', color: '#90A4AE' },
  RAIN: { Icon: WaterDropIcon, label: 'Rain', color: '#4FC3F7' },
  THUNDERSTORM: { Icon: ThunderstormIcon, label: 'Thunderstorm', color: '#CE93D8' },
  SNOW: { Icon: AcUnitIcon, label: 'Snow', color: '#E0E0E0' },
  FOG: { Icon: FoggyIcon, label: 'Fog', color: '#78909C' },
};

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

  // Sync local ZIP when settings panel opens (in case config changed externally)
  useEffect(() => {
    if (settingsOpen) {
      setLocalZip(config.zipCode ?? '');
    }
  }, [settingsOpen]);

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
      // Always force a fresh weather fetch from the API on Save
      if (!config.weatherOverride) {
        useStore.setState((s) => ({ _weatherRefetchKey: s._weatherRefetchKey + 1 }));
      }
      setError(null);
      toggleSettings();
    },
    [localZip, config.weatherOverride, setConfig, setError, toggleSettings],
  );

  const overlayAlpha = config.overlayOpacity ?? 1;
  const weather = WEATHER_META[environment.condition] ?? WEATHER_META.CLEAR;
  const WeatherIcon = weather.Icon;

  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>

      {/* ── FAB — Settings toggle (bottom-right) ── */}
      <Tooltip title={settingsOpen ? 'Close' : 'Settings'} placement="left" arrow>
        <Fab
          data-interactive="true"
          size="medium"
          onClick={toggleSettings}
          sx={{
            pointerEvents: 'auto',
            position: 'absolute',
            bottom: 24,
            right: 24,
          }}
        >
          {settingsOpen ? <CloseIcon /> : <SettingsIcon />}
        </Fab>
      </Tooltip>

      {/* ── Status Card (bottom-left) ── */}
      <Fade in timeout={400}>
        <Card
          elevation={8}
          sx={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            opacity: overlayAlpha,
            transition: 'opacity 0.3s ease',
            borderRadius: 3,
            overflow: 'hidden',
            minWidth: 220,
          }}
        >
          {/* Gradient accent strip */}
          <Box sx={{ height: 2, background: GRADIENT }} />

          <CardContent sx={{ p: '14px 18px !important', '&:last-child': { pb: '14px !important' } }}>
            <Stack spacing={1.2}>
              {/* City + weather row */}
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(weather.color, 0.16)} 0%, ${alpha(weather.color, 0.04)} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${alpha(weather.color, 0.1)}`,
                    flexShrink: 0,
                  }}
                >
                  <WeatherIcon sx={{ fontSize: 22, color: weather.color }} />
                </Box>
                <Box>
                  {environment.cityName && (
                    <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
                      {environment.cityName}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {weather.label} · {displayTemp(environment.temperature, config.temperatureUnit)}
                  </Typography>
                </Box>
              </Stack>

              <Divider />

              {/* System stats row */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <StatChip icon={<MemoryIcon sx={{ fontSize: 14 }} />} label={`CPU ${system.cpuLoad}%`} />
                <StatChip icon={<StorageIcon sx={{ fontSize: 14 }} />} label={`MEM ${system.memoryUsage}%`} />
                <StatChip icon={<AirIcon sx={{ fontSize: 14 }} />} label={`${environment.windSpeed.toFixed(1)}`} />
                {system.isBatteryLow && (
                  <Chip
                    icon={<BatteryAlertIcon sx={{ fontSize: 14 }} />}
                    label="Low"
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.6875rem' }}
                  />
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Fade>

      {/* ── Error Snackbar ── */}
      <Snackbar
        open={ui.isError && !!ui.errorMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert
          severity="error"
          variant="filled"
          sx={{
            backdropFilter: 'blur(24px)',
            background: alpha('#1a1a2e', 0.92),
            border: '1px solid rgba(239,83,80,0.2)',
            '& .MuiAlert-icon': { color: '#ef5350' },
          }}
        >
          {ui.errorMessage}
        </Alert>
      </Snackbar>

      {/* ── Success Snackbar ── */}
      <Snackbar
        open={!!ui.successMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert
          severity="success"
          variant="filled"
          sx={{
            backdropFilter: 'blur(24px)',
            background: alpha('#1a2e1a', 0.92),
            border: '1px solid rgba(76,175,80,0.2)',
            color: '#fff',
            '& .MuiAlert-icon': { color: '#4caf50' },
          }}
        >
          {ui.successMessage}
        </Alert>
      </Snackbar>

      {/* ── Settings Panel ── */}
      {settingsOpen && (
        <Fade in timeout={250}>
          <Card
            component="form"
            onSubmit={handleSave}
            data-interactive="true"
            elevation={16}
            sx={{
              pointerEvents: 'auto',
              position: 'absolute',
              bottom: 84,
              right: 24,
              width: 340,
              borderRadius: 4,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Gradient accent bar */}
            <Box sx={{ height: 3, background: GRADIENT }} />

            {/* Header */}
            <Box sx={{ px: 2.5, pt: 2.5, pb: 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <TuneIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="h6" fontSize="1rem">
                  Settings
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.disabled">
                Customize your weather overlay
              </Typography>
            </Box>

            {/* Body */}
            <Box sx={{ px: 2.5, pt: 1.5, pb: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

              {/* ── Location ── */}
              <TextField
                data-interactive="true"
                label="Location"
                placeholder="US ZIP code"
                size="small"
                fullWidth
                value={localZip}
                onChange={(e) => setLocalZip(e.target.value)}
                InputProps={{
                  startAdornment: <LocationOnIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />,
                }}
              />

              {/* ── Weather override ── */}
              <FormControl size="small" fullWidth>
                <InputLabel>Weather</InputLabel>
                <Select
                  data-interactive="true"
                  label="Weather"
                  value={(config.weatherOverride as string) ?? 'AUTO'}
                  onChange={(e) =>
                    setConfig({
                      weatherOverride: e.target.value === 'AUTO' ? null : (e.target.value as any),
                    })
                  }
                  startAdornment={<CloudIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />}
                >
                  <MenuItem value="AUTO">Auto (live)</MenuItem>
                  <MenuItem value="CLEAR">☀ Clear</MenuItem>
                  <MenuItem value="CLOUDY">☁ Cloudy</MenuItem>
                  <MenuItem value="RAIN">🌧 Rain</MenuItem>
                  <MenuItem value="THUNDERSTORM">⛈ Thunderstorm</MenuItem>
                  <MenuItem value="SNOW">❄ Snow</MenuItem>
                  <MenuItem value="FOG">🌫 Fog</MenuItem>
                </Select>
              </FormControl>

              {/* ── Custom effect ── */}
              <FormControl size="small" fullWidth>
                <InputLabel>Custom Effect</InputLabel>
                <Select
                  data-interactive="true"
                  label="Custom Effect"
                  value={(config.customEffect as string) ?? ''}
                  onChange={(e) =>
                    setConfig({ customEffect: e.target.value === '' ? null : (e.target.value as any) })
                  }
                  startAdornment={<AutoFixHighIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="SAKURA">🌸 Sakura Petals</MenuItem>
                  <MenuItem value="HYDRO_BLAST">💦 Hydro Blast</MenuItem>
                  <MenuItem value="TECHNO_TUNNEL">🔮 Techno Tunnel</MenuItem>
                  <MenuItem value="FIREFLIES">✨ Fireflies</MenuItem>
                  <MenuItem value="AURORA">🌌 Aurora Borealis</MenuItem>
                </Select>
              </FormControl>

              {/* ── Opacity Slider ── */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <OpacityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="subtitle2">Opacity</Typography>
                  </Stack>
                  <Chip
                    label={`${Math.round((config.overlayOpacity ?? 1) * 100)}%`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </Stack>
                <Slider
                  data-interactive="true"
                  value={config.overlayOpacity ?? 1}
                  onChange={(_, v) => setConfig({ overlayOpacity: v as number })}
                  min={0}
                  max={1}
                  step={0.01}
                  size="small"
                />
              </Box>

              {/* ── Particle Speed Slider ── */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <SpeedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="subtitle2">Particle Speed</Typography>
                  </Stack>
                  <Chip
                    label={`${Math.round((config.particleSpeed ?? 1) * 100)}%`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </Stack>
                <Slider
                  data-interactive="true"
                  value={config.particleSpeed ?? 1}
                  onChange={(_, v) => setConfig({ particleSpeed: v as number })}
                  min={0.1}
                  max={2}
                  step={0.05}
                  size="small"
                />
              </Box>

              <Divider />

              {/* ── Toggles ── */}
              <Stack spacing={1}>
                <ToggleRow
                  icon={<ThermostatIcon />}
                  label="Fahrenheit"
                  checked={config.temperatureUnit === 'F'}
                  onChange={(v) => setConfig({ temperatureUnit: v ? 'F' : 'C' })}
                />
                <ToggleRow
                  icon={<AutoAwesomeIcon />}
                  label="High quality particles"
                  checked={config.highPerformanceMode}
                  onChange={(v) => setConfig({ highPerformanceMode: v })}
                />
                <ToggleRow
                  icon={<FormatPaintIcon />}
                  label="Opaque background"
                  checked={config.opaqueBackground}
                  onChange={(v) => {
                    setConfig({ opaqueBackground: v });
                    window.electronAPI?.send(IPC_CHANNELS.SET_OPAQUE, v);
                  }}
                />
              </Stack>

              <Divider />

              {/* ── Action Buttons ── */}
              <Stack direction="row" spacing={1}>
                <Button
                  data-interactive="true"
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<SaveIcon />}
                >
                  Save
                </Button>
                <Button
                  data-interactive="true"
                  type="button"
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={toggleSettings}
                >
                  Cancel
                </Button>
              </Stack>
            </Box>
          </Card>
        </Fade>
      )}
    </Box>
  );
};

// ── Sub-components ────────────────────────────────────

/** Tiny stat chip in the status card */
const StatChip: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <Chip
    icon={icon as React.ReactElement}
    label={label}
    size="small"
    variant="outlined"
    sx={{
      height: 22,
      fontSize: '0.6875rem',
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
      borderColor: 'rgba(255,255,255,0.06)',
      color: 'text.secondary',
      '& .MuiChip-icon': { color: 'text.disabled', ml: '4px' },
    }}
  />
);

/** Toggle row with icon, label, and MUI Switch */
const ToggleRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ icon, label, checked, onChange }) => (
  <Stack
    data-interactive="true"
    direction="row"
    alignItems="center"
    spacing={1.2}
    onClick={() => onChange(!checked)}
    sx={{ cursor: 'pointer', py: 0.25 }}
  >
    <Box sx={{ color: checked ? 'primary.main' : 'text.disabled', display: 'flex', '& svg': { fontSize: 20 } }}>
      {icon}
    </Box>
    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
      {label}
    </Typography>
    <Switch
      checked={checked}
      onChange={(_, v) => { onChange(v); }}
      onClick={(e) => e.stopPropagation()}
      size="small"
    />
  </Stack>
);
