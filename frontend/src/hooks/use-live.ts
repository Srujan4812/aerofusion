"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface LiveSource {
  id: string;
  name: string;
  provider: string;
  kind: string;
  key: boolean;
  ok: boolean;
  records: number;
  latency_ms: number;
  error: string | null;
  fetched_at: string | null;
}

export interface LiveCity {
  slug: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  pm25: number | null;
  pm10: number | null;
  aod: number | null;
  dust: number | null;
  no2: number | null;
  co: number | null;
  temp: number | null;
  rh: number | null;
  wind: number | null;
  pressure: number | null;
  precip: number | null;
  pblh: number | null;
  fires_300km: number | null;
  frp_300km: number | null;
  fires_upwind: number | null;
  cpcb_baseline: number | null;
  us_aqi: number | null;
  wind_dir: number | null;
  pm25_24h: (number | null)[];
  cpcb: { pm25_mean: number; n_days: number; stations: number; period: string; station_names: string[] } | null;
  observed_at: string | null;
}

export interface GibsLayer {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  url: string;
  layers: string;
  transparent: boolean;
}

export interface LiveSnapshot {
  updated_at: string;
  took_ms: number;
  interval_s: number;
  refresh_count: number;
  next_refresh_in: number;
  sources: LiveSource[];
  cities: LiveCity[];
  fires: { total: number; points: { lat: number; lon: number; frp: number; confidence: string; satellite: string }[]; regions: { region: string; count: number; frp: number }[] };
  gibs: { layers: GibsLayer[]; cities: { city: string; name: string; date: string; url: string }[] } | null;
  tensor: {
    shape: number[];
    dims: string[];
    features: { key: string; label: string; unit: string; source: string }[];
    cities: string[];
    z: (number | null)[][];
    coverage: number;
    file: string;
  };
}

/** Live snapshot from the AeroFusion backend with a countdown to the next server refresh. */
export function useLive() {
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const lastUpdated = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/live/snapshot`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const s = (await r.json()) as LiveSnapshot;
      lastUpdated.current = s.updated_at;
      setSnap(s);
      setCountdown(s.next_refresh_in);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch(`${API_URL}/api/live/refresh`, { method: "POST" });
      if (r.status === 409) await load();
      else if (!r.ok) throw new Error(`HTTP ${r.status}`);
      else {
        const s = (await r.json()) as LiveSnapshot;
        lastUpdated.current = s.updated_at;
        setSnap(s);
        setCountdown(s.next_refresh_in);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // initial load + status polling (picks up the server's scheduled refreshes)
  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/api/live/status`, { cache: "no-store" });
        if (!r.ok) return;
        const s = (await r.json()) as { updated_at: string | null; next_refresh_in: number; refreshing: boolean };
        setCountdown(s.next_refresh_in);
        if (s.updated_at && s.updated_at !== lastUpdated.current) await load();
      } catch {
        /* backend offline — shown via error state on next load */
      }
    }, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  // local 1 s tick
  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => (c === null ? c : Math.max(0, c - 1))), 1000);
    return () => clearInterval(id);
  }, []);

  return { snap, error, refreshing, countdown, refresh, reload: load };
}
