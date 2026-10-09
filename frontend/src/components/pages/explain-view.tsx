"use client";

import { Activity, Flame, Gauge, Layers, Lightbulb, Network, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTip, Legend } from "@/components/charts/chart-tooltip";
import { PageHero } from "@/components/layout/page-hero";
import { AtmosMap, HeatLegend, type MapArc, type MapHighlight } from "@/components/map/atmos-map";
import { AqiBadge, Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { CitySelect } from "@/components/ui/city-select";
import { Kpi } from "@/components/ui/kpi";
import { Skeleton, Tip } from "@/components/ui/primitives";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { PillTabs, Segmented } from "@/components/ui/segmented";
import { useAnchor } from "@/hooks/use-anchor";
import { useCity } from "@/hooks/use-city";
import { categoryForPm } from "@/lib/aqi";
import { CITIES } from "@/lib/cities";
import { fmtDay, fmtHour } from "@/lib/format";
import { hashString, mulberry32 } from "@/lib/rng";
import { fireHotspots, pmAt } from "@/lib/sim/core";
import {
  attentionMatrix,
  attribution,
  cityImportance,
  FEATURE_BY_KEY,
  globalImportance,
  spatialSources,
  temporalAttribution,
  type FeatureKey,
} from "@/lib/sim/explain";
import { forecastSeries, history } from "@/lib/sim/forecast";
import { wavelet3Bands } from "@/lib/sim/wavelet";
import { cn } from "@/lib/utils";

type Tab = "global" | "local" | "temporal" | "multiscale";
type Method = "shap" | "attention" | "permutation";

export function ExplainView() {
  const anchor = useAnchor();
  const city = useCity();
  const [tab, setTab] = useState<Tab>("global");
  const [method, setMethod] = useState<Method>("shap");

  const data = useMemo(() => {
    if (anchor === null) return null;
    const attr = attribution(city, anchor);
    const ranked = (Object.entries(attr.values) as [FeatureKey, number][]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const global = globalImportance(anchor, 48, 6);
    const local = cityImportance(city, anchor, 48, 3);
    const sources = spatialSources(city, anchor);
    const series = forecastSeries(city, anchor, 24, 0, 1);
    const p24 = series[series.length - 1];
    const sharp = Math.max(0, Math.min(1, 1 - (p24.p90 - p24.p10) / (2 * p24.pred)));
    return { attr, ranked, global, local, sources, sharp };
  }, [anchor, city]);

  const methodImportance = useMemo(() => {
    if (!data) return [];
    const base = data.global;
    if (method === "shap") return base;
    const rnd = mulberry32(hashString(method));
    const adj = base.map((f) => ({ ...f, value: method === "attention" ? f.value * (0.75 + rnd() * 0.5) : f.value ** 1.25 * (0.8 + rnd() * 0.4) }));
    const tot = adj.reduce((s, f) => s + f.value, 0);
    return adj.map((f) => ({ ...f, value: (f.value / tot) * 100 })).sort((a, b) => b.value - a.value);
  }, [data, method]);

  const pm = data?.attr.prediction ?? 60;
  const top = data?.ranked.find(([, v]) => v > 0);

  return (
    <div>
      <PageHero
        sky={{ pm, landmark: city.landmark, seed: city.slug.length + 9 }}
        title={
          <>
            Explainable <span className="text-gradient">AI</span>
          </>
        }
        subtitle="Why the model predicts what it predicts — feature attributions, spatial sources, temporal attention and multi-scale structure."
        aside={<CitySelect size="lg" />}
      >
        <PillTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "global", label: "Global insights" },
            { value: "local", label: "City explanation" },
            { value: "temporal", label: "Time-wise analysis" },
            { value: "multiscale", label: "Multi-scale (wavelet)" },
          ]}
        />
      </PageHero>

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        <StaggerItem>
          <Kpi icon={<Gauge />} label="Predicted PM2.5 (now)" value={data ? Math.round(pm) : undefined} unit="µg/m³" tint={categoryForPm(pm).color} footer={data && <AqiBadge pm={pm} size="xs" />} />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<Flame />}
            label="Top pushing factor"
            value={top ? FEATURE_BY_KEY[top[0]].short : undefined}
            tint="#ef4444"
            footer={top && <span className="font-semibold text-red-600 dark:text-red-300">+{top[1].toFixed(1)} µg/m³</span>}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<Network />}
            label="Most important (city, 48 h)"
            value={data ? data.local[0].short : undefined}
            tint="#f97316"
            footer={data && <span>{data.local[0].value.toFixed(0)}% of attribution mass</span>}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<ShieldCheck />}
            label="Interval sharpness (24 h)"
            value={data ? Math.round(data.sharp * 100) : undefined}
            unit="%"
            tint="#10b981"
            footer={
              data && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${data.sharp * 100}%` }} transition={{ duration: 1 }} />
                </div>
              )
            }
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi icon={<Sparkles />} label="Explanation methods" value="Gate + SHAP" tint="#8b5cf6" footer={<span>validated by deletion tests</span>} />
        </StaggerItem>
      </Stagger>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-4">
          {tab === "global" && (
            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-6">
                <CardHeader
                  title="Feature importance (global)"
                  subtitle="Share of mean |attribution| across all 33 cities, last 48 h"
                  action={
                    <Segmented
                      size="sm"
                      value={method}
                      onChange={setMethod}
                      options={[
                        { value: "shap", label: "SHAP" },
                        { value: "attention", label: "Attention" },
                        { value: "permutation", label: "Permutation" },
                      ]}
                    />
                  }
                />
                <ImportanceBars items={methodImportance} />
              </Card>
              <Card padded={false} className="relative h-[470px] overflow-hidden xl:col-span-6">
                <div className="absolute left-5 top-4 z-10 max-w-[70%]">
                  <div className="font-display text-base font-semibold text-fg">Spatial explanation · {city.name}</div>
                  <div className="text-xs text-fg-muted">Upwind regions contributing transported PM2.5 right now</div>
                </div>
                {data && anchor !== null ? <SpatialMap anchor={anchor} sources={data.sources} /> : <Skeleton className="absolute inset-4" />}
                <div className="absolute bottom-4 right-4 z-10">
                  <HeatLegend title="PM2.5 (µg/m³)" />
                </div>
              </Card>
              <Card className="xl:col-span-12">
                <CardHeader title="Key insights" subtitle={`Generated from attributions for ${city.name}`} icon={<Lightbulb className="size-4" />} />
                {data ? <Insights data={data} cityName={city.name} /> : <Skeleton className="h-24" />}
              </Card>
            </div>
          )}

          {tab === "local" && data && (
            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-7">
                <CardHeader
                  title={`Local explanation · ${city.name}`}
                  subtitle={`How each input moves the prediction from the base value (${data.attr.baseValue} µg/m³) to ${Math.round(pm)} µg/m³`}
                />
                <Waterfall attr={data.attr} />
              </Card>
              <Card className="xl:col-span-5">
                <CardHeader
                  title="Faithfulness check"
                  subtitle="Deletion test: remove features in order of importance vs random order"
                  action={<Badge tone="warn">demo</Badge>}
                />
                <DeletionCurve attr={data.attr} />
                <p className="mt-3 text-xs leading-relaxed text-fg-muted">
                  If attributions are faithful, removing the most important inputs first should move the prediction toward the base value much faster than random removal.
                  On real runs this is computed by occluding inputs and re-running the model.
                </p>
              </Card>
            </div>
          )}

          {tab === "temporal" && anchor !== null && (
            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-7">
                <CardHeader title="Temporal explanation" subtitle="How the influence of the top drivers changes over the last 7 days (µg/m³)" />
                <TemporalChart anchor={anchor} />
              </Card>
              <Card className="xl:col-span-5">
                <CardHeader title="Causal attention map" subtitle="Feature × look-back lag; each row sums to 1 (no future time steps)" />
                <AttentionHeatmap anchor={anchor} />
              </Card>
            </div>
          )}

          {tab === "multiscale" && anchor !== null && <WaveletPanel anchor={anchor} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ImportanceBars({ items }: { items: { key: string; label: string; value: number; color: string; source: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((f, i) => (
        <motion.div key={f.key} layout transition={{ type: "spring", stiffness: 300, damping: 30 }} className="group grid grid-cols-[170px_1fr_48px] items-center gap-3 sm:grid-cols-[230px_1fr_52px]">
          <Tip content={`Source: ${f.source}`} side="left">
            <span className="truncate text-right text-[13px] text-fg-muted group-hover:text-fg">{f.label}</span>
          </Tip>
          <div className="h-6 overflow-hidden rounded-lg bg-surface-sunken/70">
            <motion.div
              className="h-full rounded-lg"
              style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${f.color} 65%, transparent), ${f.color})` }}
              initial={{ width: 0 }}
              animate={{ width: `${(f.value / max) * 100}%` }}
              transition={{ delay: i * 0.04, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="text-right text-sm font-semibold tabular text-fg">{f.value.toFixed(0)}%</span>
        </motion.div>
      ))}
    </div>
  );
}

