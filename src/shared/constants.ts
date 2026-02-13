import type { AppConfig, EnvironmentState, SystemState, UIState } from './types';

// ── Default Slices ─────────────────────────────────────

export const DEFAULT_CONFIG: AppConfig = {
  zipCode: null,
  refreshInterval: 600_000, // 10 minutes
  highPerformanceMode: false,
  opaqueBackground: false,
};

export const DEFAULT_ENVIRONMENT: EnvironmentState = {
  condition: 'CLEAR',
  timeOfDay: 'DAY',
  temperature: 20,
  windSpeed: 2,
  humidity: 50,
};

export const DEFAULT_SYSTEM: SystemState = {
  cpuLoad: 0,
  memoryUsage: 0,
  isBatteryLow: false,
};

export const DEFAULT_UI: UIState = {
  isInteractive: false,
  settingsVisible: false,
  isError: false,
  errorMessage: null,
};

// ── Numeric Guardrails ─────────────────────────────────

/** Minimum allowed weather polling interval (ms). */
export const MIN_REFRESH_INTERVAL = 600_000; // 10 min

/** Hard particle cap (normal mode). */
export const PARTICLE_CAP_NORMAL = 2_000;

/** Hard particle cap (high-performance mode). */
export const PARTICLE_CAP_HIGH = 6_000;

/** Target FPS — deliberately low for the lo-fi aesthetic. */
export const TARGET_FPS = 30;

/** System-stats polling cadence (ms). */
export const STATS_POLL_INTERVAL = 3_000;

/** Battery threshold below which isBatteryLow is true. */
export const LOW_BATTERY_THRESHOLD = 20;

/** Debounce delay (ms) for mouse-event toggle to prevent flicker. */
export const MOUSE_TOGGLE_DEBOUNCE_MS = 120;

// ── NWS + Nominatim (no API key needed) ──────────────────

/** US National Weather Service API base. */
export const NWS_BASE_URL = 'https://api.weather.gov';

/** Nominatim (OpenStreetMap) geocoding endpoint. */
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// ── LocalStorage Keys ──────────────────────────────────

export const LS_KEYS = {
  LAST_WEATHER: 'cozy:lastWeather',
  CONFIG: 'cozy:config',
} as const;
