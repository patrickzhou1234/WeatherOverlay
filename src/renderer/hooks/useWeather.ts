// ─────────────────────────────────────────────────────────
// useWeather — Fetches weather from the US National Weather
// Service API (api.weather.gov). No API key needed.
//
// Flow: ZIP → Nominatim geocode → NWS /points → nearest
//       observation station → latest observation.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { WeatherCondition, NWSObservation, NominatimResult } from '../../shared/types';
import {
  NWS_BASE_URL,
  NOMINATIM_URL,
  MIN_REFRESH_INTERVAL,
  LS_KEYS,
} from '../../shared/constants';

// ── Internal helpers ──────────────────────────────────

const HEADERS = { 'User-Agent': 'CozyOverlay/1.0 (weather-overlay-app)' };

/** Geocode a US ZIP/postal code to lat/lon + city name via Nominatim. */
async function geocodeZip(zip: string): Promise<{ lat: number; lon: number; city: string | null }> {
  const url = `${NOMINATIM_URL}?postalcode=${encodeURIComponent(zip)}&country=US&format=json&limit=1&addressdetails=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Nominatim ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (!data.length) throw new Error(`No results for ZIP "${zip}". Is it a valid US ZIP code?`);

  const item = data[0];
  const addr = item.address ?? {};
  // Nominatim uses city, town, or village depending on settlement size
  const city: string | null =
    addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? null;

  return { lat: parseFloat(item.lat), lon: parseFloat(item.lon), city };
}

/** Get the nearest observation station URL from an NWS grid point. */
async function getStationUrl(lat: number, lon: number): Promise<string> {
  // NWS wants max 4 decimal places
  const ptUrl = `${NWS_BASE_URL}/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
  const res = await fetch(ptUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`NWS /points ${res.status}: ${res.statusText}`);
  const data = await res.json();
  const stationsUrl: string | undefined =
    data?.properties?.observationStations;
  if (!stationsUrl) throw new Error('NWS did not return an observation stations URL.');
  // Fetch first station
  const stRes = await fetch(stationsUrl, { headers: HEADERS });
  if (!stRes.ok) throw new Error(`NWS /stations ${stRes.status}`);
  const stData = await stRes.json();
  const firstStation: string | undefined = stData?.features?.[0]?.id;
  if (!firstStation) throw new Error('No observation stations found for your location.');
  return firstStation;
}

/** Map an NWS textDescription string to our internal condition. */
function mapNwsDescription(desc: string): WeatherCondition {
  const d = desc.toLowerCase();
  if (d.includes('thunder')) return 'THUNDERSTORM';
  if (d.includes('snow') || d.includes('blizzard') || d.includes('sleet') || d.includes('ice')) return 'SNOW';
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return 'RAIN';
  if (d.includes('fog') || d.includes('mist') || d.includes('haze') || d.includes('smoke')) return 'FOG';
  if (d.includes('cloud') || d.includes('overcast') || d.includes('partly')) return 'CLOUDY';
  return 'CLEAR';
}

/** Fetch the latest observation from a station and normalise. */
async function fetchObservation(stationUrl: string): Promise<NWSObservation> {
  const url = `${stationUrl}/observations/latest`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`NWS observation ${res.status}: ${res.statusText}`);
  const data = await res.json();
  const p = data?.properties;
  if (!p) throw new Error('Malformed NWS observation response.');

  // NWS returns temperature in Celsius; value can be null for missing data
  const rawTemp = p.temperature?.value;
  const tempC = typeof rawTemp === 'number' ? rawTemp : 20;
  // NWS windSpeed is in km/h → convert to m/s
  const rawWind = p.windSpeed?.value;
  const windMs = typeof rawWind === 'number' ? rawWind / 3.6 : 0;
  const rawHumidity = p.relativeHumidity?.value;
  const humidity = typeof rawHumidity === 'number' ? rawHumidity : 50;
  const desc: string = p.textDescription ?? '';

  return {
    condition: mapNwsDescription(desc),
    temperature: tempC,
    windSpeed: windMs,
    humidity,
    timestamp: p.timestamp ?? new Date().toISOString(),
  };
}

// ── Cached station URL per ZIP ────────────────────────
let cachedZip: string | null = null;
let cachedStationUrl: string | null = null;

// ── Hook ──────────────────────────────────────────────

/**
 * Fetch weather for the configured zip code from the free
 * US National Weather Service API and sync the store.
 *
 * Rate-limited to ≥ 10 min intervals. Hydrates from
 * localStorage on startup so the user sees something
 * immediately.
 */
export function useWeather(): void {
  const { zipCode, refreshInterval, weatherOverride } = useStore((s) => s.config);
  const syncEnvironment = useStore((s) => s.syncEnvironment);
  const setError = useStore((s) => s.setError);
  const refetchKey = useStore((s) => s._weatherRefetchKey);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!zipCode) return;

    try {
      // Resolve station (cached per ZIP)
      if (cachedZip !== zipCode || !cachedStationUrl) {
        const { lat, lon, city } = await geocodeZip(zipCode);
        cachedStationUrl = await getStationUrl(lat, lon);
        cachedZip = zipCode;

        // Store resolved city name
        if (city) {
          useStore.setState((s) => ({
            environment: { ...s.environment, cityName: city },
          }));
        }
      }

      const obs = await fetchObservation(cachedStationUrl!);
      syncEnvironment(obs);
      setError(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown weather fetch error';
      setError(message);
    }
  }, [zipCode, syncEnvironment, setError]);

  // Hydrate cached weather on mount so we don't wait for first fetch
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LS_KEYS.LAST_WEATHER);
      if (cached) {
        const env = JSON.parse(cached);
        useStore.setState({ environment: env });
      }
    } catch {
      // ignore corrupt cache
    }
  }, []);

  // Poll loop — also re-runs when refetchKey bumps (Auto switch)
  useEffect(() => {
    if (!zipCode) return;

    // Kick off immediately
    fetchWeather();

    const safeInterval = Math.max(refreshInterval, MIN_REFRESH_INTERVAL);
    intervalRef.current = setInterval(fetchWeather, safeInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [zipCode, refreshInterval, fetchWeather, refetchKey]);
}