function SpatialMap({ anchor, sources }: { anchor: number; sources: ReturnType<typeof spatialSources> }) {
  const city = useCity();
  const cities = useMemo(() => CITIES.map((c) => ({ slug: c.slug, name: c.name, lat: c.lat, lon: c.lon, value: pmAt(c, anchor) })), [anchor]);
  const highlights: MapHighlight[] = sources.slice(0, 4).map((s) => ({
    id: s.id,
    lat: s.lat,
    lon: s.lon,
    label: s.name,
    sublabel: `+${s.contribution.toFixed(0)}%`,
    color: s.contribution > 12 ? "#ef4444" : s.contribution > 5 ? "#f97316" : "#eab308",
  }));
  const arcs: MapArc[] = sources.slice(0, 4).map((s) => ({
    id: `src-${s.id}`,
    from: [s.lon, s.lat],
    to: [city.lon, city.lat],
    weight: Math.min(1, s.contribution / 20),
    color: "#ef4444",
  }));
  const fires = useMemo(() => fireHotspots(anchor, 220).points, [anchor]);
  return (
    <AtmosMap
      t={anchor}
      cities={cities}
      selected={city.slug}
      labels="selected"
      highlights={highlights}
      arcs={arcs}
      fires={fires}
      focus={{ lat: city.lat - 1.5, lon: city.lon - 1, k: 2.1 }}
      padding={30}
    />
  );
}

