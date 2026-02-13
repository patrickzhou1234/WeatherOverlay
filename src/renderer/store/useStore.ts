// ─────────────────────────────────────────────────────────
// Zustand Store — Single Source of Truth for the Renderer
// ─────────────────────────────────────────────────────────

import { create } from 'zustand';
import type {
  AppState,
  AppConfig,
  EnvironmentState,
  SystemState,
  WeatherCondition,
  TimeOfDay,
  NWSObservation,
} from '../../shared/types';
import {
  DEFAULT_CONFIG,
  DEFAULT_ENVIRONMENT,
  DEFAULT_SYSTEM,
  DEFAULT_UI,
  LOW_BATTERY_THRESHOLD,
  LS_KEYS,
} from '../../shared/constants';

// ── Helpers ────────────────────────────────────────────

/** Determine rough time-of-day from the current local hour. */
export function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 7) return 'DAWN';
  if (h >= 7 && h < 18) return 'DAY';
  if (h >= 18 && h < 20) return 'DUSK';
  return 'NIGHT';
}

/**
 * §3-B "Chaos Multiplier" — CPU load linearly maps to [1, 5].
 * This is applied to windSpeed so high CPU usage = more turbulent scene.
 */
export function chaosMultiplier(cpuLoad: number): number {
  return 1 + (cpuLoad / 100) * 4; // 0 → 1, 100 → 5
}

// ── Persisted config helpers ───────────────────────────

function loadPersistedConfig(): Partial<AppConfig> {
  try {
    const raw = localStorage.getItem(LS_KEYS.CONFIG);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistConfig(config: AppConfig): void {
  try {
    localStorage.setItem(LS_KEYS.CONFIG, JSON.stringify(config));
  } catch {
    // non-fatal
  }
}

// ── Store Actions ──────────────────────────────────────

interface AppActions {
  /** Merge partial config and persist to localStorage. */
  setConfig: (partial: Partial<AppConfig>) => void;

  /** Ingest a parsed NWS observation + current system state → update environment. */
  syncEnvironment: (obs: NWSObservation) => void;

  /** Apply a system-stats push from the main process. */
  updateSystem: (cpuLoad: number, memFree: number, batteryPercent?: number) => void;

  /** Toggle interactive mode (settings open/close). */
  setInteractive: (active: boolean) => void;

  /** Open or close the settings panel (also toggles interactive mode). */
  setSettingsVisible: (visible: boolean) => void;

  /** Set an error visible to the user. */
  setError: (message: string | null) => void;

  /** Reset environment + ui to defaults (tray "Reset View"). */
  resetView: () => void;
}

// ── Store Creation ─────────────────────────────────────

// Compute initial config once so we can derive UI state from it
const initialConfig = { ...DEFAULT_CONFIG, ...loadPersistedConfig() };

// If there's no ZIP code yet, open settings panel immediately
const needsSetup = !initialConfig.zipCode;

export const useStore = create<AppState & AppActions>((set, get) => ({
  // --- initial slices ---
  config: initialConfig,
  environment: { ...DEFAULT_ENVIRONMENT },
  system: { ...DEFAULT_SYSTEM },
  ui: {
    ...DEFAULT_UI,
    settingsVisible: needsSetup,
    isInteractive: needsSetup,
  },
  /** Bumped when switching to Auto to trigger a fresh weather fetch. */
  _weatherRefetchKey: 0,

  // --- actions ---
  setConfig: (partial) => {
    const next = { ...get().config, ...partial };
    persistConfig(next);
    set({ config: next });

    // If weatherOverride changed, apply it to environment immediately
    if ('weatherOverride' in partial) {
      if (next.weatherOverride) {
        // Manual override → set condition directly
        set({ environment: { ...get().environment, condition: next.weatherOverride } });
      } else {
        // Switched back to Auto → restore cached live observation + bump
        // the refetch key so useWeather triggers a fresh API call.
        try {
          const cached = localStorage.getItem(LS_KEYS.LAST_WEATHER);
          if (cached) {
            const lastEnv: EnvironmentState = JSON.parse(cached);
            set({ environment: { ...get().environment, ...lastEnv } });
          }
        } catch {
          // non-fatal
        }
        // Bump refetch key to force useWeather to re-fetch
        set({ _weatherRefetchKey: get()._weatherRefetchKey + 1 });
      }
    }
  },

  syncEnvironment: (obs) => {
    const { system, config } = get();
    const timeOfDay = getTimeOfDay();
    const chaos = chaosMultiplier(system.cpuLoad);

    const env: EnvironmentState = {
      condition: config.weatherOverride ?? obs.condition,
      timeOfDay,
      temperature: obs.temperature,
      windSpeed: obs.windSpeed * chaos,
      humidity: obs.humidity,
      cityName: get().environment.cityName,
    };

    // §5-4 Cache last known weather for offline restarts
    try {
      localStorage.setItem(LS_KEYS.LAST_WEATHER, JSON.stringify(env));
    } catch {
      // non-fatal
    }

    set({ environment: env });
  },

  updateSystem: (cpuLoad, memFree, batteryPercent) => {
    const memoryUsage = 100 - memFree; // convert free→used
    const isBatteryLow =
      batteryPercent !== undefined && batteryPercent < LOW_BATTERY_THRESHOLD;

    set({
      system: { cpuLoad, memoryUsage, isBatteryLow },
    });
  },

  setInteractive: (active) => {
    set({ ui: { ...get().ui, isInteractive: active } });
  },

  setSettingsVisible: (visible) => {
    set({
      ui: { ...get().ui, settingsVisible: visible, isInteractive: visible },
    });
  },

  setError: (message) => {
    set({
      ui: {
        ...get().ui,
        isError: message !== null,
        errorMessage: message,
      },
    });
  },

  resetView: () => {
    set({
      environment: { ...DEFAULT_ENVIRONMENT },
      ui: { ...DEFAULT_UI, settingsVisible: false },
    });
  },
}));
