"use client";

import { ArrowRight, BarChart3, Download, FileJson, FileSpreadsheet, FileText, Leaf, Printer, ShieldAlert, TrendingDown, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTip, Legend } from "@/components/charts/chart-tooltip";
import { Sparkline } from "@/components/charts/sparkline";
import { GlassNote, PageHero } from "@/components/layout/page-hero";
import { AtmosMap, HeatLegend } from "@/components/map/atmos-map";
import { AqiBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CitySelect } from "@/components/ui/city-select";
import { Kpi } from "@/components/ui/kpi";
import { Delta, Skeleton } from "@/components/ui/primitives";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { PillTabs, Segmented } from "@/components/ui/segmented";
import { useAnchor } from "@/hooks/use-anchor";
import { useAppStore } from "@/hooks/use-app-store";
import { useCity } from "@/hooks/use-city";
import { categoryForPm, NAAQS_PM25_24H, pmColor, pmToAqi, WHO_PM25_24H } from "@/lib/aqi";
import { CITIES, type City } from "@/lib/cities";
import { fmtDateTime, fmtDay, fmtMonthYear } from "@/lib/format";
import { DATA_MODE } from "@/lib/nav";
import { pmAt } from "@/lib/sim/core";
import { attribution, FEATURE_BY_KEY, type FeatureKey } from "@/lib/sim/explain";
import { forecastSeries } from "@/lib/sim/forecast";
import { cityDaily, monthlyNational } from "@/lib/sim/national";
import { cn, downloadFile } from "@/lib/utils";

type Tab = "overview" | "city" | "trends" | "downloads";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function mean30(c: City, anchor: number, offsetDays = 0) {
  let s = 0;
  let n = 0;
  for (let h = 0; h < 30 * 24; h += 4) {
    s += pmAt(c, anchor - offsetDays * 24 - h);
    n++;
  }
  return s / n;
}