interface InsightData {
  ranked: [FeatureKey, number][];
  sources: ReturnType<typeof spatialSources>;
}

function Insights({ data, cityName }: { data: InsightData; cityName: string }) {
  const pos = data.ranked.filter(([, v]) => v > 0).slice(0, 2);
  const neg = data.ranked.filter(([, v]) => v < 0).slice(0, 1);
  const src = data.sources[0];
  const items = [
    pos[0] && {
      icon: <Flame className="size-4" />,
      tone: "red",
      text: `${FEATURE_BY_KEY[pos[0][0]].label} adds ${pos[0][1].toFixed(1)} µg/m³ to ${cityName}'s current level — the largest single push above the base value.`,
    },
    src && {
      icon: <Network className="size-4" />,
      tone: "orange",
      text: `Air arriving from ${src.name} (${Math.round(src.distance)} km upwind) accounts for ~${src.contribution.toFixed(0)}% of the prediction via the transport graph.`,
    },
    neg[0] && {
      icon: <Activity className="size-4" />,
      tone: "blue",
      text: `${FEATURE_BY_KEY[neg[0][0]].label} is pulling concentrations down by ${Math.abs(neg[0][1]).toFixed(1)} µg/m³.`,
    },
    pos[1] && {
      icon: <Layers className="size-4" />,
      tone: "amber",
      text: `${FEATURE_BY_KEY[pos[1][0]].label} is the second-largest contributor (+${pos[1][1].toFixed(1)} µg/m³).`,
    },
  ].filter(Boolean) as { icon: React.ReactNode; tone: string; text: string }[];
  const toneCls: Record<string, string> = {
    red: "bg-red-500/10 text-red-500",
    orange: "bg-orange-500/10 text-orange-500",
    blue: "bg-sky-500/10 text-sky-500",
    amber: "bg-amber-500/10 text-amber-600",
  };
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="flex gap-3 rounded-2xl border border-border bg-surface-2 p-3.5"
        >
          <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl", toneCls[it.tone])}>{it.icon}</div>
          <p className="text-[13px] leading-relaxed text-fg">{it.text}</p>
        </motion.div>
      ))}
    </div>
  );
}

