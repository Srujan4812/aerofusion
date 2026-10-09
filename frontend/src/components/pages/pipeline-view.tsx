"use client";

import { ArrowRight, Boxes, CheckCircle2, Clock, Cloud, Database, Flame, Gauge, HardDrive, Layers, Leaf, Loader2, MapPin, Play, RotateCcw, Satellite, Settings2, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GlassNote, PageHero } from "@/components/layout/page-hero";
import { MiniIndia, type MiniPoint } from "@/components/map/mini-india";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { Skeleton } from "@/components/ui/primitives";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { useAnchor } from "@/hooks/use-anchor";
import { categoryForPm, pmColor } from "@/lib/aqi";
import { CITIES } from "@/lib/cities";
import { fmtDateTime, fmtNum, fmtTime } from "@/lib/format";
import { DATA_MODE } from "@/lib/nav";
import { mulberry32 } from "@/lib/rng";
import { fireHotspots, pmAt, windVector } from "@/lib/sim/core";
import { fieldGrid, cityValues } from "@/lib/sim/field";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    id: "ingest",
    title: "Raw data ingestion",
    icon: <Database className="size-4" />,
    color: "#10b981",
    steps: ["CPCB stations (OpenAQ v3)", "ERA5 weather (Open-Meteo)", "NASA FIRMS active fires", "Calendar & festival proxies", "Static layers (WorldPop, OSM)"],
  },
  {
    id: "prep",
    title: "Preprocessing",
    icon: <Settings2 className="size-4" />,
    color: "#8b5cf6",
    steps: ["Range & spike QC (MAD filter)", "UTC alignment, hourly resample", "Gap filling: k-NN (space) + spline ≤ 6 h", "Robust scaling fit on train split", "Chronological 70/15/15 split"],
  },
  {
    id: "feat",
    title: "Feature engineering",
    icon: <Sparkles className="size-4" />,
    color: "#f59e0b",
    steps: ["Lags t−1…t−24 & rolling stats", "Upwind fire count (300 km, 72 h)", "Causal wavelet bands per window", "Graph prior: haversine × wind", "Fires & wind → 32×32 raster"],
  },
  {
    id: "tensor",
    title: "Unified spatio-temporal tensor",
    icon: <Boxes className="size-4" />,
    color: "#0ea5e9",
    steps: ["Node tensor (B, 72, 33, F)", "Raster tensor (B, 72, C, 32, 32)", "Adjacency prior (33 × 33)", "Targets (B, 33, 3 horizons)", "Cached as Parquet + .pt"],
  },
] as const;