export function ReportsView() {
  const anchor = useAnchor();
  const [tab, setTab] = useState<Tab>("overview");

  const summary = useMemo(() => {
    if (anchor === null) return null;
    const rows = CITIES.map((c) => {
      const m = mean30(c, anchor);
      const prev = mean30(c, anchor, 30);
      const spark = cityDaily(c, anchor, 30).map((d) => d.pm);
      return { city: c, m, prev, change: ((m - prev) / prev) * 100, spark, now: pmAt(c, anchor) };
    });
    const avg = rows.reduce((s, r) => s + r.m, 0) / rows.length;
    const prevAvg = rows.reduce((s, r) => s + r.prev, 0) / rows.length;
    const improving = rows.filter((r) => r.change < 0).length;
    const aboveWho = rows.filter((r) => r.m > WHO_PM25_24H).length;
    const exposed = rows.filter((r) => r.m > NAAQS_PM25_24H).reduce((s, r) => s + r.city.pop, 0);
    return { rows: rows.sort((a, b) => b.m - a.m), avg, change: ((avg - prevAvg) / prevAvg) * 100, improving, aboveWho, exposed };
  }, [anchor]);

  return (
    <div>
      <PageHero
        sky={{ pm: summary?.avg ?? 60, landmark: "victoria", seed: 17 }}
        title={
          <>
            Reports & <span className="text-gradient">Insights</span>
          </>
        }
        subtitle="Trends, rankings and city-level analyses — exportable for decision-makers."
        aside={<GlassNote icon={<BarChart3 />}>Actionable insights for a cleaner, healthier tomorrow.</GlassNote>}
      >
        <PillTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "city", label: "City reports" },
            { value: "trends", label: "Trend analysis" },
            { value: "downloads", label: "Download reports" },
          ]}
        />
      </PageHero>

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StaggerItem>
          <Kpi
            icon={<Leaf />}
            label="Average PM2.5 · 30 days"
            value={summary ? Math.round(summary.avg) : undefined}
            unit="µg/m³"
            tint="#10b981"
            footer={summary && (<><Delta value={summary.change} /> <span>vs previous 30 days</span></>)}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi icon={<TrendingDown />} label="Cities improving" value={summary?.improving} unit={`/ ${CITIES.length}`} tint="#0ea5e9" footer={<span>30-day mean below previous period</span>} />
        </StaggerItem>
        <StaggerItem>
          <Kpi icon={<ShieldAlert />} label="Above WHO guideline (15)" value={summary?.aboveWho} unit={`/ ${CITIES.length}`} tint="#ef4444" footer={<span>30-day mean vs WHO 24-h AQG</span>} />
        </StaggerItem>
        <StaggerItem>
          <Kpi icon={<Users />} label="People above NAAQS" value={summary ? Number(summary.exposed.toFixed(1)) : undefined} digits={1} unit="million" tint="#f97316" footer={<span>30-day mean &gt; 60 µg/m³</span>} />
        </StaggerItem>
      </Stagger>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-4">
          {tab === "overview" && anchor !== null && summary && <Overview anchor={anchor} summary={summary} />}
          {tab === "city" && anchor !== null && <CityReport anchor={anchor} />}
          {tab === "trends" && anchor !== null && <Trends anchor={anchor} />}
          {tab === "downloads" && anchor !== null && summary && <Downloads anchor={anchor} rows={summary.rows} />}
          {anchor === null && <Skeleton className="h-96" />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface SummaryRow {
  city: City;
  m: number;
  prev: number;
  change: number;
  spark: number[];
  now: number;
}

interface Summary {
  rows: SummaryRow[];
  avg: number;
}

function Overview({ anchor, summary }: { anchor: number; summary: Summary }) {
  const setCity = useAppStore((s) => s.setCity);
  const top = summary.rows.slice(0, 10);
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-12">
        <Card padded={false} className="relative h-[480px] overflow-hidden xl:col-span-5">
          <div className="absolute left-5 top-4 z-10">
            <div className="font-display text-base font-semibold text-fg">India air quality overview</div>
            <div className="text-xs text-fg-muted">30-day mean PM2.5 by city</div>
          </div>
          <AtmosMap
            t={anchor}
            cities={summary.rows.map((r) => ({ slug: r.city.slug, name: r.city.name, lat: r.city.lat, lon: r.city.lon, value: r.m }))}
            onSelect={setCity}
            padding={36}
          />
          <div className="absolute bottom-4 right-4 z-10">
            <HeatLegend title="PM2.5 (µg/m³)" />
          </div>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader title="Top 10 most polluted" subtitle="30-day mean, µg/m³" />
          <div className="space-y-2">
            {top.map((r, i) => (
              <div key={r.city.slug} className="grid grid-cols-[18px_88px_1fr_34px] items-center gap-2 text-xs">
                <span className="font-semibold text-fg-subtle">{i + 1}</span>
                <span className="truncate font-medium text-fg">{r.city.name}</span>
                <div className="h-4 overflow-hidden rounded-md bg-surface-sunken/70">
                  <motion.div
                    className="h-full rounded-md"
                    style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${pmColor(r.m)} 60%, transparent), ${pmColor(r.m)})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.m / top[0].m) * 100}%` }}
                    transition={{ delay: i * 0.04, duration: 0.7 }}
                  />
                </div>
                <span className="text-right font-semibold tabular text-fg">{Math.round(r.m)}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="xl:col-span-4">
          <CityTrend anchor={anchor} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader title="City-wise summary" subtitle="Current, 30-day mean and trend" />
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-fg-subtle">
                  <th className="px-2 pb-2 font-semibold">City</th>
                  <th className="px-2 pb-2 text-right font-semibold">30-d PM2.5</th>
                  <th className="px-2 pb-2 text-right font-semibold">AQI</th>
                  <th className="px-2 pb-2 font-semibold">Status</th>
                  <th className="px-2 pb-2 font-semibold">Trend (30 d)</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.slice(0, 8).map((r) => (
                  <tr key={r.city.slug} className="border-t border-border">
                    <td className="px-2 py-2 font-medium text-fg">{r.city.name}</td>
                    <td className="px-2 py-2 text-right tabular text-fg">{Math.round(r.m)}</td>
                    <td className="px-2 py-2 text-right tabular text-fg-muted">{pmToAqi(r.m)}</td>
                    <td className="px-2 py-2">
                      <AqiBadge pm={r.m} size="xs" />
                    </td>
                    <td className="px-2 py-2">
                      <Sparkline values={r.spark} width={96} height={24} color={categoryForPm(r.m).color} dot={false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="xl:col-span-7">
          <MonthlyTrend anchor={anchor} />
        </div>
      </div>
    </div>
  );
}

function CityTrend({ anchor }: { anchor: number }) {
  const city = useCity();
  const [range, setRange] = useState<"7" | "30" | "180" | "365">("30");
  const data = useMemo(() => {
    const days = Number(range);
    const d = cityDaily(city, anchor, days);
    const k = Math.max(1, Math.round(d.length / 30));
    return d.map((p, i) => {
      const win = d.slice(Math.max(0, i - k), i + 1);
      return { ...p, smooth: win.reduce((s, x) => s + x.pm, 0) / win.length };
    });
  }, [anchor, city, range]);
  return (
    <Card className="h-full">
      <CardHeader title="City trend analysis" subtitle={`${city.name} · daily mean`} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CitySelect />
      <Segmented
        size="sm"
        value={range}
        onChange={setRange}
        variant="primary"
        options={[
          { value: "7", label: "7D" },
          { value: "30", label: "30D" },
          { value: "180", label: "6M" },
          { value: "365", label: "1Y" },
        ]}
      />
      </div>
      <Legend
        className="mb-2"
        items={[
          { label: "Daily mean", color: "var(--primary)" },
          { label: "Rolling mean", color: "var(--accent)", dashed: true },
          { label: "NAAQS 60", color: "#ef4444", dashed: true },
        ]}
      />
      <div className="h-[290px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <defs>
              <linearGradient id="ct-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--primary)" stopOpacity={0.28} />
                <stop offset="1" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="t" tickFormatter={(t: number) => (Number(range) > 60 ? fmtMonthYear(t) : fmtDay(t))} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={34} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { t: number; pm: number };
                return <ChartTip title={fmtDay(d.t)} rows={[{ label: "Daily mean", value: `${Math.round(d.pm)} µg/m³`, color: "var(--primary)" }]} footer={categoryForPm(d.pm).label} />;
              }}
            />
            <ReferenceLine y={NAAQS_PM25_24H} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.7} />
            <Area type="monotone" dataKey="pm" stroke="var(--primary)" strokeWidth={2} fill="url(#ct-fill)" animationDuration={800} />
            <Line type="monotone" dataKey="smooth" stroke="var(--accent)" strokeDasharray="5 4" strokeWidth={1.6} dot={false} animationDuration={800} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function MonthlyTrend({ anchor }: { anchor: number }) {
  const year = new Date(anchor * 3_600_000).getUTCFullYear();
  const currentMonth = new Date(anchor * 3_600_000).getUTCMonth();
  const data = useMemo(() => {
    const a = monthlyNational(year - 1);
    const b = monthlyNational(year);
    return MONTHS.map((m, i) => ({ m, prev: a[i].pm, cur: i <= currentMonth ? b[i].pm : null }));
  }, [year, currentMonth]);
  return (
    <Card className="h-full">
      <CardHeader title={`Monthly trend · ${CITIES.length} cities`} subtitle="Average PM2.5 by month" action={<Badge tone={DATA_MODE === "demo" ? "warn" : "primary"}>{DATA_MODE === "demo" ? "simulated" : "observed"}</Badge>} />
      <Legend
        className="mb-2"
        items={[
          { label: String(year - 1), color: "color-mix(in oklab, var(--primary) 40%, transparent)" },
          { label: String(year), color: "var(--primary)" },
          { label: "WHO 15", color: "#ef4444", dashed: true },
        ]}
      />
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }} barGap={2}>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="m" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              cursor={{ fill: "var(--surface-sunken)", opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { m: string; prev: number; cur: number | null };
                return (
                  <ChartTip
                    title={d.m}
                    rows={[
                      { label: String(year - 1), value: `${Math.round(d.prev)} µg/m³` },
                      ...(d.cur !== null ? [{ label: String(year), value: `${Math.round(d.cur)} µg/m³`, color: "var(--primary)" }] : []),
                    ]}
                  />
                );
              }}
            />
            <ReferenceLine y={WHO_PM25_24H} stroke="#ef4444" strokeDasharray="5 5" />
            <Bar dataKey="prev" fill="color-mix(in oklab, var(--primary) 32%, transparent)" radius={[6, 6, 2, 2]} barSize={14} animationDuration={800} />
            <Bar dataKey="cur" fill="var(--primary)" radius={[6, 6, 2, 2]} barSize={14} animationDuration={900} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function CityReport({ anchor }: { anchor: number }) {
  const city = useCity();
  const r = useMemo(() => {
    const days = cityDaily(city, anchor, 30);
    const vals = days.map((d) => d.pm);
    const meanV = vals.reduce((a, b) => a + b, 0) / vals.length;
    const worst = days.reduce((m, d) => (d.pm > m.pm ? d : m), days[0]);
    const best = days.reduce((m, d) => (d.pm < m.pm ? d : m), days[0]);
    const above = days.filter((d) => d.pm > NAAQS_PM25_24H).length;
    const acc: Record<string, number> = {};
    for (let k = 0; k < 30 * 24; k += 12) {
      const a = attribution(city, anchor - k);
      for (const [f, v] of Object.entries(a.values)) acc[f] = (acc[f] ?? 0) + Math.max(0, v);
    }
    const drivers = (Object.entries(acc) as [FeatureKey, number][]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tot = drivers.reduce((s, d) => s + d[1], 0) || 1;
    const fc = forecastSeries(city, anchor, 48, 0, 1);
    const peak = Math.max(...fc.map((p) => p.pred));
    return { days, meanV, worst, best, above, drivers: drivers.map(([k, v]) => ({ k, share: (v / tot) * 100 })), peak };
  }, [anchor, city]);
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-8" id="city-report">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">City air-quality report</div>
            <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-fg">{city.name}</h2>
            <div className="text-sm text-fg-muted">
              {city.state} · last 30 days · generated {fmtDateTime(anchor)}
            </div>
          </div>
          <div className="no-print flex gap-2">
            <CitySelect />
            <Button variant="secondary" size="md" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <ReportStat label="30-day mean" value={`${Math.round(r.meanV)}`} unit="µg/m³" color={categoryForPm(r.meanV).color} />
          <ReportStat label="Days above NAAQS" value={`${r.above}`} unit="/ 30" color="#f97316" />
          <ReportStat label="Worst day" value={`${Math.round(r.worst.pm)}`} unit={fmtDay(r.worst.t)} color="#ef4444" />
          <ReportStat label="Cleanest day" value={`${Math.round(r.best.pm)}`} unit={fmtDay(r.best.t)} color="#10b981" />
        </div>
        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold text-fg">Daily mean PM2.5</div>
          <div className="flex h-36 items-end gap-1">
            {r.days.map((d, i) => (
              <motion.div
                key={d.t}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.015 }}
                className="group relative flex-1 origin-bottom rounded-t-[4px]"
                style={{ height: `${(d.pm / r.worst.pm) * 100}%`, background: categoryForPm(d.pm).color }}
              >
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-1.5 py-0.5 text-[10px] text-bg group-hover:block">
                  {fmtDay(d.t)} · {Math.round(d.pm)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <div className="text-sm font-semibold text-fg">Main contributors (30 d)</div>
            <div className="mt-3 space-y-2">
              {r.drivers.map((d) => (
                <div key={d.k} className="grid grid-cols-[1fr_44px] items-center gap-2 text-xs">
                  <div>
                    <div className="mb-1 text-fg-muted">{FEATURE_BY_KEY[d.k].label}</div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                      <motion.div className="h-full rounded-full" style={{ background: FEATURE_BY_KEY[d.k].color }} initial={{ width: 0 }} animate={{ width: `${d.share}%` }} />
                    </div>
                  </div>
                  <span className="text-right font-semibold tabular text-fg">{d.share.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2 p-4 text-[13px] leading-relaxed text-fg-muted">
            <div className="text-sm font-semibold text-fg">Summary</div>
            <p className="mt-2">
              {city.name} averaged <b className="text-fg">{Math.round(r.meanV)} µg/m³</b> ({categoryForPm(r.meanV).label}) over the last 30 days, exceeding the NAAQS on{" "}
              <b className="text-fg">{r.above}</b> days. The largest positive contributor was <b className="text-fg">{FEATURE_BY_KEY[r.drivers[0].k].short.toLowerCase()}</b>. The next 48 h
              are forecast to peak at <b className="text-fg">{Math.round(r.peak)} µg/m³</b>.
            </p>
            {DATA_MODE === "demo" && <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">Demo data — values are simulated.</p>}
          </div>
        </div>
      </Card>
      <Card className="xl:col-span-4">
        <CardHeader title="Seasonal fingerprint" subtitle={`${city.name} · mean PM2.5 by month × hour (last 12 months)`} />
        <Fingerprint anchor={anchor} city={city} />
      </Card>
    </div>
  );
}

function ReportStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
        <span className="size-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold text-fg tabular">{value}</div>
      <div className="text-[11px] text-fg-subtle">{unit}</div>
    </div>
  );
}

function Fingerprint({ anchor, city }: { anchor: number; city: City }) {
  const grid = useMemo(() => {
    const out: number[][] = Array.from({ length: 12 }, () => Array(12).fill(0));
    const cnt: number[][] = Array.from({ length: 12 }, () => Array(12).fill(0));
    for (let k = 0; k < 365 * 24; k += 7) {
      const t = anchor - k;
      const d = new Date((t + 5.5) * 3_600_000);
      const m = d.getUTCMonth();
      const h = Math.floor(d.getUTCHours() / 2);
      out[m][h] += pmAt(city, t);
      cnt[m][h]++;
    }
    return out.map((row, i) => row.map((v, j) => (cnt[i][j] ? v / cnt[i][j] : 0)));
  }, [anchor, city]);
  return (
    <div>
      <div className="grid grid-cols-[28px_1fr] gap-2">
        <div className="grid gap-[3px]">
          {MONTHS.map((m) => (
            <span key={m} className="flex items-center text-[10px] text-fg-subtle">
              {m}
            </span>
          ))}
        </div>
        <div className="grid gap-[3px]">
          {grid.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-[3px]">
              {row.map((v, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (i * 12 + j) * 0.002 }}
                  title={`${MONTHS[i]} · ${String(j * 2).padStart(2, "0")}:00 — ${Math.round(v)} µg/m³`}
                  className="aspect-square rounded-[3px]"
                  style={{ background: pmColor(v) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-[28px_1fr] gap-2 text-[10px] text-fg-subtle">
        <span />
        <div className="flex justify-between">
          <span>00h</span>
          <span>06h</span>
          <span>12h</span>
          <span>18h</span>
          <span>22h</span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-fg-muted">Winter nights light up as the boundary layer collapses; monsoon months stay green.</p>
    </div>
  );
}

function Trends({ anchor }: { anchor: number }) {
  const [sel, setSel] = useState<string[]>(["delhi", "mumbai", "kolkata", "bengaluru"]);
  const colors = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981"];
  const data = useMemo(() => {
    const series = sel.map((s) => cityDaily(CITIES.find((c) => c.slug === s)!, anchor, 180));
    return series[0].map((p, i) => ({ t: p.t, ...Object.fromEntries(sel.map((s, k) => [s, series[k][i].pm])) }));
  }, [anchor, sel]);
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-9">
        <CardHeader title="Multi-city comparison" subtitle="Daily mean PM2.5, last 6 months — pick up to 4 cities" />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CITIES.map((c) => {
            const idx = sel.indexOf(c.slug);
            return (
              <button
                key={c.slug}
                onClick={() =>
                  setSel((s) => (s.includes(c.slug) ? (s.length > 1 ? s.filter((x) => x !== c.slug) : s) : s.length < 4 ? [...s, c.slug] : [...s.slice(1), c.slug]))
                }
                className={cn("rounded-lg border px-2 py-1 text-[11px] font-medium transition", idx >= 0 ? "border-transparent text-white" : "border-border text-fg-muted hover:text-fg")}
                style={idx >= 0 ? { background: colors[idx] } : undefined}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 6" />
              <XAxis dataKey="t" tickFormatter={(t: number) => fmtMonthYear(t)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as Record<string, number>;
                  return <ChartTip title={fmtDay(d.t)} rows={sel.map((s, k) => ({ label: CITIES.find((c) => c.slug === s)!.name, value: Math.round(d[s]), color: colors[k] }))} />;
                }}
              />
              <ReferenceLine y={NAAQS_PM25_24H} stroke="var(--fg-subtle)" strokeDasharray="5 5" />
              {sel.map((s, k) => (
                <Line key={s} type="monotone" dataKey={s} stroke={colors[k]} strokeWidth={2} dot={false} animationDuration={700} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="xl:col-span-3">
        <CardHeader title="Season ranking" subtitle="Monthly national mean, this year" />
        <SeasonRank anchor={anchor} />
      </Card>
    </div>
  );
}

function SeasonRank({ anchor }: { anchor: number }) {
  const year = new Date(anchor * 3_600_000).getUTCFullYear();
  const data = useMemo(() => monthlyNational(year - 1).map((d) => ({ ...d, label: MONTHS[d.month] })).sort((a, b) => b.pm - a.pm), [year]);
  const max = data[0].pm;
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div key={d.label} className="grid grid-cols-[32px_1fr_32px] items-center gap-2 text-xs">
          <span className="text-fg-muted">{d.label}</span>
          <div className="h-3 overflow-hidden rounded bg-surface-sunken/70">
            <motion.div className="h-full rounded" style={{ background: pmColor(d.pm) }} initial={{ width: 0 }} animate={{ width: `${(d.pm / max) * 100}%` }} transition={{ delay: i * 0.03 }} />
          </div>
          <span className="text-right font-semibold tabular text-fg">{Math.round(d.pm)}</span>
        </div>
      ))}
      <p className="pt-2 text-[11px] text-fg-subtle">{year - 1}, all tracked cities.</p>
    </div>
  );
}

function Downloads({ anchor, rows }: { anchor: number; rows: Summary["rows"] }) {
  const city = useCity();
  const stamp = new Date().toISOString().slice(0, 10);
  const items = [
    {
      title: "City-wise air quality summary",
      desc: "30-day mean, AQI, status and change for all cities",
      icon: <FileSpreadsheet />,
      ext: "CSV",
      run: () => {
        const header = "city,state,pm25_30d_mean,aqi,category,change_vs_prev_30d_pct,pm25_now";
        const lines = rows.map((r) =>
          [r.city.name, r.city.state, r.m.toFixed(1), pmToAqi(r.m), categoryForPm(r.m).label, r.change.toFixed(1), r.now.toFixed(1)].join(","),
        );
        downloadFile(`aerofusion-city-summary-${stamp}.csv`, [header, ...lines].join("\n"), "text/csv");
      },
    },
    {
      title: `${city.name} 48-hour forecast`,
      desc: "Hourly P10 / P50 / P90 with weather drivers",
      icon: <FileJson />,
      ext: "JSON",
      run: () => {
        const s = forecastSeries(city, anchor, 48, 0, 1).map((p) => ({
          time_utc: new Date(p.t * 3_600_000).toISOString(),
          lead_h: p.lead,
          p10: +p.p10.toFixed(1),
          p50: +p.pred.toFixed(1),
          p90: +p.p90.toFixed(1),
          temp_c: +p.temp.toFixed(1),
          rh_pct: +p.rh.toFixed(0),
          wind_ms: +p.wind.toFixed(1),
        }));
        downloadFile(
          `aerofusion-forecast-${city.slug}-${stamp}.json`,
          JSON.stringify({ city: city.name, model: "MW-AeroFusion-Net", data_mode: DATA_MODE, issued_utc: new Date(anchor * 3_600_000).toISOString(), forecast: s }, null, 2),
          "application/json",
        );
      },
    },
    {
      title: `${city.name} attributions`,
      desc: "Per-feature contributions for the current hour",
      icon: <FileSpreadsheet />,
      ext: "CSV",
      run: () => {
        const a = attribution(city, anchor);
        const lines = Object.entries(a.values).map(([k, v]) => `${FEATURE_BY_KEY[k as FeatureKey].label},${v.toFixed(2)}`);
        downloadFile(`aerofusion-attributions-${city.slug}-${stamp}.csv`, ["feature,contribution_ugm3", `base_value,${a.baseValue}`, ...lines, `prediction,${a.prediction.toFixed(2)}`].join("\n"), "text/csv");
      },
    },
    {
      title: "Data sources & methodology",
      desc: "Sources, preprocessing, model and integrity notes",
      icon: <FileText />,
      ext: "MD",
      run: () => {
        const md = `# AeroFusion — methodology\n\nGenerated ${new Date().toISOString()}\n\n## Data mode\n${DATA_MODE === "demo" ? "DEMO — all values in this export are produced by a deterministic simulator for UI development. They are not observations or model outputs." : "API — values served by the AeroFusion backend."}\n\n## Sources\n- CPCB CAAQMS via OpenAQ v3 (target)\n- ERA5 reanalysis via Open-Meteo (meteorology)\n- NASA FIRMS VIIRS/MODIS (fires)\n- Calendar/festival proxies (traffic activity)\n- WorldPop, ESA WorldCover, OSM, EDGAR (static)\n- CAMS (benchmark only)\n\n## Model\nMW-AeroFusion-Net: causal wavelet branch, adaptive diffusion graph, ConvLSTM on a 32×32 raster, Transformer encoder (causal mask), causal attention feature gate, quantile heads (P10/P50/P90) for t+1, t+24, t+48.\n\n## Evaluation\nChronological split; MAE, RMSE, R², spike-hour and AQI-category accuracy, always against persistence.\n`;
        downloadFile(`aerofusion-methodology-${stamp}.md`, md, "text/markdown");
      },
    },
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-7">
        <CardHeader title="Download reports" subtitle="Generated in your browser from the data shown in the app" icon={<Download className="size-4" />} />
        <div className="space-y-2">
          {items.map((it, i) => (
            <motion.button
              key={it.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => {
                it.run();
                toast.success(`${it.title} downloaded`, { description: DATA_MODE === "demo" ? "Contains simulated demo data." : undefined });
              }}
              className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-surface-2 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-red-500/10 text-red-500 [&_svg]:size-5">{it.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-fg">{it.title}</span>
                <span className="block text-xs text-fg-muted">
                  {it.desc} · <span className="font-mono">{it.ext}</span>
                </span>
              </span>
              <span className="grid size-9 place-items-center rounded-xl border border-border text-fg-muted transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-fg">
                <Download className="size-4" />
              </span>
            </motion.button>
          ))}
        </div>
      </Card>
      <Card className="xl:col-span-5">
        <CardHeader title="Printable city report" subtitle="Opens the City reports tab and your browser's print dialog" icon={<Printer className="size-4" />} />
        <p className="text-[13px] leading-relaxed text-fg-muted">
          City reports use a print stylesheet: navigation and controls are hidden, charts keep their colours. Save as PDF from the print dialog to attach the report to your
          project documentation (Appendix A).
        </p>
        <div className="mt-4 rounded-2xl bg-primary-soft p-4 text-sm text-fg">
          <div className="font-semibold">Tip</div>
          <div className="mt-1 text-[13px] text-fg-muted">
            Switch to <b>City reports</b>, choose a city, then press <b>Print</b>.
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-fg-subtle">
          <ArrowRight className="size-3.5" /> All exports state their data mode.
        </div>
      </Card>
    </div>
  );
}
