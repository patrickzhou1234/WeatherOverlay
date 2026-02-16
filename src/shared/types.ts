// ─────────────────────────────────────────────────────────
// Shared Type Definitions — Single source of truth
// ─────────────────────────────────────────────────────────

/** Weather condition buckets (decoupled from any specific API provider). */
export type WeatherCondition =
  | 'CLEAR'
  | 'RAIN'
  | 'SNOW'
  | 'THUNDERSTORM'
  | 'CLOUDY'
  | 'FOG';

/** Simplified time-of-day bands. */
export type TimeOfDay = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';

/** Custom visual effect modes (layered on top of weather). */
export type CustomEffect =
  | 'SAKURA'
  | 'HYDRO_BLAST'
  | 'TECHNO_TUNNEL'
  | 'FIREFLIES'
  | 'AURORA';

// ── Application Store ──────────────────────────────────

export interface AppConfig {
  zipCode: string | null;
  /** Weather refresh interval in ms (min 600 000 = 10 min). */
  refreshInterval: number;
  /** When true, raises particle caps for richer visuals. */
  highPerformanceMode: boolean;
  /** When true the overlay has an opaque dark background instead of transparent. */
  opaqueBackground: boolean;
  /** Overall overlay opacity 0 (fully transparent) to 1 (fully opaque). */
  overlayOpacity: number;
  /** Manual weather override — null means use live data. */
  weatherOverride: WeatherCondition | null;
  /** Temperature display unit. */
  temperatureUnit: 'C' | 'F';
  /** Custom visual effect layered alongside weather — null means none. */
  customEffect: CustomEffect | null;
  /** Particle speed multiplier 0.1 (very slow) to 2.0 (double speed). Default 1. */
  particleSpeed: number;
}

export interface EnvironmentState {
  condition: WeatherCondition;
  timeOfDay: TimeOfDay;
  /** Celsius */
  temperature: number;
  /** m/s */
  windSpeed: number;
  /** 0-100 */
  humidity: number;
  /** Resolved city/town name from geocoding (null until first successful lookup). */
  cityName: string | null;
}

export interface SystemState {
  /** 0-100 */
  cpuLoad: number;
  /** 0-100 */
  memoryUsage: number;
  isBatteryLow: boolean;
}

export interface UIState {
  /** When true the window captures mouse events (e.g. Settings panel open). */
  isInteractive: boolean;
  /** When true the settings panel is visible and the window is interactive. */
  settingsVisible: boolean;
  isError: boolean;
  errorMessage: string | null;
  /** Transient success message shown briefly after a successful action. */
  successMessage: string | null;
}

export interface AppState {
  config: AppConfig;
  environment: EnvironmentState;
  system: SystemState;
  ui: UIState;
  /** Internal counter bumped when switching to Auto to trigger re-fetch. */
  _weatherRefetchKey: number;
}

// ── IPC Payloads ───────────────────────────────────────

/** Channel: 'system:stats' — Main → Renderer */
export interface SystemStatsPayload {
  cpuLoad: number;
  memFree: number;
  batteryPercent?: number;
}

/** Channel: 'window:set-ignore-mouse' — Renderer → Main */
export interface IgnoreMousePayload {
  /** true = click-through, false = clickable */
  ignore: boolean;
  /** true = forward events to webview */
  forward: boolean;
}

// ── IPC Channel names (kept in one place to avoid typos) ──

export const IPC_CHANNELS = {
  SYSTEM_STATS: 'system:stats',
  SET_IGNORE_MOUSE: 'window:set-ignore-mouse',
  GET_SYSTEM_STATS: 'system:get-stats',
  SET_INTERACTIVE: 'ui:set-interactive',
  SET_OPAQUE: 'ui:set-opaque',
  OPEN_SETTINGS: 'tray:open-settings',
  QUIT_APP: 'tray:quit',
  RESET_VIEW: 'tray:reset-view',
} as const;

// ── NWS API helpers ────────────────────────────────────

/** Shape of a Nominatim geocode result (only fields we use). */
export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/** Parsed weather observation from the NWS API. */
export interface NWSObservation {
  condition: WeatherCondition;
  /** Celsius */
  temperature: number;
  /** m/s */
  windSpeed: number;
  /** 0-100 */
  humidity: number;
  /** ISO-8601 timestamp of the observation */
  timestamp: string;
}