export function PipelineView() {
  const anchor = useAnchor();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(STAGES.length * 5); // all done initially
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return;
    const total = STAGES.length * 5;
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + 1;
        const stage = STAGES[Math.floor((next - 1) / 5)];
        const step = stage?.steps[(next - 1) % 5];
        if (stage && step) {
          const ms = 120 + ((next * 397) % 900);
          setLogs((l) => [...l.slice(-60), `[${new Date().toLocaleTimeString("en-IN", { hour12: false })}] ${stage.id.padEnd(6)} ✓ ${step} (${ms} ms)`]);
        }
        if (next >= total) {
          setRunning(false);
          setLogs((l) => [...l, `[${new Date().toLocaleTimeString("en-IN", { hour12: false })}] done   ✓ tensor ready — demo run, no files written`]);
        }
        return Math.min(total, next);
      });
    }, 260);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const tiles = useMemo(() => {
    if (anchor === null) return null;
    const fires = fireHotspots(anchor, 240);
    const stations: MiniPoint[] = CITIES.map((c) => {
      const v = pmAt(c, anchor);
      return { id: c.slug, lat: c.lat, lon: c.lon, color: categoryForPm(v).color, r: 3.4 };
    });
    return { fires, stations };
  }, [anchor]);

  const start = () => {
    setLogs([`[${new Date().toLocaleTimeString("en-IN", { hour12: false })}] start  ▶ make data (demo walkthrough)`]);
    setProgress(0);
    setRunning(true);
  };

  return (
    <div>
      <PageHero
        sky={{ variant: "orbit", pm: 18, seed: 9 }}
        title={
          <>
            Live Data <span className="text-gradient">Ingestion & Processing</span>
          </>
        }
        subtitle="Satellites, ground sensors and auxiliary layers fused into one spatio-temporal representation for PM2.5 forecasting."
        aside={
          <GlassNote icon={<Leaf />}>
            Live multi-source data for a cleaner, healthier India.
          </GlassNote>
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StaggerItem>
          <Kpi icon={<Database />} label="Data sources" value={5} unit="core feeds" tint="#10b981" />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<Cloud />}
            label="Ingestion"
            value={DATA_MODE === "demo" ? "Simulated" : "Live"}
            tint={DATA_MODE === "demo" ? "#f59e0b" : "#10b981"}
            footer={<span>{DATA_MODE === "demo" ? "demo simulator feeds the UI" : "scheduled refresh every hour"}</span>}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi icon={<Clock />} label="Last update" value={anchor !== null ? fmtTime(anchor) : undefined} tint="#0ea5e9" footer={anchor !== null && <span>{fmtDateTime(anchor)}</span>} />
        </StaggerItem>
        <StaggerItem>
          <Kpi icon={<HardDrive />} label="Daily volume (est.)" value="~120" unit="MB / day" tint="#8b5cf6" footer={<span>raw · ≈ 25 MB processed</span>} />
        </StaggerItem>
      </Stagger>

      {/* Source tiles */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SourceTile title="NASA FIRMS" sub="Fire hotspots" icon={<Flame />} tint="#f97316" foot={tiles ? `${fmtNum(tiles.fires.total)} detections today` : "…"}>
          {tiles ? <MiniIndia width={220} height={240} states={false} points={tiles.fires.points.map((f) => ({ id: f.id, lat: f.lat, lon: f.lon, color: f.confidence === "high" ? "#ef4444" : "#f97316", r: 2.4, opacity: 0.85 }))} /> : <Skeleton className="h-[200px]" />}
        </SourceTile>
        <SourceTile title="ERA5 / IMD" sub="Wind field" icon={<Cloud />} tint="#0ea5e9" foot="Hourly · 0.25° grid">
          {anchor !== null ? <WindTile anchor={anchor} /> : <Skeleton className="h-[200px]" />}
        </SourceTile>
        <SourceTile title="CPCB stations" sub="PM2.5 · AQI" icon={<MapPin />} tint="#10b981" foot={`${CITIES.reduce((s, c) => s + c.stations, 0)} stations · 33 cities`}>
          {tiles ? <MiniIndia width={220} height={240} points={tiles.stations} /> : <Skeleton className="h-[200px]" />}
        </SourceTile>
        <SourceTile title="Gridded surface" sub="Interpolated PM2.5" icon={<Satellite />} tint="#eab308" foot="Display only · 0.3° cells">
          {anchor !== null ? <HeatTile anchor={anchor} /> : <Skeleton className="h-[200px]" />}
        </SourceTile>
        <SourceTile title="Auxiliary" sub="Land use & population" icon={<Layers />} tint="#64748b" foot="Static · refreshed yearly">
          <LandUseTile />
        </SourceTile>
      </div>

      {/* Pipeline */}
      <Card className="mt-4">
        <CardHeader
          title="Data processing pipeline"
          subtitle="Raw multi-source data → preprocessing → features → unified spatio-temporal tensor"
          action={
            <Button size="sm" onClick={start} disabled={running}>
              {running ? <Loader2 className="animate-spin" /> : progress >= 20 ? <RotateCcw /> : <Play />}
              {running ? "Running…" : "Run walkthrough"}
            </Button>
          }
        />
        <div className="grid gap-3 lg:grid-cols-4">
          {STAGES.map((st, si) => {
            const done = Math.max(0, Math.min(5, progress - si * 5));
            const active = running && done < 5 && progress >= si * 5;
            return (
              <div key={st.id} className="relative">
                <div
                  className={cn("h-full rounded-2xl border p-4 transition-all duration-500", active ? "shadow-lift" : "")}
                  style={{
                    borderColor: active || done === 5 ? `color-mix(in oklab, ${st.color} 40%, transparent)` : "var(--border)",
                    background: `color-mix(in oklab, ${st.color} ${active ? 9 : 4}%, transparent)`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: st.color }}>
                      {st.icon}
                    </span>
                    <span className="font-display text-sm font-semibold text-fg">{st.title}</span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {st.steps.map((step, i) => {
                      const ok = i < done;
                      const cur = active && i === done;
                      return (
                        <li key={step} className="flex items-center gap-2 text-[12.5px]">
                          <span className="grid size-4 place-items-center">
                            {ok ? (
                              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
                                <CheckCircle2 className="size-4" />
                              </motion.span>
                            ) : cur ? (
                              <Loader2 className="size-3.5 animate-spin text-fg-muted" />
                            ) : (
                              <span className="size-2 rounded-full border border-border-strong" />
                            )}
                          </span>
                          <span className={ok ? "text-fg" : "text-fg-muted"}>{step}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-sunken">
                    <motion.div className="h-full rounded-full" style={{ background: st.color }} animate={{ width: `${(done / 5) * 100}%` }} />
                  </div>
                </div>
                {si < STAGES.length - 1 && (
                  <div className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface-solid text-fg-subtle shadow-card lg:grid">
                    <ArrowRight className="size-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div ref={logRef} className="h-[220px] overflow-y-auto rounded-2xl bg-[#07120e] p-4 font-mono text-[11.5px] leading-relaxed text-emerald-200/90 lg:col-span-7" data-lenis-prevent>
            {logs.length === 0 ? (
              <div className="text-white/40">$ press “Run walkthrough” to replay the pipeline stages (UI demo — real runs use `make data`).</div>
            ) : (
              logs.map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                  {l}
                </motion.div>
              ))
            )}
          </div>
          <div className="lg:col-span-5">{anchor !== null ? <TensorCube anchor={anchor} /> : <Skeleton className="h-[220px]" />}</div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader title="Recent ingestion" subtitle="Last runs per source (demo)" action={<Badge tone="warn">demo</Badge>} />
          {anchor !== null ? <IngestionLog anchor={anchor} /> : <Skeleton className="h-48" />}
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="Data quality" subtitle="Computed per refresh · thresholds in brackets" icon={<ShieldCheck className="size-4" />} />
          <div className="grid grid-cols-2 gap-3">
            <Quality label="Completeness" value={98.3} good={95} unit="%" />
            <Quality label="Spatial coverage" value={96.7} good={90} unit="%" />
            <Quality label="Missing values" value={1.2} good={5} unit="%" invert />
            <Quality label="Outlier rate" value={0.8} good={2} unit="%" invert />
          </div>
          <p className="mt-3 text-[11px] text-fg-subtle">Demo values. Real numbers come from the pipeline&apos;s QC report (data/processed/qc.json).</p>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader title="Storage & processing" icon={<HardDrive className="size-4" />} />
          <dl className="space-y-3 text-sm">
            <Row icon={<Database className="size-4" />} label="Raw (daily)" value="~120 MB" />
            <Row icon={<Gauge className="size-4" />} label="Processed (daily)" value="~25 MB" />
            <Row icon={<HardDrive className="size-4" />} label="History 2015→" value="~9 GB" />
            <Row icon={<Timer className="size-4" />} label="Full pipeline" value="~14 min" />
          </dl>
          <Link href="/data-sources" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Source details <ArrowRight className="size-3.5" />
          </Link>
        </Card>
      </div>
    </div>
  );
}

function SourceTile({ title, sub, icon, tint, foot, children }: { title: string; sub: string; icon: React.ReactNode; tint: string; foot: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col !p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl [&_svg]:size-4" style={{ color: tint, background: `color-mix(in oklab, ${tint} 13%, transparent)` }}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-fg">{title}</div>
          <div className="truncate text-[11px] text-fg-muted">{sub}</div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
          <Dot color="#10b981" pulse /> {DATA_MODE === "demo" ? "Sim" : "Live"}
        </span>
      </div>
      <div className="relative mt-3 flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-surface-sunken/60 p-2">{children}</div>
      <div className="mt-2.5 text-[11.5px] text-fg-muted">{foot}</div>
    </Card>
  );
}

function WindTile({ anchor }: { anchor: number }) {
  const arrows = useMemo(() => {
    const out: { lat: number; lon: number; u: number; v: number }[] = [];
    for (let lat = 9; lat <= 34; lat += 2.4) for (let lon = 69; lon <= 96; lon += 2.4) {
      const [u, v] = windVector(lat, lon, anchor);
      out.push({ lat, lon, u, v });
    }
    return out;
  }, [anchor]);
  return (
    <MiniIndia width={220} height={240} states={false} fill="color-mix(in oklab, #0ea5e9 14%, var(--map-land))">
      {(project) =>
        arrows.map((a, i) => {
          const [x, y] = project(a.lon, a.lat);
          const len = 4 + Math.hypot(a.u, a.v) * 1.6;
          const ang = (Math.atan2(-a.v, a.u) * 180) / Math.PI;
          return (
            <g key={i} transform={`translate(${x},${y}) rotate(${ang.toFixed(1)})`} opacity={0.75}>
              <line x1={-len / 2} y1={0} x2={len / 2} y2={0} stroke="#0284c7" strokeWidth={1.1} />
              <path d={`M${len / 2},0 l-3,-2 v4 z`} fill="#0284c7" />
            </g>
          );
        })
      }
    </MiniIndia>
  );
}

function HeatTile({ anchor }: { anchor: number }) {
  const cells = useMemo(() => {
    const g = fieldGrid(cityValues(anchor, "pm"), anchor, "pm", 1);
    const out: { lat: number; lon: number; v: number }[] = [];
    for (let i = 0; i < g.nLat; i++) for (let j = 0; j < g.nLon; j++) out.push({ lat: g.minLat + i * g.step, lon: g.minLon + j * g.step, v: g.values[i * g.nLon + j] });
    return out;
  }, [anchor]);
  return (
    <MiniIndia width={220} height={240} states={false}>
      {(project) => (
        <g clipPath="url(#mini-clip-220-240)" style={{ filter: "blur(3px)" }}>
          {cells.map((c, i) => {
            const [x1, y1] = project(c.lon, c.lat + 1);
            const [x2, y2] = project(c.lon + 1, c.lat);
            return <rect key={i} x={x1} y={y1} width={x2 - x1 + 0.6} height={y2 - y1 + 0.6} fill={pmColor(c.v)} opacity={0.85} />;
          })}
        </g>
      )}
    </MiniIndia>
  );
}

const LAND_COLORS = ["#16a34a", "#84cc16", "#eab308", "#64748b", "#0ea5e9"];

function LandUseTile() {
  const colors = LAND_COLORS;
  const pts = useMemo(() => {
    const rnd = mulberry32(31);
    return Array.from({ length: 260 }, (_, i) => ({
      id: `lu${i}`,
      lat: 8 + rnd() * 27,
      lon: 69 + rnd() * 27,
      color: LAND_COLORS[Math.floor(rnd() * LAND_COLORS.length)],
      r: 2.4,
      opacity: 0.75,
    }));
  }, []);
  return (
    <div className="w-full">
      <MiniIndia width={220} height={240} states={false}>
        {(project) => (
          <g clipPath="url(#mini-clip-220-240)">
            {pts.map((p) => {
              const [x, y] = project(p.lon, p.lat);
              return <circle key={p.id} cx={x} cy={y} r={p.r} fill={p.color} opacity={p.opacity} />;
            })}
          </g>
        )}
      </MiniIndia>
      <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-[9.5px] text-fg-muted">
        {["Forest", "Agriculture", "Arid", "Urban", "Water"].map((l, i) => (
          <span key={l} className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ background: colors[i] }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function TensorCube({ anchor }: { anchor: number }) {
  const N = 9;
  const T = 6;
  const slices = useMemo(() => {
    return Array.from({ length: T }, (_, s) => {
      const t = anchor - (T - 1 - s) * 12;
      const g = fieldGrid(cityValues(t, "pm"), t, "pm", 3.4);
      const cells: string[] = [];
      for (let i = N - 1; i >= 0; i--) for (let j = 0; j < N; j++) {
        const ii = Math.min(g.nLat - 1, i);
        const jj = Math.min(g.nLon - 1, j);
        cells.push(pmColor(g.values[ii * g.nLon + jj]));
      }
      return { t, cells };
    });
  }, [anchor]);
  return (
    <div className="flex h-[220px] items-center gap-6 rounded-2xl border border-border bg-surface-2 px-5">
      <div className="relative h-full flex-1 [perspective:900px]">
        <div className="absolute left-1/2 top-1/2 size-[120px] -translate-x-1/2 -translate-y-1/2 animate-[cube-spin_18s_linear_infinite] [transform-style:preserve-3d] [transform:rotateX(-24deg)_rotateY(-32deg)]">
          {slices.map((sl, s) => (
            <div
              key={sl.t}
              className="absolute inset-0 grid gap-[1.5px] rounded-sm p-[2px] ring-1 ring-white/30"
              style={{
                gridTemplateColumns: `repeat(${N}, 1fr)`,
                transform: `translateZ(${(s - (T - 1) / 2) * 22}px)`,
                background: "rgba(255,255,255,0.08)",
                opacity: 0.55 + (s / T) * 0.45,
              }}
            >
              {sl.cells.map((c, i) => (
                <div key={i} className="rounded-[1.5px]" style={{ background: c }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="w-[160px] shrink-0 text-xs">
        <div className="font-display text-sm font-semibold text-fg">Tensor</div>
        <div className="mt-1 font-mono text-[11px] text-fg-muted">(T, H, W, C)</div>
        <div className="mt-0.5 font-mono text-[11px] text-fg-muted">(72, 32, 32, 6)</div>
        <ul className="mt-3 space-y-1 text-fg-muted">
          <li>• T — hourly steps</li>
          <li>• H × W — 1° raster</li>
          <li>• C — PM, wind u/v, T, RH, fires</li>
        </ul>
        <div className="mt-2 text-[10.5px] text-fg-subtle">Slices shown 12 h apart.</div>
      </div>
    </div>
  );
}

function IngestionLog({ anchor }: { anchor: number }) {
  const rows = [
    { src: "CPCB", type: "PM2.5, AQI", n: CITIES.reduce((s, c) => s + c.stations, 0), lag: 0 },
    { src: "NASA FIRMS", type: "Fire hotspots", n: fireHotspots(anchor, 5).total, lag: 0 },
    { src: "ERA5", type: "Weather", n: 1024, lag: 1 },
    { src: "CAMS", type: "Benchmark", n: 33 * 120, lag: 2 },
    { src: "Calendar", type: "Proxies", n: 24, lag: 3 },
  ];
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <motion.div key={r.src} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="grid grid-cols-[72px_1fr_auto_auto] items-center gap-3 rounded-xl px-2 py-1.5 text-xs hover:bg-surface-sunken/60">
          <span className="tabular text-fg-muted">{fmtTime(anchor - r.lag)}</span>
          <span>
            <span className="font-semibold text-fg">{r.src}</span> <span className="text-fg-subtle">· {r.type}</span>
          </span>
          <span className="tabular text-fg">{fmtNum(r.n)}</span>
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" /> OK
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function Quality({ label, value, good, unit, invert }: { label: string; value: number; good: number; unit: string; invert?: boolean }) {
  const ok = invert ? value <= good : value >= good;
  const pct = invert ? Math.max(4, 100 - value * 10) : value;
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
      <div className="text-[11px] text-fg-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-display text-xl font-bold text-fg tabular">{value}</span>
        <span className="text-[11px] text-fg-subtle">{unit}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        <motion.div className={cn("h-full rounded-full", ok ? "bg-emerald-500" : "bg-amber-500")} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }} />
      </div>
      <div className="mt-1 text-[10px] text-fg-subtle">
        {invert ? "≤" : "≥"} {good}
        {unit}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">{icon}</span>
      <dt className="flex-1 text-fg-muted">{label}</dt>
      <dd className="font-semibold text-fg">{value}</dd>
    </div>
  );
}