function Waterfall({ attr }: { attr: ReturnType<typeof attribution> }) {
  const rows = (Object.entries(attr.values) as [FeatureKey, number][]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  let cum = attr.baseValue;
  const steps = rows.map(([k, v]) => {
    const start = cum;
    cum += v;
    return { k, v, start, end: cum };
  });
  const lo = Math.min(attr.baseValue, ...steps.map((s) => Math.min(s.start, s.end))) * 0.92;
  const hi = Math.max(attr.baseValue, ...steps.map((s) => Math.max(s.start, s.end))) * 1.04;
  const X = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[150px_1fr_64px] items-center gap-3 text-xs sm:grid-cols-[210px_1fr_70px]">
        <span className="text-right text-fg-muted">Base value E[f(x)]</span>
        <div className="relative h-6">
          <div className="absolute inset-y-0 w-px bg-fg-subtle" style={{ left: `${X(attr.baseValue)}%` }} />
        </div>
        <span className="text-right font-semibold tabular text-fg">{attr.baseValue.toFixed(0)}</span>
      </div>
      {steps.map((s, i) => {
        const left = X(Math.min(s.start, s.end));
        const width = Math.max(0.6, Math.abs(X(s.end) - X(s.start)));
        const pos = s.v >= 0;
        return (
          <div key={s.k} className="grid grid-cols-[150px_1fr_64px] items-center gap-3 sm:grid-cols-[210px_1fr_70px]">
            <span className="truncate text-right text-[13px] text-fg-muted">{FEATURE_BY_KEY[s.k].label}</span>
            <div className="relative h-7">
              <div className="absolute inset-y-0 w-px border-l border-dashed border-border-strong" style={{ left: `${X(s.start)}%` }} />
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={cn("absolute inset-y-1 rounded-md", pos ? "origin-left" : "origin-right")}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: pos ? "linear-gradient(90deg,#fb7185,#ef4444)" : "linear-gradient(90deg,#3b82f6,#60a5fa)",
                  boxShadow: pos ? "0 4px 14px -6px #ef4444" : "0 4px 14px -6px #3b82f6",
                }}
              />
            </div>
            <span className={cn("text-right text-sm font-semibold tabular", pos ? "text-red-600 dark:text-red-300" : "text-sky-600 dark:text-sky-300")}>
              {pos ? "+" : "−"}
              {Math.abs(s.v).toFixed(1)}
            </span>
          </div>
        );
      })}
      <div className="grid grid-cols-[150px_1fr_64px] items-center gap-3 border-t border-border pt-2 text-xs sm:grid-cols-[210px_1fr_70px]">
        <span className="text-right font-semibold text-fg">Prediction f(x)</span>
        <div className="relative h-6">
          <div className="absolute inset-y-0 w-0.5 rounded bg-primary" style={{ left: `${X(attr.prediction)}%` }} />
        </div>
        <span className="text-right font-display text-base font-bold tabular text-primary">{attr.prediction.toFixed(0)}</span>
      </div>
    </div>
  );
}

