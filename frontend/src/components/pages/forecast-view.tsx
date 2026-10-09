"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CircleCheck,
  Droplets,
  Gauge,
  HeartPulse,
  Info,
  Navigation,
  Sun,
  Thermometer,
  TriangleAlert,
  Wind,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Legend } from "@/components/charts/chart-tooltip";
import { ChartTip } from "@/components/charts/chart-tooltip";
import { ForecastChart, toForecastData, type ForecastDatum } from "@/components/charts/forecast-chart";
import { PageHero } from "@/components/layout/page-hero";
import { AqiBadge, Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { CitySelect } from "@/components/ui/city-select";
import { Kpi } from "@/components/ui/kpi";
import { AnimatedNumber, Delta, Skeleton } from "@/components/ui/primitives";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { Segmented } from "@/components/ui/segmented";
import { useAnchor } from "@/hooks/use-anchor";
import { useCity } from "@/hooks/use-city";
import { AQI_CATEGORIES, categoryForPm, pmToAqi } from "@/lib/aqi";
import { fmtDateTime, fmtDay, fmtHour, fmtWeekday } from "@/lib/format";
import { bestWindow, forecastInsights } from "@/lib/insights";
import { weatherAt } from "@/lib/sim/core";
import { backtest, errorStats, forecastSeries } from "@/lib/sim/forecast";
import { cn } from "@/lib/utils";

type Horizon = "24" | "48" | "168";

export function ForecastView() {
  const anchor = useAnchor();
  const city = useCity();
  const [horizon, setHorizon] = useState<Horizon>("24");
  const [metric, setMetric] = useState<"pm" | "aqi">("pm");
  const [hover, setHover] = useState<ForecastDatum | null>(null);

  const h = Number(horizon);
  const data = useMemo(() => {
    if (!anchor) return null;
    const series = forecastSeries(city, anchor, h, h === 168 ? 24 : 12, h === 168 ? 3 : 1);
    const hourly = h === 168 ? forecastSeries(city, anchor, 48, 12, 1) : series;
    const now = series.find((p) => p.lead === 0)!;
    const prev = forecastSeries(city, anchor - 24, 0, 0)[0];
    const w = weatherAt(city, anchor);
    const wPrev = weatherAt(city, anchor - 24);
    const bt = backtest(city, anchor, 72, 24, 1);
    const bt7 = backtest(city, anchor, 24 * 7, 24, 2);
    const stats = {
      model: errorStats(bt7.map((b) => ({ actual: b.actual, pred: b.pred }))),
      cams: errorStats(bt7.map((b) => ({ actual: b.actual, pred: b.cams }))),
      persistence: errorStats(bt7.map((b) => ({ actual: b.actual, pred: b.persistence }))),
    };
    return {
      series,
      hourly,
      now,
      prev,
      w,
      wPrev,
      bt,
      stats,
      insights: forecastInsights(city, anchor, hourly),
      windows: bestWindow(hourly, 3),
    };
  }, [anchor, city, h]);

  const chartData = useMemo(() => (data ? toForecastData(data.series, metric) : []), [data, metric]);
  const skyPm = hover ? (metric === "aqi" ? (data?.series[hover.i]?.pred ?? 60) : (hover.pred ?? hover.actual ?? 60)) : (data?.now.truth ?? 60);
  const nowPm = data?.now.truth ?? 0;
  const cat = categoryForPm(nowPm);

  return (
    <div>
      <PageHero
        sky={{ pm: skyPm, landmark: city.landmark, seed: city.slug.length + 3 }}
        eyebrow={
          <div className="flex items-center gap-2 text-xs font-medium text-fg-muted">
            <span>Forecast</span>
            <span className="text-fg-subtle">/</span>
            <span className="text-fg">{city.name}</span>
          </div>
        }
        title={
          <>
            City <span className="text-gradient">Forecast</span>
          </>
        }
        subtitle="Hour-by-hour PM2.5 with calibrated uncertainty bands. Hover the chart — the sky above follows the forecast."
        aside={
          <div className="glass flex items-center gap-5 rounded-3xl border border-white/40 px-5 py-4 shadow-lift dark:border-white/10">
            <HeroStat icon={<Sun className="size-6 text-amber-500" />} value={data ? `${Math.round(data.w.temp)}°C` : "—"} label={data ? skyLabel(data.w.rh, nowPm) : "…"} />
            <div className="h-10 w-px bg-border-strong" />
            <HeroStat icon={<Droplets className="size-5 text-sky-500" />} value={data ? `${Math.round(data.w.rh)}%` : "—"} label="Humidity" />
            <div className="h-10 w-px bg-border-strong" />
            <HeroStat icon={<Wind className="size-5 text-teal-500" />} value={data ? `${data.w.wind.toFixed(1)} m/s` : "—"} label="Wind" />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <CitySelect size="lg" />
          <Segmented
            value={horizon}
            onChange={(v) => {
              setHorizon(v);
              setHover(null);
            }}
            variant="primary"
            options={[
              { value: "24", label: "24 Hours" },
              { value: "48", label: "48 Hours" },
              { value: "168", label: "7 Days" },
            ]}
          />
        </div>
      </PageHero>

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StaggerItem className="col-span-2 md:col-span-1">
          <Kpi
            icon={<Gauge />}
            label="PM2.5 now"
            value={data ? Math.round(nowPm) : undefined}
            unit="µg/m³"
            tint={cat.color}
            footer={
              data && (
                <>
                  <AqiBadge pm={nowPm} />
                  <Delta value={((nowPm - data.prev.truth) / data.prev.truth) * 100} />
                  <span>vs 24 h</span>
                </>
              )
            }
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<HeartPulse />}
            label="AQI · CPCB"
            value={data ? pmToAqi(nowPm) : undefined}
            tint={cat.color}
            footer={data && <span className="truncate">{cat.impact}</span>}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<Thermometer />}
            label="Temperature"
            value={data ? Number(data.w.temp.toFixed(1)) : undefined}
            digits={1}
            unit="°C"
            tint="#f59e0b"
            footer={data && <WeatherDelta now={data.w.temp} prev={data.wPrev.temp} unit="°C" />}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<Droplets />}
            label="Humidity"
            value={data ? Math.round(data.w.rh) : undefined}
            unit="%"
            tint="#0ea5e9"
            footer={data && <WeatherDelta now={data.w.rh} prev={data.wPrev.rh} unit="%" />}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<Wind />}
            label="Wind speed"
            value={data ? Number(data.w.wind.toFixed(1)) : undefined}
            digits={1}
            unit="m/s"
            tint="#14b8a6"
            footer={
              data && (
                <span className="inline-flex items-center gap-1.5">
                  <Navigation className="size-3.5 text-fg-muted" style={{ transform: `rotate(${(data.w.windDir + 180) % 360}deg)` }} />
                  from {compass(data.w.windDir)} · {data.w.wind < 1.5 ? "stagnant" : data.w.wind < 3.5 ? "light" : "breezy"}
                </span>
              )
            }
          />
        </StaggerItem>
      </Stagger>

      {/* Main chart + category timeline */}
      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader
            title={metric === "pm" ? "PM2.5 forecast" : "AQI forecast"}
            subtitle={data ? `MW-AeroFusion-Net · issued ${fmtDateTime(data.now.t)} · shaded band = P10–P90` : "Loading…"}
            action={
              <Segmented
                size="sm"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: "pm", label: "PM2.5" },
                  { value: "aqi", label: "AQI" },
                ]}
              />
            }
          />
          <Legend
            className="mb-2"
            items={[
              { label: "Forecast (P50)", color: "var(--primary)" },
              { label: "Observed", color: "var(--fg)" },
              { label: "Uncertainty P10–P90", color: "var(--primary)", band: true },
            ]}
          />
          {data ? <ForecastChart data={chartData} metric={metric} height={320} onHover={setHover} daily={h === 168} /> : <Skeleton className="h-[320px]" />}
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Air quality timeline" subtitle="Hourly CPCB category, next 24 hours" icon={<Info className="size-4" />} />
          {data ? <CategoryTimeline series={data.hourly} /> : <Skeleton className="h-40" />}
          <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {AQI_CATEGORIES.map((c) => (
              <div key={c.key} className="rounded-xl bg-surface-sunken/70 px-2 py-1.5 text-center">
                <div className="mx-auto mb-1 h-1.5 w-6 rounded-full" style={{ background: c.color }} />
                <div className="text-[10px] font-semibold text-fg">{c.short}</div>
                <div className="text-[9.5px] tabular text-fg-subtle">
                  {c.pm[0]}–{c.key === "severe" ? "∞" : c.pm[1]}
                </div>
              </div>
            ))}
          </div>
          {data && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <WindowCard tone="good" title="Best window" start={data.windows.best.start.t} end={data.windows.best.end.t} mean={data.windows.best.mean} />
              <WindowCard tone="bad" title="Avoid" start={data.windows.worst.start.t} end={data.windows.worst.end.t} mean={data.windows.worst.mean} />
            </div>
          )}
        </Card>
      </div>

      {/* Hour by hour / daily */}
      <Card className="mt-4 !px-0 !pb-3">
        <div className="px-5 sm:px-6">
          <CardHeader title={h === 168 ? "Day by day" : "Hour by hour"} subtitle={h === 168 ? "Daily range and dominant category" : "Scroll for the full horizon →"} />
        </div>
        {data ? h === 168 ? <DailyStrip series={data.series} /> : <HourStrip series={data.series} /> : <Skeleton className="mx-6 h-28" />}
      </Card>

      {/* Comparison + insights + health */}
      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader
            title="Forecast vs reality"
            subtitle="24 h-ahead backtest over the last 72 h"
            action={<Badge tone="warn">simulated</Badge>}
          />
          <Legend
            className="mb-2"
            items={[
              { label: "MW-AeroFusion-Net", color: "var(--primary)" },
              { label: "CAMS (external)", color: "var(--accent)", dashed: true },
              { label: "Observed", color: "var(--fg)" },
            ]}
          />
          {data ? <BacktestChart bt={data.bt} /> : <Skeleton className="h-[220px]" />}
          {data && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <StatChip label="Ours · MAE" value={data.stats.model.mae} highlight />
              <StatChip label="CAMS · MAE" value={data.stats.cams.mae} />
              <StatChip label="Persistence" value={data.stats.persistence.mae} />
            </div>
          )}
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Key insights" subtitle="Generated from the forecast & attributions" icon={<Gauge className="size-4" />} />
          <div className="space-y-2.5">
            {data
              ? data.insights.map((ins, i) => (
                  <motion.div
                    key={ins.title + city.slug}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i }}
                    className="flex gap-3 rounded-2xl border border-border bg-surface-2 p-3"
                  >
                    <div
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl",
                        ins.tone === "up" && "bg-red-500/10 text-red-500",
                        ins.tone === "down" && "bg-emerald-500/10 text-emerald-600",
                        ins.tone === "warn" && "bg-amber-500/10 text-amber-600",
                        ins.tone === "info" && "bg-sky-500/10 text-sky-600",
                      )}
                    >
                      {ins.tone === "up" ? <ArrowUpRight className="size-4" /> : ins.tone === "down" ? <ArrowDownRight className="size-4" /> : ins.tone === "warn" ? <TriangleAlert className="size-4" /> : <Info className="size-4" />}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold leading-snug text-fg">{ins.title}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-fg-muted">{ins.body}</div>
                    </div>
                  </motion.div>
                ))
              : [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="Health advice" subtitle="Based on CPCB category" icon={<HeartPulse className="size-4" />} />
          <AnimatePresence mode="wait">
            <motion.div key={cat.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div
                className="rounded-2xl p-3.5"
                style={{ background: `color-mix(in oklab, ${cat.color} 12%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${cat.color} 25%, transparent)` }}
              >
                <div className="text-xs font-semibold" style={{ color: cat.ink }}>
                  Current risk: {cat.label}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-fg-muted">{cat.impact}</div>
              </div>
              <ul className="mt-3 space-y-2">
                {cat.advice.map((a) => (
                  <li key={a} className="flex items-start gap-2.5 text-[13px] text-fg">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    {a}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}

function skyLabel(rh: number, pm: number) {
  if (pm > 120) return "Smoggy";
  if (pm > 60) return "Hazy";
  if (rh > 80) return "Humid";
  return "Clear sky";
}

function compass(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <div>
        <div className="font-display text-lg font-bold leading-none text-fg tabular">{value}</div>
        <div className="mt-1 text-[11px] text-fg-muted">{label}</div>
      </div>
    </div>
  );
}

function WeatherDelta({ now, prev, unit }: { now: number; prev: number; unit: string }) {
  const d = now - prev;
  return (
    <span className="tabular">
      {d >= 0 ? "↑" : "↓"} {Math.abs(d).toFixed(1)}
      {unit} vs yesterday
    </span>
  );
}

function CategoryTimeline({ series }: { series: { lead: number; pred: number; t: number }[] }) {
  const f = series.filter((p) => p.lead > 0 && p.lead <= 24);
  const max = Math.max(...f.map((p) => p.pred), 1);
  return (
    <div>
      <div className="flex h-36 items-end gap-[3px]">
        {f.map((p, i) => {
          const c = categoryForPm(p.pred);
          return (
            <motion.div
              key={p.t}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.018, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex-1 origin-bottom rounded-t-[5px]"
              style={{ height: `${Math.max(8, (p.pred / max) * 100)}%`, background: `linear-gradient(to top, color-mix(in oklab, ${c.color} 55%, transparent), ${c.color})` }}
            >
              <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-fg px-2 py-1 text-[10px] font-semibold text-bg opacity-0 transition group-hover:opacity-100">
                {fmtHour(p.t)} · {Math.round(p.pred)}
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-fg-subtle">
        <span>Now</span>
        <span>+6h</span>
        <span>+12h</span>
        <span>+18h</span>
        <span>+24h</span>
      </div>
    </div>
  );
}

function WindowCard({ tone, title, start, end, mean }: { tone: "good" | "bad"; title: string; start: number; end: number; mean: number }) {
  const c = categoryForPm(mean);
  return (
    <div className={cn("rounded-2xl border p-3", tone === "good" ? "border-emerald-500/20 bg-emerald-500/[0.06]" : "border-red-500/20 bg-red-500/[0.05]")}>
      <div className={cn("text-[11px] font-semibold", tone === "good" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>{title}</div>
      <div className="mt-1 font-display text-sm font-bold text-fg">
        {fmtHour(start)} – {fmtHour(end + 1)}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
        <span className="size-1.5 rounded-full" style={{ background: c.color }} />~{Math.round(mean)} µg/m³
      </div>
    </div>
  );
}

function HourStrip({ series }: { series: { lead: number; pred: number; t: number; wind: number; temp: number }[] }) {
  const f = series.filter((p) => p.lead >= 0);
  return (
    <div className="scrollbar-thin flex gap-2.5 overflow-x-auto px-5 pb-3 sm:px-6">
      {f.map((p, i) => {
        const c = categoryForPm(p.pred);
        return (
          <motion.div
            key={p.t}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 20) * 0.02 }}
            className={cn(
              "flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface-2 px-2 py-3 transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card",
              p.lead === 0 && "border-primary/40 bg-primary-soft",
            )}
          >
            <div className="text-[11px] font-medium text-fg-muted">{p.lead === 0 ? "Now" : fmtHour(p.t)}</div>
            <div className="relative grid size-9 place-items-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--surface-sunken)" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15" fill="none" stroke={c.color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${Math.min(1, p.pred / 250) * 94.2} 94.2`} />
              </svg>
              <span className="text-[11px] font-bold tabular text-fg">{Math.round(p.pred)}</span>
            </div>
            <div className="text-[10px] font-semibold" style={{ color: c.ink }}>
              {c.short}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-fg-subtle tabular">
              <Wind className="size-3" />
              {p.wind.toFixed(1)}
            </div>
            <div className="text-[10px] text-fg-subtle tabular">{Math.round(p.temp)}°</div>
          </motion.div>
        );
      })}
    </div>
  );
}

function DailyStrip({ series }: { series: { lead: number; pred: number; t: number }[] }) {
  const f = series.filter((p) => p.lead > 0);
  const days: { t: number; min: number; max: number; mean: number }[] = [];
  for (let d = 0; d < 7; d++) {
    const chunk = f.filter((p) => p.lead > d * 24 && p.lead <= (d + 1) * 24);
    if (!chunk.length) continue;
    const vals = chunk.map((p) => p.pred);
    days.push({ t: chunk[0].t, min: Math.min(...vals), max: Math.max(...vals), mean: vals.reduce((a, b) => a + b, 0) / vals.length });
  }
  const gmax = Math.max(...days.map((d) => d.max), 1);
  return (
    <div className="grid gap-2 px-5 pb-3 sm:px-6">
      {days.map((d, i) => {
        const c = categoryForPm(d.mean);
        return (
          <motion.div
            key={d.t}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[72px_1fr_88px] items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-sunken/60 sm:grid-cols-[110px_1fr_120px]"
          >
            <div className="text-sm font-medium text-fg">
              {i === 0 ? "Tomorrow" : fmtWeekday(d.t)} <span className="text-xs text-fg-subtle">{fmtDay(d.t)}</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-surface-sunken">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.6 }}
                className="absolute inset-y-0 origin-left rounded-full"
                style={{
                  left: `${(d.min / gmax) * 100}%`,
                  width: `${((d.max - d.min) / gmax) * 100}%`,
                  background: `linear-gradient(90deg, ${categoryForPm(d.min).color}, ${categoryForPm(d.max).color})`,
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-2 text-xs tabular text-fg-muted">
              {Math.round(d.min)}–{Math.round(d.max)}
              <span className="size-2 rounded-full" style={{ background: c.color }} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function BacktestChart({ bt }: { bt: { t: number; actual: number; pred: number; cams: number }[] }) {
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={bt} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey="t" tickFormatter={(t: number) => fmtHour(t)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={36} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { t: number; actual: number; pred: number; cams: number };
              return (
                <ChartTip
                  title={`${fmtDay(d.t)} · ${fmtHour(d.t)}`}
                  rows={[
                    { label: "Observed", value: Math.round(d.actual), color: "var(--fg)" },
                    { label: "Ours (24 h ahead)", value: Math.round(d.pred), color: "var(--primary)" },
                    { label: "CAMS", value: Math.round(d.cams), color: "var(--accent)", dashed: true },
                  ]}
                />
              );
            }}
          />
          <Line type="monotone" dataKey="actual" stroke="var(--fg)" strokeOpacity={0.7} strokeWidth={1.8} dot={false} />
          <Line type="monotone" dataKey="cams" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
          <Line type="monotone" dataKey="pred" stroke="var(--primary)" strokeWidth={2.4} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatChip({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border px-3 py-2", highlight ? "border-primary/30 bg-primary-soft" : "border-border bg-surface-2")}>
      <div className="text-[10.5px] text-fg-muted">{label}</div>
      <div className={cn("font-display text-base font-bold", highlight ? "text-primary" : "text-fg")}>
        <AnimatedNumber value={value} digits={1} />
        <span className="ml-0.5 text-[10px] font-medium text-fg-subtle">µg/m³</span>
      </div>
    </div>
  );
}
