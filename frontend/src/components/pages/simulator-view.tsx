"use client";

import { CalendarClock, Car, Construction, Droplets, Factory, Info, Lightbulb, RotateCcw, Sparkles, Star, Thermometer, Timer, Users, Wheat, Wind } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend as RLegend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTip, Legend } from "@/components/charts/chart-tooltip";
import { PageHero } from "@/components/layout/page-hero";
import { AtmosMap, HeatLegend } from "@/components/map/atmos-map";
import { AqiBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CitySelect } from "@/components/ui/city-select";
import { AnimatedNumber, Skeleton, Slider, Tip } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/segmented";
import { useAnchor } from "@/hooks/use-anchor";
import { useCity } from "@/hooks/use-city";
import { categoryForPm } from "@/lib/aqi";
import { CITIES } from "@/lib/cities";
import { fmtDateTime, fmtHour, fmtPop } from "@/lib/format";
import { DATA_MODE } from "@/lib/nav";
import { pmAt } from "@/lib/sim/core";
import { PRESETS, runScenario, ZERO_SCENARIO, type ScenarioInput } from "@/lib/sim/scenario";
import { cn, haversineKm } from "@/lib/utils";

interface Lever {
  key: keyof ScenarioInput;
  label: string;
  icon: React.ReactNode;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  help: string;
}

const LEVERS: Lever[] = [
  { key: "vehicles", label: "Vehicle emissions", icon: <Car />, min: -80, max: 80, step: 5, unit: "%", color: "#3b82f6", help: "Tailpipe + road traffic exhaust. ~27% of local burden in the surrogate." },
  { key: "industry", label: "Industrial emissions", icon: <Factory />, min: -80, max: 80, step: 5, unit: "%", color: "#ef4444", help: "Stacks, brick kilns, power plants. ~22% of local burden." },
  { key: "construction", label: "Construction & dust", icon: <Construction />, min: -80, max: 80, step: 5, unit: "%", color: "#f59e0b", help: "Construction sites and resuspended road dust. ~17%." },
  { key: "cropBurning", label: "Crop-residue burning", icon: <Wheat />, min: -100, max: 100, step: 5, unit: "%", color: "#16a34a", help: "Scales the upwind fire-driven term." },
  { key: "wind", label: "Wind speed", icon: <Wind />, min: -3, max: 3, step: 0.5, unit: " m/s", color: "#06b6d4", help: "More wind → better dispersion." },
  { key: "temperature", label: "Surface temperature", icon: <Thermometer />, min: -5, max: 5, step: 0.5, unit: " °C", color: "#f97316", help: "Warmer surface → deeper mixing layer." },
  { key: "humidity", label: "Humidity", icon: <Droplets />, min: -30, max: 30, step: 5, unit: " %RH", color: "#8b5cf6", help: "Humid air favours secondary aerosol formation." },
];