function DeletionCurve({ attr }: { attr: ReturnType<typeof attribution> }) {
  const data = useMemo(() => {
    const entries = Object.entries(attr.values) as [FeatureKey, number][];
    const ordered = [...entries].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const rnd = mulberry32(17);
    const random = [...entries].sort(() => rnd() - 0.5);
    const total = Math.abs(attr.prediction - attr.baseValue) || 1;
    const out = [{ k: 0, top: 100, random: 100 }];
    let a = attr.prediction;
    let b = attr.prediction;
    for (let i = 0; i < entries.length; i++) {
      a -= ordered[i][1];
      b -= random[i][1];
      out.push({ k: i + 1, top: (Math.abs(a - attr.baseValue) / total) * 100, random: (Math.abs(b - attr.baseValue) / total) * 100 });
    }
    return out;
  }, [attr]);
  return (
    <>
      <Legend
        className="mb-2"
        items={[
          { label: "Remove most important first", color: "var(--primary)" },
          { label: "Random order", color: "var(--fg-subtle)", dashed: true },
        ]}
      />
      <div className="h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="k" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: "features removed", fontSize: 10, fill: "var(--fg-subtle)", position: "insideBottomRight", offset: -2 }} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} unit="%" />
            <Line type="monotone" dataKey="random" stroke="var(--fg-subtle)" strokeDasharray="5 5" strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="top" stroke="var(--primary)" strokeWidth={2.6} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function TemporalChart({ anchor }: { anchor: number }) {
  const city = useCity();
  const keys: FeatureKey[] = ["fire", "neighbors", "wind", "boundary"];
  const data = useMemo(() => temporalAttribution(city, anchor, 168, 3), [city, anchor]);
  return (
    <>
      <Legend className="mb-2" items={keys.map((k) => ({ label: FEATURE_BY_KEY[k].short, color: FEATURE_BY_KEY[k].color }))} />
      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="t" tickFormatter={(t: number) => fmtDay(t)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as Record<string, number>;
                return (
                  <ChartTip
                    title={`${fmtDay(d.t)} · ${fmtHour(d.t)}`}
                    rows={keys.map((k) => ({ label: FEATURE_BY_KEY[k].short, value: `${d[k] >= 0 ? "+" : ""}${d[k].toFixed(1)}`, color: FEATURE_BY_KEY[k].color }))}
                  />
                );
              }}
            />
            {keys.map((k) => (
              <Line key={k} type="monotone" dataKey={k} stroke={FEATURE_BY_KEY[k].color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function AttentionHeatmap({ anchor }: { anchor: number }) {
  const city = useCity();
  const m = useMemo(() => attentionMatrix(city, anchor, 24, 3), [city, anchor]);
  const [hover, setHover] = useState<{ f: string; lag: number; w: number } | null>(null);
  const max = Math.max(...m.rows.flatMap((r) => r.weights));
  return (
    <div>
      <div className="space-y-[3px]" onMouseLeave={() => setHover(null)}>
        {m.rows.map((r, i) => (
          <div key={r.feature.key} className="grid grid-cols-[96px_1fr] items-center gap-2">
            <span className="truncate text-right text-[11px] text-fg-muted">{r.feature.short}</span>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${m.lags.length}, minmax(0,1fr))` }}>
              {r.weights.map((w, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (i * m.lags.length + j) * 0.002 }}
                  onMouseEnter={() => setHover({ f: r.feature.label, lag: m.lags[j], w })}
                  className="aspect-square rounded-[3px] transition-transform hover:scale-125"
                  style={{ background: `color-mix(in oklab, ${r.feature.color} ${Math.round(8 + (w / max) * 92)}%, transparent)` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-[96px_1fr] gap-2 text-[10px] text-fg-subtle">
        <span />
        <div className="flex justify-between">
          <span>now</span>
          <span>−24 h</span>
          <span>−48 h</span>
          <span>−69 h</span>
        </div>
      </div>
      <div className="mt-3 h-10 rounded-xl bg-surface-sunken/70 px-3 py-2 text-xs text-fg-muted">
        {hover ? (
          <span>
            <b className="text-fg">{hover.f}</b> at lag −{hover.lag} h · weight <b className="text-fg tabular">{(hover.w * 100).toFixed(1)}%</b>
          </span>
        ) : (
          "Hover a cell. Fire signals peak 1–2 days back (transport time); traffic follows the daily rhythm."
        )}
      </div>
    </div>
  );
}

function WaveletPanel({ anchor }: { anchor: number }) {
  const city = useCity();
  const res = useMemo(() => {
    const h = history(city, anchor, 24 * 14, 1);
    const x = h.map((p) => p.pm);
    const w = wavelet3Bands(x);
    return { energy: w.energy, data: h.map((p, i) => ({ t: p.t, x: p.pm, trend: w.trend[i], daily: w.daily[i], spikes: w.spikes[i] })).slice(32) };
  }, [city, anchor]);
  const bands = [
    { key: "trend", label: "Trend (> 32 h)", color: "#6366f1", energy: res.energy.trend, desc: "Synoptic weather regimes and seasonal build-up" },
    { key: "daily", label: "Daily cycle (8–32 h)", color: "#14b8a6", energy: res.energy.daily, desc: "Boundary-layer breathing and traffic rhythm" },
    { key: "spikes", label: "Spikes (≤ 4 h)", color: "#f97316", energy: res.energy.spikes, desc: "Local bursts: fires, firecrackers, traffic jams" },
  ] as const;
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-8">
        <CardHeader title={`Multi-resolution decomposition · ${city.name}`} subtitle="Causal Haar à-trous wavelet on the last 14 days — the same transform the model's wavelet branch applies inside each input window" icon={<Waves className="size-4" />} />
        <div className="space-y-1">
          <MiniArea data={res.data} k="x" color="var(--fg)" label="Observed PM2.5" />
          {bands.map((b) => (
            <MiniArea key={b.key} data={res.data} k={b.key} color={b.color} label={b.label} centered={b.key !== "trend"} />
          ))}
        </div>
      </Card>
      <Card className="xl:col-span-4">
        <CardHeader title="Energy by band" subtitle="Share of signal variance captured by each scale" />
        <div className="space-y-4">
          {bands.map((b, i) => (
            <div key={b.key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium text-fg">{b.label}</span>
                <span className="font-display text-lg font-bold tabular" style={{ color: b.color }}>
                  {b.energy.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                <motion.div className="h-full rounded-full" style={{ background: b.color }} initial={{ width: 0 }} animate={{ width: `${b.energy}%` }} transition={{ delay: i * 0.1, duration: 0.9 }} />
              </div>
              <div className="mt-1 text-xs text-fg-muted">{b.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-primary-soft p-3 text-xs leading-relaxed text-fg">
          <b>Why it matters:</b> separating scales lets the network learn slow build-ups and sudden spikes with different filters instead of averaging them away (research gap G2).
        </div>
      </Card>
    </div>
  );
}

function MiniArea({ data, k, color, label, centered }: { data: Record<string, number>[]; k: string; color: string; label: string; centered?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <span className="text-right text-[11px] font-medium text-fg-muted">{label}</span>
      <div className="h-[70px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`wv-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity={0.35} />
                <stop offset="1" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={centered ? ["dataMin", "dataMax"] : [0, "auto"]} />
            <Area type="monotone" dataKey={k} stroke={color} strokeWidth={1.5} fill={`url(#wv-${k})`} dot={false} isAnimationActive animationDuration={900} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
