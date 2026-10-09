"use client";

import { Check, Copy, Crosshair, FlaskConical, MapPin, Sigma, Terminal, Timer, Trophy, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTip, Legend } from "@/components/charts/chart-tooltip";
import { PageHero } from "@/components/layout/page-hero";
import { ArchitectureDiagram } from "@/components/model-lab/architecture";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { Skeleton } from "@/components/ui/primitives";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { PillTabs, Segmented } from "@/components/ui/segmented";
import { EXPERIMENTS, HYPERPARAMS, LADDER, METRICS_STATUS } from "@/data/model-lab";
import { useAnchor } from "@/hooks/use-anchor";
import { useCity } from "@/hooks/use-city";
import { CITIES } from "@/lib/cities";
import { fmtDay } from "@/lib/format";
import { gaussian } from "@/lib/rng";
import { adjacencyMatrix } from "@/lib/sim/graph";
import { backtest } from "@/lib/sim/forecast";
import { cn } from "@/lib/utils";

type Tab = "overview" | "architecture" | "ablation" | "training" | "hyper" | "runs";
type H = "1h" | "24h" | "48h";
type M = "mae" | "rmse" | "r2";

const SHORT: Record<string, string> = {
  Persistence: "Persist.",
  "Seasonal naive (24 h)": "S-naive",
  "LightGBM + SHAP": "LightGBM",
  LSTM: "LSTM",
  "CNN-LSTM": "CNN-LSTM",
  ConvLSTM: "ConvLSTM",
  "+ Adaptive diffusion graph": "+Graph",
  "+ Wavelet multi-resolution": "+Wavelet",
  "+ Transformer encoder": "+Transf.",
  "MW-AeroFusion-Net": "Ours",
};

