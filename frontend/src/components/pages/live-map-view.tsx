"use client";

import { Activity, ArrowRight, Droplets, Flame, Gauge, Layers, MapPin, Pause, Play, Radar, Thermometer, TriangleAlert, Wind } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Legend } from "@/components/charts/chart-tooltip";
import { Donut } from "@/components/charts/donut";
import { ForecastChart, toForecastData } from "@/components/charts/forecast-chart";
import { AtmosMap, HeatLegend, type MapArc, type MapCity } from "@/components/map/atmos-map";
import { SkyScene } from "@/components/sky/sky-scene";
import { AqiBadge, Badge, Dot } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { AnimatedNumber, Skeleton, Slider, Switch, Tip } from "@/components/ui/primitives";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { useAnchor } from "@/hooks/use-anchor";
import { useAppStore } from "@/hooks/use-app-store";
import { useCity } from "@/hooks/use-city";
import { AQI_CATEGORIES, categoryForPm, pmToAqi } from "@/lib/aqi";
import { CITIES } from "@/lib/cities";
import { fmtDateTime, fmtLead } from "@/lib/format";
import { fireHotspots, pmAt, weatherAt } from "@/lib/sim/core";
import type { FieldMetric } from "@/lib/sim/field";
import { forecastSeries, predictAt } from "@/lib/sim/forecast";
import { diffusionGraph } from "@/lib/sim/graph";
import { cn } from "@/lib/utils";

const METRICS: { value: FieldMetric; label: string; icon: React.ReactNode }[] = [
  { value: "pm", label: "PM2.5", icon: <Gauge className="size-4" /> },
  { value: "aqi", label: "AQI", icon: <Activity className="size-4" /> },
  { value: "temp", label: "Temp", icon: <Thermometer className="size-4" /> },
  { value: "wind", label: "Wind", icon: <Wind className="size-4" /> },
];

