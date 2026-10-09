"use client";

import { Database, Flame, Thermometer, Timer } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { mulberry32 } from "@/lib/rng";

const EASE = [0.22, 1, 0.36, 1] as const;

function FusionViz() {
  const items = [
    { icon: <Database className="size-4" />, c: "#10b981" },
    { icon: <Thermometer className="size-4" />, c: "#0ea5e9" },
    { icon: <Flame className="size-4" />, c: "#f97316" },
    { icon: <Timer className="size-4" />, c: "#a855f7" },
  ];
  return (
    <div className="relative grid size-40 place-items-center">
      <div className="absolute inset-3 rounded-full border border-dashed border-border-strong" />
      <div className="absolute inset-0 animate-spin-slow">
        {items.map((it, i) => {
          const a = (i / items.length) * Math.PI * 2;
          return (
            <span
              key={i}
              className="absolute grid size-9 place-items-center rounded-xl text-white shadow-lift"
              style={{ background: it.c, left: `calc(50% + ${Math.cos(a) * 66}px - 18px)`, top: `calc(50% + ${Math.sin(a) * 66}px - 18px)` }}
            >
              {it.icon}
            </span>
          );
        })}
      </div>
      <div className="grid size-14 place-items-center rounded-2xl bg-primary text-xs font-bold text-primary-fg shadow-glow">fuse</div>
    </div>
  );
}

function WaveletViz() {
  const pts = (fn: (x: number) => number) =>
    Array.from({ length: 60 }, (_, i) => `${i === 0 ? "M" : "L"}${(i / 59) * 200},${fn(i / 59)}`).join(" ");
  const raw = pts((x) => 22 - 9 * Math.sin(x * 6) - 6 * Math.sin(x * 23) - (x > 0.6 && x < 0.66 ? 10 : 0));
  const trend = pts((x) => 62 - 8 * x - 4 * Math.sin(x * 2));
  const daily = pts((x) => 92 - 8 * Math.sin(x * 23));
  const spikes = pts((x) => 122 - (x > 0.6 && x < 0.66 ? 12 : 0) - 1.5 * Math.sin(x * 70));
  const L = (d: string, c: string, delay: number, w = 2) => (
    <motion.path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, delay, ease: EASE }} />
  );
  return (
    <svg viewBox="0 0 200 135" className="h-36 w-56">
      {L(raw, "var(--fg)", 0, 2.2)}
      {L(trend, "#6366f1", 0.5)}
      {L(daily, "#14b8a6", 0.7)}
      {L(spikes, "#f97316", 0.9)}
      <text x="202" y="64" fontSize="8" fill="var(--fg-subtle)" textAnchor="end">trend</text>
      <text x="202" y="96" fontSize="8" fill="var(--fg-subtle)" textAnchor="end">daily</text>
      <text x="202" y="134" fontSize="8" fill="var(--fg-subtle)" textAnchor="end">spikes</text>
    </svg>
  );
}

function GraphViz() {
  const rnd = mulberry32(8);
  const nodes = Array.from({ length: 9 }, () => ({ x: 20 + rnd() * 160, y: 15 + rnd() * 110 }));
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [7, 8], [2, 6], [0, 5], [4, 8],
  ];
  return (
    <svg viewBox="0 0 200 140" className="h-36 w-56">
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="var(--primary)"
          strokeWidth={1.6}
          initial={{ opacity: 0.12 }}
          animate={{ opacity: [0.12, 0.9, 0.12] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={5} fill="var(--surface-solid)" stroke="var(--primary)" strokeWidth={2} />
      ))}
    </svg>
  );
}

function ConvViz() {
  return (
    <div className="grid grid-cols-8 gap-1">
      {Array.from({ length: 64 }, (_, i) => {
        const r = Math.floor(i / 8);
        const c = i % 8;
        return (
          <motion.div
            key={i}
            className="size-5 rounded-[5px] bg-indigo-500"
            animate={{ opacity: [0.12, 0.85, 0.12] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: (r + c) * 0.12 }}
          />
        );
      })}
    </div>
  );
}

