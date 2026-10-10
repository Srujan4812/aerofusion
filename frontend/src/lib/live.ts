import { NAAQS_PM25_24H } from "./aqi";
import { CITY_BY_SLUG } from "./cities";
import type { LiveCity, LiveSnapshot } from "@/hooks/use-live";

export interface SeriesPoint {
  ms: number;
  lead: number; // hours relative to now (negative = past)
  pm25: number | null;
  pm10: number | null;
  aod: number | null;
  temp: number | null;
  rh: number | null;
  wind: number | null;
  wind_dir: number | null;
  pblh: number | null;
}

/** Hourly CAMS + weather series for a city with lead hours relative to `nowMs`. */
export function citySeries(c: LiveCity, nowMs = Date.now()): SeriesPoint[] {
  const s = c.series;
  if (!s?.time) return [];
  return s.time.map((t, i) => {
    const ms = Date.parse(t);
    return {
      ms,
      lead: Math.round((ms - nowMs) / 3_600_000),
      pm25: s.pm25[i] ?? null,
      pm10: s.pm10[i] ?? null,
      aod: s.aod[i] ?? null,
      temp: s.temp[i] ?? null,
      rh: s.rh[i] ?? null,
      wind: s.wind[i] ?? null,
      wind_dir: s.wind_dir[i] ?? null,
      pblh: s.pblh[i] ?? null,
    };
  });
}

export function window(points: SeriesPoint[], from: number, to: number) {
  return points.filter((p) => p.lead >= from && p.lead <= to);
}

export function at(points: SeriesPoint[], lead: number) {
  return points.reduce<SeriesPoint | null>((best, p) => (best === null || Math.abs(p.lead - lead) < Math.abs(best.lead - lead) ? p : best), null);
}

export function peak(points: SeriesPoint[]) {
  return points.reduce<SeriesPoint | null>((m, p) => (p.pm25 !== null && (m === null || (m.pm25 ?? -1) < p.pm25) ? p : m), null);
}

export function mean(xs: (number | null | undefined)[]) {
  const v = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function national(snap: LiveSnapshot) {
  const cities = snap.cities.filter((c) => c.pm25 !== null);
  const avg = mean(cities.map((c) => c.pm25)) ?? 0;
  const prevAvg = mean(cities.map((c) => c.pm25_24h[0])) ?? avg;
  const above = cities.filter((c) => (c.pm25 ?? 0) > NAAQS_PM25_24H);
  const pop = (slug: string) => CITY_BY_SLUG[slug]?.pop ?? 0;
  return {
    avg,
    change24: prevAvg ? ((avg - prevAvg) / prevAvg) * 100 : 0,
    aboveNaaqs: above.length,
    exposedM: above.reduce((s, c) => s + pop(c.slug), 0),
    popTotal: cities.reduce((s, c) => s + pop(c.slug), 0),
    sorted: [...cities].sort((a, b) => (b.pm25 ?? 0) - (a.pm25 ?? 0)),
    count: cities.length,
  };
}

/** Spearman rank correlation (robust to outliers, fine for 33 cities). */
export function spearman(xs: (number | null)[], ys: (number | null)[]) {
  const pairs = xs.map((x, i) => [x, ys[i]] as const).filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null);
  if (pairs.length < 5) return null;
  const rank = (arr: number[]) => {
    const idx = arr.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array(arr.length);
    idx.forEach(([, i], k) => (r[i] = k + 1));
    return r as number[];
  };
  const rx = rank(pairs.map((p) => p[0]));
  const ry = rank(pairs.map((p) => p[1]));
  const n = pairs.length;
  const mx = (n + 1) / 2;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - mx);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - mx) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

export function fmtIst(ms: number, opts: Intl.DateTimeFormatOptions = { hour: "numeric", hour12: true }) {
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "Asia/Kolkata" }).format(new Date(ms)).replace(/\s?(am|pm)/i, (m) => " " + m.trim().toUpperCase());
}

export function compass(deg: number | null) {
  if (deg === null) return "—";
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
}