export function ModelLabView() {
  const [tab, setTab] = useState<Tab>("overview");
  const best = LADDER.find((r) => r.ours)!;
  const conv = LADDER.find((r) => r.model === "ConvLSTM")!;
  const pct = (a: number, b: number) => Math.round(((b - a) / b) * 100);

  return (
    <div>
      <PageHero
        sky={{
          variant: "mountains",
          pm: 30,
          seed: 5,
          pathLabels: [
            { title: "Wavelet", subtitle: "Multi-resolution" },
            { title: "Adaptive Graph", subtitle: "Spatial relations" },
            { title: "ConvLSTM", subtitle: "Spatio-temporal" },
            { title: "Transformer", subtitle: "Long-range" },
            { title: "Causal Attention", subtitle: "Explainability" },
          ],
        }}
        height="min-h-[330px]"
        title={
          <>
            Model <span className="text-gradient">Lab</span>
          </>
        }
        subtitle="Architecture, ablations and training of MW-AeroFusion-Net — every number traceable to a run."
      >
        <PillTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "architecture", label: "Architecture" },
            { value: "ablation", label: "Ablation study" },
            { value: "training", label: "Training" },
            { value: "hyper", label: "Hyperparameters" },
            { value: "runs", label: "Experiments" },
          ]}
        />
      </PageHero>

      {METRICS_STATUS !== "measured" && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-[13px] text-amber-900 dark:text-amber-200"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <b>Illustrative results.</b> Metrics, curves and runs on this page show the reporting format while training is in progress. They are{" "}
            <b>not measured results</b>. Replace them with <code className="rounded bg-amber-500/15 px-1 font-mono text-[12px]">ml/runs/&lt;run_id&gt;/metrics.json</code> and set{" "}
            <code className="rounded bg-amber-500/15 px-1 font-mono text-[12px]">METRICS_STATUS = &quot;measured&quot;</code>.
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          {tab === "overview" && (
            <>
              <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
                <StaggerItem>
                  <Kpi icon={<Trophy />} label="Test MAE · 24 h" value={best.metrics["24h"].mae} digits={1} unit="µg/m³" tint="#f59e0b" footer={<Badge tone="primary">↓ {pct(best.metrics["24h"].mae, conv.metrics["24h"].mae)}% vs ConvLSTM</Badge>} />
                </StaggerItem>
                <StaggerItem>
                  <Kpi icon={<Crosshair />} label="Test RMSE · 24 h" value={best.metrics["24h"].rmse} digits={1} unit="µg/m³" tint="#ef4444" footer={<Badge tone="primary">↓ {pct(best.metrics["24h"].rmse, conv.metrics["24h"].rmse)}% vs ConvLSTM</Badge>} />
                </StaggerItem>
                <StaggerItem>
                  <Kpi icon={<Sigma />} label="R² · 24 h" value={best.metrics["24h"].r2} digits={2} tint="#6366f1" footer={<Badge tone="primary">+{(best.metrics["24h"].r2 - conv.metrics["24h"].r2).toFixed(2)} vs ConvLSTM</Badge>} />
                </StaggerItem>
                <StaggerItem>
                  <Kpi icon={<Timer />} label="Forecast horizons" value="1 · 24 · 48 h" tint="#0ea5e9" footer={<span>quantile heads P10/P50/P90</span>} />
                </StaggerItem>
                <StaggerItem>
                  <Kpi icon={<FlaskConical />} label="Parameters" value="0.85 M" tint="#14b8a6" footer={<span>fits a T4 / laptop GPU</span>} />
                </StaggerItem>
                <StaggerItem>
                  <Kpi icon={<MapPin />} label="Graph nodes" value={CITIES.length} unit="cities" tint="#10b981" footer={<span>adaptive adjacency</span>} />
                </StaggerItem>
              </Stagger>

              <Card className="mt-4">
                <CardHeader title="MW-AeroFusion-Net" subtitle="Multi-resolution Wavelet · Adaptive Diffusion Graph · ConvLSTM · Transformer · Causal Attention — click a block" />
                <ArchitectureDiagram />
              </Card>

              <div className="mt-4 grid gap-4 xl:grid-cols-12">
                <div className="xl:col-span-5">
                  <ModelComparison />
                </div>
                <div className="xl:col-span-7">
                  <TrainingCurves />
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <PredVsActual />
                <ErrorHistogram />
              </div>
            </>
          )}

          {tab === "architecture" && (
            <div className="grid gap-4">
              <Card>
                <CardHeader title="Data flow" subtitle="Tensor shapes per block · B = batch, T = 72 h window, N = 33 nodes" />
                <ArchitectureDiagram />
              </Card>
              <div className="grid gap-4 xl:grid-cols-12">
                <Card className="xl:col-span-7">
                  <CardHeader title="Adaptive adjacency (demo)" subtitle="Row-normalised diffusion weights between the 33 city nodes at the current hour" />
                  <AdjacencyHeatmap />
                </Card>
                <Card className="xl:col-span-5">
                  <CardHeader title="Research gaps → modules" subtitle="From Chapter 2 of the project report" />
                  <div className="space-y-2">
                    {[
                      ["G1", "Limited multi-source integration", "Multi-source fusion pipeline"],
                      ["G2", "No multi-resolution temporal analysis", "Wavelet decomposition"],
                      ["G3", "Inadequate spatial dependency modelling", "Adaptive diffusion graph"],
                      ["G4", "Inefficient spatio-temporal learning", "ConvLSTM"],
                      ["G5", "Poor long-range dependency capture", "Transformer encoder"],
                      ["G6", "Lack of explainability", "Causal attention gate"],
                    ].map(([g, gap, sol], i) => (
                      <motion.div
                        key={g}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5"
                      >
                        <span className="grid size-9 place-items-center rounded-lg bg-primary-soft font-mono text-xs font-bold text-primary">{g}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-fg">{sol}</div>
                          <div className="truncate text-[11px] text-fg-muted">{gap}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {tab === "ablation" && <Ablation />}
          {tab === "training" && (
            <div className="grid gap-4 xl:grid-cols-2">
              <TrainingCurves />
              <LrSchedule />
              <HorizonCurves />
              <Card>
                <CardHeader title="Training recipe" subtitle="Stability measures from the report (§5.3)" />
                <ul className="space-y-2.5 text-[13px] text-fg">
                  {[
                    ["Mixed precision", "torch.autocast fp16 + GradScaler cuts VRAM ~40%"],
                    ["Gradient clipping", "‖g‖₂ ≤ 1.0 prevents explosions in ConvLSTM + Transformer"],
                    ["Early stopping", "patience 8 on validation pinball loss"],
                    ["Sparse attention gate", "λ‖gate‖₁ keeps attributions focused"],
                    ["No look-ahead", "causal wavelet, causal attention mask, chronological split"],
                    ["Reproducibility", "seeded runs; config + git SHA saved with every checkpoint"],
                  ].map(([k, v]) => (
                    <li key={k} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        <b>{k}.</b> <span className="text-fg-muted">{v}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
          {tab === "hyper" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {HYPERPARAMS.map((g, i) => (
                <motion.div key={g.group} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="h-full">
                    <CardHeader title={g.group} />
                    <dl className="divide-y divide-border">
                      {g.items.map(([k, v]) => (
                        <div key={k} className="flex items-start justify-between gap-4 py-2 text-[13px]">
                          <dt className="text-fg-muted">{k}</dt>
                          <dd className="text-right font-medium text-fg">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          {tab === "runs" && <Experiments />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ModelComparison() {
  const [h, setH] = useState<H>("24h");
  const [m, setM] = useState<M>("mae");
  const data = LADDER.map((r) => ({ name: SHORT[r.model] ?? r.model, full: r.model, v: r.metrics[h][m], ours: !!r.ours }));
  return (
    <Card className="h-full">
      <CardHeader
        title="Model comparison"
        subtitle={`${m.toUpperCase()} at ${h} · lower is better${m === "r2" ? " (except R²)" : ""}`}
        action={
          <Segmented
            size="sm"
            value={m}
            onChange={setM}
            options={[
              { value: "mae", label: "MAE" },
              { value: "rmse", label: "RMSE" },
              { value: "r2", label: "R²" },
            ]}
          />
        }
      />
      <Segmented
        size="sm"
        className="mb-3"
        value={h}
        onChange={setH}
        options={[
          { value: "1h", label: "t+1" },
          { value: "24h", label: "t+24" },
          { value: "48h", label: "t+48" },
        ]}
      />
      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="ours-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#34d399" />
                <stop offset="1" stopColor="var(--primary-strong)" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={52} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} domain={m === "r2" ? [0, 1] : [0, "auto"]} />
            <Tooltip
              cursor={{ fill: "var(--surface-sunken)", opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return <ChartTip title={d.full} rows={[{ label: m.toUpperCase(), value: m === "r2" ? d.v.toFixed(2) : `${d.v.toFixed(1)} µg/m³` }]} />;
              }}
            />
            <Bar dataKey="v" radius={[8, 8, 3, 3]} animationDuration={900} label={{ position: "top", fontSize: 10, fill: "var(--fg-muted)", formatter: (v: unknown) => (m === "r2" ? Number(v).toFixed(2) : Number(v).toFixed(1)) }}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.ours ? "url(#ours-bar)" : "var(--border-strong)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function curves() {
  const out = [];
  for (let e = 1; e <= 60; e++) {
    const train = 0.92 * Math.exp(-e / 9) + 0.17 + 0.012 * gaussian(7, e);
    const val = 0.98 * Math.exp(-e / 10.5) + 0.225 + 0.016 * gaussian(11, e) + (e > 44 ? 0.0025 * (e - 44) : 0);
    out.push({ e, train: Math.max(0.12, train), val: Math.max(0.16, val) });
  }
  return out;
}

function TrainingCurves({ compact }: { compact?: boolean }) {
  const data = useMemo(() => curves(), []);
  const best = data.reduce((m, d) => (d.val < m.val ? d : m), data[0]);
  return (
    <Card>
      <CardHeader title="Training & validation loss" subtitle="Pinball loss (normalised) · illustrative" action={<Badge tone="warn">illustrative</Badge>} />
      <Legend
        className="mb-2"
        items={[
          { label: "Train", color: "#3b82f6" },
          { label: "Validation", color: "var(--primary)" },
        ]}
      />
      <div className={compact ? "h-[220px]" : "h-[280px]"}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="e" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis scale="log" domain={[0.1, 1.2]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => v.toFixed(1)} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { e: number; train: number; val: number };
                return (
                  <ChartTip
                    title={`Epoch ${d.e}`}
                    rows={[
                      { label: "Train", value: d.train.toFixed(3), color: "#3b82f6" },
                      { label: "Validation", value: d.val.toFixed(3), color: "var(--primary)" },
                    ]}
                  />
                );
              }}
            />
            <ReferenceLine x={best.e} stroke="var(--fg-subtle)" strokeDasharray="3 4" label={{ value: "best ckpt", fontSize: 10, fill: "var(--fg-muted)", position: "insideTopRight" }} />
            <Line type="monotone" dataKey="train" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="val" stroke="var(--primary)" strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function LrSchedule() {
  const data = Array.from({ length: 60 }, (_, i) => {
    const e = i + 1;
    const lr = e <= 3 ? (1e-3 * e) / 3 : 1e-3 * 0.5 * (1 + Math.cos((Math.PI * (e - 3)) / 57));
    return { e, lr: lr * 1000 };
  });
  return (
    <Card>
      <CardHeader title="Learning-rate schedule" subtitle="Linear warm-up (3 epochs) → cosine decay · ×10⁻³" />
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="e" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={({ active, payload }) => (active && payload?.length ? <ChartTip title={`Epoch ${(payload[0].payload as { e: number }).e}`} rows={[{ label: "lr ×10⁻³", value: (payload[0].payload as { lr: number }).lr.toFixed(3) }]} /> : null)} />
            <Line type="monotone" dataKey="lr" stroke="#8b5cf6" strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function HorizonCurves() {
  const data = Array.from({ length: 60 }, (_, i) => {
    const e = i + 1;
    const f = Math.exp(-e / 11);
    return { e, h1: 7.4 + 18 * f, h24: 15.1 + 30 * f, h48: 19 + 34 * f };
  });
  return (
    <Card>
      <CardHeader title="Validation MAE by horizon" subtitle="µg/m³ per epoch · illustrative" action={<Badge tone="warn">illustrative</Badge>} />
      <Legend
        className="mb-2"
        items={[
          { label: "t+1", color: "#10b981" },
          { label: "t+24", color: "#f59e0b" },
          { label: "t+48", color: "#ef4444" },
        ]}
      />
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="e" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
            <Line type="monotone" dataKey="h1" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="h24" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="h48" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function PredVsActual() {
  const anchor = useAnchor();
  const city = useCity();
  const data = useMemo(() => (anchor === null ? null : backtest(city, anchor, 24 * 21, 24, 4)), [anchor, city]);
  return (
    <Card>
      <CardHeader title={`Predicted vs observed · ${city.name}`} subtitle="24 h-ahead, last 3 weeks (demo simulator)" action={<Badge tone="warn">simulated</Badge>} />
      <Legend
        className="mb-2"
        items={[
          { label: "Observed", color: "var(--fg)" },
          { label: "Predicted", color: "var(--primary)" },
        ]}
      />
      {data ? (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 6" />
              <XAxis dataKey="t" tickFormatter={(t: number) => fmtDay(t)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Line type="monotone" dataKey="actual" stroke="var(--fg)" strokeOpacity={0.6} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="pred" stroke="var(--primary)" strokeWidth={1.8} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Skeleton className="h-[220px]" />
      )}
    </Card>
  );
}

function ErrorHistogram() {
  const anchor = useAnchor();
  const res = useMemo(() => {
    if (anchor === null) return null;
    const errs: number[] = [];
    for (const c of CITIES) for (const b of backtest(c, anchor, 24 * 7, 24, 6)) errs.push(b.pred - b.actual);
    const bins = Array.from({ length: 21 }, (_, i) => ({ x: -50 + i * 5, n: 0 }));
    for (const e of errs) {
      const i = Math.max(0, Math.min(20, Math.round((e + 50) / 5)));
      bins[i].n++;
    }
    const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
    const sd = Math.sqrt(errs.reduce((a, b) => a + (b - mean) ** 2, 0) / errs.length);
    const mae = errs.reduce((a, b) => a + Math.abs(b), 0) / errs.length;
    return { bins, mean, sd, mae };
  }, [anchor]);
  return (
    <Card>
      <CardHeader title="Error distribution" subtitle="Predicted − observed, all cities, 24 h ahead" action={<Badge tone="warn">simulated</Badge>} />
      {res ? (
        <div className="flex gap-3">
          <div className="h-[244px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={res.bins} margin={{ top: 8, right: 0, bottom: 0, left: -22 }} barCategoryGap={1}>
                <CartesianGrid vertical={false} strokeDasharray="3 6" />
                <XAxis dataKey="x" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <ReferenceLine x={0} stroke="var(--fg-subtle)" strokeDasharray="3 3" />
                <Bar dataKey="n" radius={[4, 4, 0, 0]} animationDuration={800}>
                  {res.bins.map((b) => (
                    <Cell key={b.x} fill={Math.abs(b.x) <= 10 ? "var(--primary)" : "color-mix(in oklab, var(--primary) 45%, transparent)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="w-[104px] space-y-2 rounded-2xl bg-surface-sunken/70 p-3 text-xs">
            <Stat label="Mean error" value={res.mean.toFixed(1)} />
            <Stat label="Std. dev." value={res.sd.toFixed(1)} />
            <Stat label="MAE" value={res.mae.toFixed(1)} />
          </div>
        </div>
      ) : (
        <Skeleton className="h-[244px]" />
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-fg-muted">{label}</div>
      <div className="font-display text-base font-bold tabular text-fg">
        {value}
        <span className="ml-0.5 text-[9.5px] font-medium text-fg-subtle">µg/m³</span>
      </div>
    </div>
  );
}

function Ablation() {
  const [h, setH] = useState<H>("24h");
  const rows = LADDER;
  const maxMae = Math.max(...rows.map((r) => r.metrics[h].mae));
  return (
    <Card>
      <CardHeader
        title="Ablation ladder"
        subtitle="Each rung adds one component; Δ is relative to the previous rung"
        action={
          <Segmented
            size="sm"
            value={h}
            onChange={setH}
            options={[
              { value: "1h", label: "t+1" },
              { value: "24h", label: "t+24" },
              { value: "48h", label: "t+48" },
            ]}
          />
        }
      />
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-fg-subtle">
              <th className="px-2 pb-2 font-semibold">Rung</th>
              <th className="px-2 pb-2 font-semibold">Model</th>
              <th className="px-2 pb-2 font-semibold">Adds</th>
              <th className="px-2 pb-2 font-semibold">MAE</th>
              <th className="px-2 pb-2 text-right font-semibold">RMSE</th>
              <th className="px-2 pb-2 text-right font-semibold">R²</th>
              <th className="px-2 pb-2 text-right font-semibold">Δ MAE</th>
              <th className="px-2 pb-2 text-right font-semibold">Params</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const prev = rows[i - 1];
              const delta = prev ? r.metrics[h].mae - prev.metrics[h].mae : 0;
              return (
                <motion.tr
                  key={r.rung}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn("border-t border-border", r.ours && "bg-primary-soft/70")}
                >
                  <td className="px-2 py-2.5">
                    <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold", r.ours ? "bg-primary text-primary-fg" : "bg-surface-sunken text-fg-muted")}>{r.rung}</span>
                  </td>
                  <td className={cn("px-2 py-2.5 font-medium", r.ours ? "text-primary" : "text-fg")}>{r.model}</td>
                  <td className="px-2 py-2.5 text-xs text-fg-muted">{r.adds}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-sunken">
                        <motion.div
                          className={cn("h-full rounded-full", r.ours ? "bg-primary" : "bg-fg-subtle")}
                          initial={{ width: 0 }}
                          animate={{ width: `${(r.metrics[h].mae / maxMae) * 100}%` }}
                          transition={{ delay: 0.1 + i * 0.04, duration: 0.6 }}
                        />
                      </div>
                      <span className="font-semibold tabular text-fg">{r.metrics[h].mae.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular text-fg-muted">{r.metrics[h].rmse.toFixed(1)}</td>
                  <td className="px-2 py-2.5 text-right tabular text-fg-muted">{r.metrics[h].r2.toFixed(2)}</td>
                  <td className={cn("px-2 py-2.5 text-right font-semibold tabular", delta < 0 ? "text-emerald-600 dark:text-emerald-300" : delta > 0 ? "text-red-500" : "text-fg-subtle")}>
                    {prev ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs text-fg-subtle">{r.params}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-fg-muted">
        Ladder methodology: whichever rung is best on validation at the freeze date ships under its own name. If a later rung does not improve on an earlier one, that is
        reported as a finding rather than hidden.
      </p>
    </Card>
  );
}

function AdjacencyHeatmap() {
  const anchor = useAnchor();
  const cities = useMemo(() => [...CITIES].sort((a, b) => b.lat - a.lat), []);
  const m = useMemo(() => (anchor === null ? null : adjacencyMatrix(anchor, cities)), [anchor, cities]);
  const [hover, setHover] = useState<[number, number] | null>(null);
  if (!m) return <Skeleton className="aspect-square w-full" />;
  const max = Math.max(...m.flat());
  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: `repeat(${cities.length}, minmax(0, 1fr))` }} onMouseLeave={() => setHover(null)}>
        {m.flatMap((row, i) =>
          row.map((v, j) => (
            <div
              key={`${i}-${j}`}
              onMouseEnter={() => setHover([i, j])}
              className={cn("aspect-square rounded-[2px] transition-transform duration-150", hover && hover[0] === i && hover[1] === j && "scale-150 ring-1 ring-fg")}
              style={{ background: v > 0 ? `color-mix(in oklab, var(--primary) ${Math.round(18 + (v / max) * 82)}%, transparent)` : "var(--surface-sunken)" }}
            />
          )),
        )}
      </div>
      <div className="w-full shrink-0 rounded-2xl bg-surface-sunken/70 p-3 text-xs lg:w-44">
        {hover ? (
          <>
            <div className="text-fg-muted">From</div>
            <div className="font-semibold text-fg">{cities[hover[0]].name}</div>
            <div className="mt-1 text-fg-muted">To</div>
            <div className="font-semibold text-fg">{cities[hover[1]].name}</div>
            <div className="mt-2 font-display text-lg font-bold text-primary tabular">{m[hover[0]][hover[1]].toFixed(3)}</div>
          </>
        ) : (
          <div className="text-fg-muted">Hover a cell. Rows are sources, columns targets, sorted north → south. Weights follow the wind, so the matrix changes hour by hour.</div>
        )}
      </div>
    </div>
  );
}

function Experiments() {
  const [copied, setCopied] = useState(false);
  const cmd = "make data && make train RUN=r6-full-s42 && make eval RUN=r6-full-s42";
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-7">
        <CardHeader title="Experiment runs" subtitle="Registered in ml/configs/ablations — each produces ml/runs/<run_id>/" />
        <div className="space-y-2">
          {EXPERIMENTS.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5"
            >
              <span className="size-2 rounded-full bg-amber-400" />
              <span className="font-mono text-xs font-semibold text-fg">{e.id}</span>
              <span className="hidden text-xs text-fg-muted sm:inline">{e.model}</span>
              <span className="ml-auto text-xs text-fg-subtle">{e.notes}</span>
              <Badge tone="warn">{e.status}</Badge>
            </motion.div>
          ))}
        </div>
      </Card>
      <Card className="xl:col-span-5">
        <CardHeader title="Reproduce" subtitle="One command per stage" icon={<Terminal className="size-4" />} />
        <div className="relative rounded-2xl bg-[#0b1512] p-4 font-mono text-[12.5px] leading-relaxed text-emerald-200">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(cmd);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20"
            aria-label="Copy"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
          <div className="text-white/40"># from the repository root</div>
          <div>
            <span className="text-white/50">$</span> make data
          </div>
          <div>
            <span className="text-white/50">$</span> make train RUN=r6-full-s42
          </div>
          <div>
            <span className="text-white/50">$</span> make eval RUN=r6-full-s42
          </div>
          <div className="mt-2 text-white/40"># → ml/runs/r6-full-s42/metrics.json</div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-fg-muted">
          Every run stores its config, git commit and metrics. The API&apos;s <code className="font-mono">/metrics</code> endpoint serves them to this page.
        </p>
      </Card>
    </div>
  );
}