function AttnViz() {
  const rnd = mulberry32(3);
  return (
    <div className="grid grid-cols-8 gap-1">
      {Array.from({ length: 64 }, (_, i) => {
        const r = Math.floor(i / 8);
        const c = i % 8;
        const future = c > r;
        const v = future ? 0 : 0.15 + rnd() * 0.85 * (c === r ? 1 : 0.7);
        return (
          <motion.div
            key={i}
            className="size-5 rounded-[5px]"
            style={{ background: future ? "var(--surface-sunken)" : "#8b5cf6" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: future ? 1 : v }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.012 }}
          />
        );
      })}
    </div>
  );
}

function GateViz() {
  const bars = [
    { l: "Fires", v: 0.86, c: "#ef4444" },
    { l: "Neighbours", v: 0.62, c: "#f97316" },
    { l: "Wind", v: 0.48, c: "#3b82f6" },
    { l: "Traffic", v: 0.3, c: "#eab308" },
  ];
  return (
    <div className="w-56 space-y-2.5">
      {bars.map((b, i) => (
        <div key={b.l} className="grid grid-cols-[70px_1fr] items-center gap-2 text-[11px] text-fg-muted">
          <span>{b.l}</span>
          <div className="h-3 overflow-hidden rounded-full bg-surface-sunken">
            <motion.div className="h-full rounded-full" style={{ background: b.c }} initial={{ width: 0 }} whileInView={{ width: `${b.v * 100}%` }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12, duration: 0.9, ease: EASE }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const STEPS: { n: string; title: string; text: string; gap: string; viz: ReactNode; tint: string }[] = [
  { n: "01", title: "Multi-source fusion", text: "CPCB stations, ERA5 weather, NASA FIRMS fires and calendar proxies aligned hour by hour into one dataset.", gap: "Gap G1", viz: <FusionViz />, tint: "#10b981" },
  { n: "02", title: "Multi-resolution wavelets", text: "A causal wavelet transform splits every input window into trend, daily cycle and sudden spikes.", gap: "Gap G2", viz: <WaveletViz />, tint: "#14b8a6" },
  { n: "03", title: "Adaptive diffusion graph", text: "Cities are nodes; edges follow distance and the wind, and the network learns which transport paths matter.", gap: "Gap G3", viz: <GraphViz />, tint: "#22c55e" },
  { n: "04", title: "ConvLSTM", text: "Convolutional recurrent cells track plumes of smoke and weather moving across a 32×32 raster.", gap: "Gap G4", viz: <ConvViz />, tint: "#6366f1" },
  { n: "05", title: "Transformer encoder", text: "Causally-masked self-attention links what happened days ago to tomorrow — no peeking at the future.", gap: "Gap G5", viz: <AttnViz />, tint: "#8b5cf6" },
  { n: "06", title: "Causal attention gate", text: "A sparse feature gate reports how much each source pushed the forecast — checked with deletion tests.", gap: "Gap G6", viz: <GateViz />, tint: "#ec4899" },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-7xl px-5 py-28 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-primary">How it works</div>
            <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl">
              Six ideas.
              <br />
              <span className="text-gradient">One forecast you can trust.</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-muted">
              MW-AeroFusion-Net stacks complementary modules — each closing a gap identified in the literature — into a single network small enough to train on a student GPU.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["PyTorch", "Wavelets", "Graph NN", "ConvLSTM", "Transformer", "Quantile loss"].map((t) => (
                <span key={t} className="rounded-full border border-border bg-surface-solid/70 px-3 py-1 text-xs font-medium text-fg-muted">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="space-y-5">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
              className="card group flex flex-col gap-6 overflow-hidden !rounded-[28px] p-6 sm:flex-row sm:items-center sm:p-8"
            >
              <div
                className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
                style={{ background: s.tint }}
              />
              <div className="relative min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold" style={{ color: s.tint }}>
                    {s.n}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: s.tint, background: `color-mix(in oklab, ${s.tint} 12%, transparent)` }}>
                    {s.gap}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-fg">{s.title}</h3>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-fg-muted">{s.text}</p>
              </div>
              <div className="relative grid shrink-0 place-items-center sm:w-60">{s.viz}</div>
              {i < STEPS.length - 1 && <span className="sr-only">next</span>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