export function SimulatorView() {
  const anchor = useAnchor();
  const city = useCity();
  const [input, setInput] = useState<ScenarioInput>(PRESETS[4].input);
  const [preset, setPreset] = useState<string | null>("grap3");
  const [horizon, setHorizon] = useState<"24" | "48">("48");
  const [view, setView] = useState<"baseline" | "scenario">("scenario");
  const deferred = useDeferredValue(input);

  const result = useMemo(() => (anchor === null ? null : runScenario(city, anchor, Number(horizon), deferred)), [anchor, city, horizon, deferred]);

  const leverImpact = useMemo(() => {
    if (anchor === null) return [];
    const base = runScenario(city, anchor, 24, ZERO_SCENARIO).summary.avgBaseline;
    return LEVERS.map((l) => {
      const one = { ...ZERO_SCENARIO, [l.key]: l.key === "wind" ? 2 : l.key === "temperature" ? 2 : l.key === "humidity" ? -20 : -50 } as ScenarioInput;
      const r = runScenario(city, anchor, 24, one).summary.avgScenario;
      return { ...l, delta: r - base };
    }).sort((a, b) => a.delta - b.delta);
  }, [anchor, city]);

  const mapCities = useMemo(() => {
    if (anchor === null || !result) return [];
    const ratio = result.summary.avgScenario / result.summary.avgBaseline;
    return CITIES.map((c) => {
      const base = pmAt(c, anchor);
      const d = haversineKm(c.lat, c.lon, city.lat, city.lon);
      const k = view === "scenario" ? 1 - (1 - ratio) * Math.exp(-d / 140) : 1;
      return { slug: c.slug, name: c.name, lat: c.lat, lon: c.lon, value: base * k };
    });
  }, [anchor, result, city, view]);

  const set = (k: keyof ScenarioInput, v: number) => {
    setPreset(null);
    setInput((s) => ({ ...s, [k]: v }));
  };

  const s = result?.summary;
  const skyPm = s ? (view === "scenario" ? s.avgScenario : s.avgBaseline) : 80;

  return (
    <div>
      <PageHero
        sky={{ pm: skyPm, landmark: city.landmark, seed: city.slug.length + 21 }}
        title={
          <>
            What-if <span className="text-gradient">Simulator</span>
          </>
        }
        subtitle="Change emissions and weather, and watch the forecast — and the sky — respond. Built for policy conversations, not just charts."
        aside={
          <div className="glass flex max-w-[300px] items-center gap-3 rounded-2xl border border-white/40 p-3.5 shadow-lift dark:border-white/10">
            <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="text-[13px] leading-snug text-fg">
              {s ? (
                <>
                  This scenario changes {city.name}&apos;s average by{" "}
                  <b className={s.change < 0 ? "text-emerald-600 dark:text-emerald-300" : "text-red-600"}>{s.change.toFixed(0)}%</b>
                </>
              ) : (
                "Loading scenario…"
              )}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <CitySelect size="lg" />
          <div className="glass flex h-14 items-center gap-2 rounded-2xl border border-border px-4 text-sm text-fg-muted shadow-card">
            <CalendarClock className="size-4 text-primary" />
            <span className="tabular">{anchor !== null ? fmtDateTime(anchor) : "—"}</span>
          </div>
          <div className="glass flex h-14 items-center gap-2 rounded-2xl border border-border px-2 shadow-card">
            <Timer className="ml-2 size-4 text-primary" />
            <Segmented
              value={horizon}
              onChange={setHorizon}
              variant="primary"
              options={[
                { value: "24", label: "24 h" },
                { value: "48", label: "48 h" },
              ]}
            />
          </div>
        </div>
      </PageHero>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Levers */}
        <Card className="xl:col-span-4">
          <CardHeader
            title="Adjust factors"
            subtitle="Relative to the model's baseline forecast"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInput(ZERO_SCENARIO);
                  setPreset(null);
                }}
              >
                <RotateCcw /> Reset
              </Button>
            }
          />
          <div className="space-y-4">
            {LEVERS.map((l) => {
              const v = input[l.key];
              return (
                <div key={l.key}>
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl [&_svg]:size-4" style={{ color: l.color, background: `color-mix(in oklab, ${l.color} 13%, transparent)` }}>
                      {l.icon}
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-fg">{l.label}</span>
                    <Tip content={l.help}>
                      <Info className="size-3.5 text-fg-subtle" />
                    </Tip>
                    <span
                      className={cn(
                        "min-w-[62px] rounded-lg px-2 py-0.5 text-center text-xs font-semibold tabular",
                        v === 0 ? "bg-surface-sunken text-fg-muted" : "bg-primary-soft text-primary",
                      )}
                    >
                      {v === 0 ? "No change" : `${v > 0 ? "+" : ""}${v}${l.unit}`}
                    </span>
                  </div>
                  <Slider value={v} onChange={(x) => set(l.key, x)} min={l.min} max={l.max} step={l.step} color={l.color} aria-label={l.label} />
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold text-fg">Scenario presets</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Tip key={p.id} content={p.description}>
                  <button
                    onClick={() => {
                      setInput(p.input);
                      setPreset(p.id);
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-medium transition",
                      preset === p.id ? "border-primary bg-primary-soft text-primary" : "border-border text-fg-muted hover:border-border-strong hover:text-fg",
                    )}
                  >
                    {p.label}
                  </button>
                </Tip>
              ))}
            </div>
          </div>
        </Card>

        {/* Map */}
        <Card padded={false} className="relative min-h-[520px] overflow-hidden xl:col-span-5">
          <div className="absolute left-5 top-4 z-10">
            <div className="font-display text-base font-semibold text-fg">Predicted PM2.5 distribution</div>
            <div className="text-xs text-fg-muted">Effect spreads to neighbours with distance (illustrative)</div>
          </div>
          <div className="absolute right-4 top-4 z-10">
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              variant="primary"
              options={[
                { value: "baseline", label: "Baseline" },
                { value: "scenario", label: "Your scenario" },
              ]}
            />
          </div>
          {anchor !== null && mapCities.length ? (
            <AtmosMap t={anchor} cities={mapCities} selected={city.slug} labels="major" focus={{ lat: city.lat, lon: city.lon, k: 2.6 }} padding={30} />
          ) : (
            <Skeleton className="absolute inset-4" />
          )}
          <div className="absolute bottom-4 right-4 z-10">
            <HeatLegend title="PM2.5 (µg/m³)" />
          </div>
        </Card>

        {/* Impact */}
        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-1">
          <Card>
            <CardHeader title="Impact summary" subtitle={`Next ${horizon} h vs baseline`} />
            <div className="grid grid-cols-2 gap-2.5">
              <ImpactTile label="PM2.5 avg" from={s?.avgBaseline} to={s?.avgScenario} unit="µg/m³" />
              <ImpactTile label="AQI avg" from={s?.aqiBaseline} to={s?.aqiScenario} />
              <ImpactTile label="People exposed" from={s?.exposedBaseline} to={s?.exposedScenario} format={(v) => fmtPop(v)} icon={<Users className="size-3.5" />} />
              <ImpactTile label="Hours ≥ Poor" from={s?.unhealthyBaseline} to={s?.unhealthyScenario} />
            </div>
            {s && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-sunken/70 px-3 py-2 text-xs">
                <span className="text-fg-muted">Category</span>
                <span className="flex items-center gap-1.5">
                  <AqiBadge category={s.catBaseline} size="xs" /> → <AqiBadge category={s.catScenario} size="xs" />
                </span>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Best single lever" subtitle={`Avg change in ${city.name}, 24 h`} icon={<Lightbulb className="size-4" />} />
            <div className="space-y-2">
              {leverImpact.slice(0, 4).map((l, i) => (
                <motion.div key={l.key} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2.5 text-xs">
                  <span className="grid size-7 place-items-center rounded-lg [&_svg]:size-3.5" style={{ color: l.color, background: `color-mix(in oklab, ${l.color} 13%, transparent)` }}>
                    {l.icon}
                  </span>
                  <span className="flex-1 text-fg-muted">
                    {l.label}{" "}
                    <span className="text-fg-subtle">
                      ({l.key === "wind" || l.key === "temperature" ? "+2" : l.key === "humidity" ? "−20" : "−50"}
                      {l.unit.trim()})
                    </span>
                  </span>
                  <span className="font-semibold tabular text-emerald-600 dark:text-emerald-300">{l.delta.toFixed(1)}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader
            title="PM2.5 forecast comparison"
            subtitle="Baseline vs scenario with P10–P90 bands"
            action={<Badge tone={DATA_MODE === "demo" ? "warn" : "primary"}>{DATA_MODE === "demo" ? "surrogate engine" : "model inference"}</Badge>}
          />
          <Legend
            className="mb-2"
            items={[
              { label: "Baseline", color: "#ef4444" },
              { label: "Your scenario", color: "var(--primary)" },
              { label: "Confidence interval", color: "var(--primary)", band: true },
            ]}
          />
          {result ? <ScenarioChart series={result.series} /> : <Skeleton className="h-[300px]" />}
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader title="Source contributions" subtitle="Average µg/m³ by sector — baseline vs scenario" />
          {result ? <SectorChart sectors={result.sectors} /> : <Skeleton className="h-[300px]" />}
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500/12 text-amber-600">
            <Star className="size-5" />
          </div>
          <p className="flex-1 text-[13px] leading-relaxed text-fg-muted">
            <b className="text-fg">How this works.</b> In demo mode the simulator applies a transparent sensitivity surrogate: sector shares of the local burden scale with each emission
            lever, the fire-driven term scales with crop burning, and meteorology enters as dispersion multipliers. With the API connected, the same controls call{" "}
            <code className="font-mono text-xs">POST /whatif</code>, which perturbs the model inputs and re-runs MW-AeroFusion-Net.
          </p>
        </div>
      </Card>
    </div>
  );
}

function ImpactTile({ label, from, to, unit, format, icon }: { label: string; from?: number; to?: number; unit?: string; format?: (v: number) => string; icon?: React.ReactNode }) {
  const change = from !== undefined && to !== undefined && from !== 0 ? ((to - from) / from) * 100 : 0;
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-1 text-[11px] text-fg-muted">
        {icon}
        {label}
      </div>
      {from === undefined || to === undefined ? (
        <Skeleton className="mt-2 h-6 w-20" />
      ) : (
        <>
          <div className="mt-1 flex items-baseline gap-1 font-display text-[15px] font-bold text-fg">
            <span className="text-fg-muted tabular">{format ? format(from) : Math.round(from)}</span>
            <span className="text-fg-subtle">→</span>
            <span className="tabular">{format ? format(to) : <AnimatedNumber value={Math.round(to)} />}</span>
            {unit && <span className="text-[9.5px] font-medium text-fg-subtle">{unit}</span>}
          </div>
          <div className={cn("mt-1 text-[11px] font-semibold tabular", change < -0.5 ? "text-emerald-600 dark:text-emerald-300" : change > 0.5 ? "text-red-600" : "text-fg-subtle")}>
            {change < 0 ? "↓" : change > 0 ? "↑" : "→"} {Math.abs(change).toFixed(0)}%
          </div>
        </>
      )}
    </div>
  );
}

function ScenarioChart({ series }: { series: ReturnType<typeof runScenario>["series"] }) {
  const data = series.map((p) => ({ ...p, band: [p.scenarioLo, p.scenarioHi] as [number, number] }));
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="scen-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity={0.26} />
              <stop offset="1" stopColor="var(--primary)" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey="t" tickFormatter={(t: number, i: number) => (i === 0 ? "Now" : fmtHour(t))} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <ChartTip
                  title={`+${d.lead} h · ${fmtHour(d.t)}`}
                  rows={[
                    { label: "Baseline", value: Math.round(d.baseline), color: "#ef4444" },
                    { label: "Scenario", value: Math.round(d.scenario), color: "var(--primary)" },
                    { label: "Δ", value: `${Math.round(d.scenario - d.baseline)}` },
                  ]}
                  footer={<span>{categoryForPm(d.scenario).label} (scenario)</span>}
                />
              );
            }}
          />
          <Area dataKey="band" stroke="none" fill="url(#scen-band)" animationDuration={600} />
          <Line type="monotone" dataKey="baseline" stroke="#ef4444" strokeWidth={2.2} dot={false} animationDuration={600} />
          <Line type="monotone" dataKey="scenario" stroke="var(--primary)" strokeWidth={2.8} dot={false} animationDuration={600} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectorChart({ sectors }: { sectors: ReturnType<typeof runScenario>["sectors"] }) {
  const data = sectors.map((s) => ({ name: s.label, Baseline: s.base, Scenario: s.scen }));
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }} barGap={3}>
          <CartesianGrid horizontal={false} strokeDasharray="3 6" />
          <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={118} />
          <Tooltip
            cursor={{ fill: "var(--surface-sunken)", opacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <ChartTip
                  title={d.name}
                  rows={[
                    { label: "Baseline", value: `${d.Baseline.toFixed(1)} µg/m³`, color: "var(--border-strong)" },
                    { label: "Scenario", value: `${d.Scenario.toFixed(1)} µg/m³`, color: "var(--primary)" },
                  ]}
                />
              );
            }}
          />
          <RLegend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Baseline" fill="var(--border-strong)" radius={[0, 6, 6, 0]} barSize={11} animationDuration={600} />
          <Bar dataKey="Scenario" fill="var(--primary)" radius={[0, 6, 6, 0]} barSize={11} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