export function LiveMapView() {
  const anchor = useAnchor();
  const city = useCity();
  const setCity = useAppStore((s) => s.setCity);
  const [metric, setMetric] = useState<FieldMetric>("pm");
  const [offset, setOffset] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState({ heat: true, wind: true, fires: true, graph: false, labels: true });
  const [layersOpen, setLayersOpen] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setOffset((o) => (o >= 48 ? -24 : o + 1)), 650);
    return () => clearInterval(id);
  }, [playing]);

  const t = anchor !== null ? anchor + offset : null;

  const state = useMemo(() => {
    if (anchor === null || t === null) return null;
    const pmBy: Record<string, number> = {};
    for (const c of CITIES) pmBy[c.slug] = offset <= 0 ? pmAt(c, t) : predictAt(c, anchor, t).pred;
    const cities: MapCity[] = CITIES.map((c) => {
      const w = weatherAt(c, t);
      const pm = pmBy[c.slug];
      const value = metric === "temp" ? w.temp : metric === "wind" ? w.wind : pm;
      return {
        slug: c.slug,
        name: c.name,
        lat: c.lat,
        lon: c.lon,
        value,
        pm,
        sub: `${Math.round(w.temp)}°C · ${w.wind.toFixed(1)} m/s · RH ${Math.round(w.rh)}%`,
      };
    });
    const fires = fireHotspots(t, 380);
    const arcs: MapArc[] = diffusionGraph(t, 2).map((e) => ({
      id: `${e.source.slug}-${e.target.slug}`,
      from: [e.source.lon, e.source.lat],
      to: [e.target.lon, e.target.lat],
      weight: e.weight,
      color: categoryForPm(pmBy[e.source.slug]).color,
    }));
    const sorted = [...CITIES].sort((a, b) => pmBy[b.slug] - pmBy[a.slug]);
    const avg = CITIES.reduce((s, c) => s + pmBy[c.slug], 0) / CITIES.length;
    const highRisk = CITIES.filter((c) => pmBy[c.slug] > 90).length;
    const counts = AQI_CATEGORIES.map((cat) => ({
      key: cat.key,
      label: cat.label,
      color: cat.color,
      value: CITIES.filter((c) => categoryForPm(pmBy[c.slug]).key === cat.key).reduce((s, c) => s + c.stations, 0),
      sub: `(${cat.pm[0]}–${cat.key === "severe" ? "500" : cat.pm[1]})`,
    })).filter((d) => d.value > 0);
    const stations = CITIES.reduce((s, c) => s + c.stations, 0);
    const regions = Object.entries(
      fires.points.reduce<Record<string, { n: number; high: number }>>((acc, f) => {
        acc[f.region] ??= { n: 0, high: 0 };
        acc[f.region].n++;
        if (f.confidence === "high") acc[f.region].high++;
        return acc;
      }, {}),
    )
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.n - a.n);
    return { pmBy, cities, fires, arcs, sorted, avg, highRisk, counts, stations, regions };
  }, [anchor, t, offset, metric]);

  const selPm = state?.pmBy[city.slug] ?? 0;
  const selW = t !== null ? weatherAt(city, t) : null;
  const trend = useMemo(() => (anchor !== null ? toForecastData(forecastSeries(city, anchor, 48, 24, 1)) : []), [anchor, city]);

  return (
    <div className="pt-2">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="font-display text-4xl font-bold tracking-[-0.035em] text-fg sm:text-[44px]">
            Live Air Quality <span className="text-gradient">Map</span>
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-fg-muted">
            PM2.5 across India with forecasts, wind flow, fire hotspots and the learned transport graph.
          </p>
        </motion.div>
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={<Activity />} tint="#ef4444" value={state?.avg} unit="µg/m³" label="National avg." />
          <MiniStat icon={<TriangleAlert />} tint="#f97316" value={state?.highRisk} label="Cities ≥ Poor" />
          <MiniStat icon={<Radar />} tint="#10b981" value={state?.stations} label="Stations (demo)" />
          <MiniStat icon={<Flame />} tint="#f59e0b" value={state?.fires.total} label="Fire detections" />
        </Stagger>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Map */}
        <Card padded={false} spotlight={false} className="relative h-[620px] overflow-hidden xl:col-span-8 2xl:col-span-9">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--primary)_6%,transparent),transparent_70%)]" />
          {state && t !== null ? (
            <AtmosMap
              cities={state.cities}
              metric={metric}
              t={t}
              heat={layers.heat}
              heatPoints={state.cities.map((c) => ({ lat: c.lat, lon: c.lon, value: c.value }))}
              wind={layers.wind}
              fires={layers.fires ? state.fires.points : undefined}
              arcs={layers.graph ? state.arcs : undefined}
              labels={layers.labels ? "major" : "selected"}
              selected={city.slug}
              onSelect={setCity}
              wheelZoom
              padding={36}
            />
          ) : (
            <Skeleton className="absolute inset-4" />
          )}

          {/* metric switcher */}
          <div className="glass absolute left-4 top-4 z-10 flex flex-col gap-1 rounded-[24px] p-1.5">
            {METRICS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMetric(m.value)}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                  metric === m.value ? "text-primary" : "text-fg-muted hover:text-fg",
                )}
              >
                {metric === m.value && <motion.span layoutId="metric-pill" className="glass-strong absolute inset-0 rounded-full" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                <span className="relative">{m.icon}</span>
                <span className="relative">{m.label}</span>
              </button>
            ))}
          </div>

          {/* layers */}
          <div className="glass absolute right-4 top-4 z-10 w-[236px] overflow-hidden rounded-[24px]">
            <button onClick={() => setLayersOpen((o) => !o)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-fg">
              <Layers className="size-4 text-primary" /> Layers
              <span className={cn("ml-auto text-fg-subtle transition-transform", layersOpen && "rotate-180")}>⌄</span>
            </button>
            <AnimatePresence initial={false}>
              {layersOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="space-y-0.5 border-t border-border p-2">
                    {(
                      [
                        ["heat", "Surface (interpolated)", "#ef4444"],
                        ["wind", "Wind flow", "#38bdf8"],
                        ["fires", "Fire hotspots (FIRMS)", "#f59e0b"],
                        ["graph", "Transport graph", "#10b981"],
                        ["labels", "City labels", "#64748b"],
                      ] as const
                    ).map(([key, label, color]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-xs text-fg-muted hover:bg-surface-sunken">
                        <span className="size-2 rounded-full" style={{ background: color }} />
                        <span className="flex-1">{label}</span>
                        <Switch checked={layers[key]} onChange={(v) => setLayers((l) => ({ ...l, [key]: v }))} color={color} aria-label={label} />
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* legend */}
          <div className="absolute bottom-[88px] left-14 z-10 hidden sm:block">
            <HeatLegend metric={metric} title={metric === "pm" ? "PM2.5 (µg/m³)" : metric === "aqi" ? "AQI (CPCB)" : metric === "temp" ? "Temperature" : "Wind speed (m/s)"} />
          </div>

          {/* timeline */}
          <div className="glass absolute inset-x-4 bottom-4 z-10 mx-auto flex max-w-[640px] items-center gap-3 rounded-full py-2 pl-2 pr-3">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="glass-tint grid size-10 shrink-0 place-items-center rounded-full transition hover:brightness-110"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-fg tabular">{t !== null ? fmtDateTime(t) : "—"}</span>
                <span className={cn("flex items-center gap-1.5 font-semibold", offset <= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-sky-600 dark:text-sky-300")}>
                  <Dot color={offset <= 0 ? "#10b981" : "#0ea5e9"} pulse={offset === 0} />
                  {offset === 0 ? "Now" : offset < 0 ? `Observed ${fmtLead(offset)}` : `Forecast ${fmtLead(offset)}`}
                </span>
              </div>
              <Slider value={offset} onChange={setOffset} min={-24} max={48} step={1} color={offset <= 0 ? "#10b981" : "#0ea5e9"} aria-label="Time" />
            </div>
            <button onClick={() => setOffset(0)} className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold text-fg-muted hover:bg-surface-sunken hover:text-fg">
              Live
            </button>
          </div>
        </Card>

        {/* Right column */}
        <div className="grid gap-4 xl:col-span-4 2xl:col-span-3">
          <Card padded={false} className="overflow-hidden">
            <div className="relative h-[168px] overflow-hidden">
              <SkyScene pm={selPm} landmark={city.landmark} seed={city.slug.length + 3} className="absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
              <div className="absolute left-4 top-3 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                <MapPin className="size-3.5" /> {city.name}
              </div>
              <div className="absolute bottom-3 right-3 rounded-2xl bg-white/80 px-3 py-2 text-right shadow-lift backdrop-blur-md dark:bg-black/45">
                <div className="text-[10px] font-semibold text-fg-muted">PM2.5</div>
                <div className="font-display text-2xl font-bold leading-none text-fg">
                  <AnimatedNumber value={Math.round(selPm)} />
                  <span className="ml-1 text-[11px] font-medium text-fg-muted">µg/m³</span>
                </div>
                <AqiBadge pm={selPm} size="xs" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-border p-3 text-center">
              <MiniMetric icon={<Activity className="size-3.5 text-red-500" />} label="AQI" value={pmToAqi(selPm)} />
              <MiniMetric icon={<Thermometer className="size-3.5 text-amber-500" />} label="Temp" value={selW ? `${Math.round(selW.temp)}°` : "—"} />
              <MiniMetric icon={<Droplets className="size-3.5 text-sky-500" />} label="RH" value={selW ? `${Math.round(selW.rh)}%` : "—"} />
              <MiniMetric icon={<Wind className="size-3.5 text-teal-500" />} label="Wind" value={selW ? selW.wind.toFixed(1) : "—"} />
            </div>
            <div className="border-t border-border px-4 py-2.5">
              <Link href="/forecast" className="group flex items-center justify-between text-xs font-semibold text-primary">
                Open {city.name} forecast <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Most polluted now" subtitle={offset === 0 ? "Live ranking" : `At ${fmtLead(offset)}`} />
            <div className="space-y-1">
              {state
                ? state.sorted.slice(0, 6).map((c, i) => {
                    const v = state.pmBy[c.slug];
                    return (
                      <motion.button
                        layout
                        key={c.slug}
                        onClick={() => setCity(c.slug)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-sunken",
                          c.slug === city.slug && "bg-primary-soft",
                        )}
                      >
                        <span className="grid size-6 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: categoryForPm(v).color }}>
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium text-fg">{c.name}</span>
                        <span className="text-sm font-semibold tabular text-fg">{Math.round(v)}</span>
                        <AqiBadge pm={v} size="xs" className="hidden w-[84px] justify-center sm:inline-flex" />
                      </motion.button>
                    );
                  })
                : [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9" />)}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader title={`Air quality trend · ${city.name}`} subtitle="Observed (24 h) and forecast (48 h)" />
          <Legend
            className="mb-2"
            items={[
              { label: "Observed", color: "var(--fg)" },
              { label: "Forecast", color: "var(--primary)" },
              { label: "P10–P90", color: "var(--primary)", band: true },
            ]}
          />
          {trend.length ? <ForecastChart data={trend} height={220} showBands={false} /> : <Skeleton className="h-[220px]" />}
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="AQI category distribution" subtitle="Share of monitoring stations by CPCB category" />
          {state ? (
            <Donut
              data={state.counts}
              center={
                <div>
                  <div className="font-display text-3xl font-bold text-fg tabular">{state.stations}</div>
                  <div className="text-[11px] text-fg-muted">stations</div>
                </div>
              }
            />
          ) : (
            <Skeleton className="h-48" />
          )}
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader
            title="Fire hotspots"
            subtitle="Detections today by region"
            action={
              <Tip content="Simulated FIRMS-style detections in demo mode. With a FIRMS MAP_KEY the backend ingests VIIRS/MODIS active fires.">
                <span>
                  <Badge tone="warn">demo</Badge>
                </span>
              </Tip>
            }
          />
          <div className="space-y-2">
            {state
              ? state.regions.slice(0, 5).map((r) => (
                  <div key={r.region} className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-orange-500/10 text-orange-500">
                      <Flame className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-fg">{r.region}</span>
                        <span className="font-semibold tabular text-fg">{r.n}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(r.n / state.regions[0].n) * 100}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500"
                        />
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-fg-subtle">{Math.round((r.high / r.n) * 100)}% high confidence</div>
                    </div>
                  </div>
                ))
              : [0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ icon, value, unit, label, tint }: { icon: React.ReactNode; value?: number; unit?: string; label: string; tint: string }) {
  return (
    <StaggerItem>
      <div className="card flex items-center gap-3 !rounded-2xl px-3.5 py-3">
        <div className="grid size-10 place-items-center rounded-xl [&_svg]:size-[18px]" style={{ color: tint, background: `color-mix(in oklab, ${tint} 13%, transparent)` }}>
          {icon}
        </div>
        <div>
          <div className="font-display text-xl font-bold leading-none text-fg">
            {value === undefined ? "—" : <AnimatedNumber value={Math.round(value)} />}
            {unit && <span className="ml-1 text-[10px] font-medium text-fg-subtle">{unit}</span>}
          </div>
          <div className="mt-1 text-[11px] text-fg-muted">{label}</div>
        </div>
      </div>
    </StaggerItem>
  );
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="px-1">
      <div className="flex items-center justify-center gap-1 text-[10.5px] text-fg-muted">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-display text-[15px] font-bold tabular text-fg">{value}</div>
    </div>
  );
}
