"use client";

import { Brain, Database, Flame, GitBranch, Grid3x3, Layers, Network, Sparkles, Target, Thermometer, Timer, Waves } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { ARCH_MODULES } from "@/data/model-lab";
import { cn } from "@/lib/utils";

const VB = { w: 1160, h: 450 };

type NodeId = "cpcb" | "era5" | "firms" | "cal" | "input" | "wavelet" | "graph" | "convlstm" | "transformer" | "attention" | "output";

interface NodeDef {
  id: NodeId;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  icon: ReactNode;
  tint: string;
  module?: (typeof ARCH_MODULES)[number]["id"];
  shape?: string;
}

const NODES: NodeDef[] = [
  { id: "cpcb", x: 12, y: 52, w: 150, h: 54, title: "CPCB", sub: "PM2.5 · hourly", icon: <Database />, tint: "#10b981", module: "input" },
  { id: "era5", x: 12, y: 134, w: 150, h: 54, title: "ERA5 / IMD", sub: "wind · T · RH · PBL", icon: <Thermometer />, tint: "#0ea5e9", module: "input" },
  { id: "firms", x: 12, y: 216, w: 150, h: 54, title: "NASA FIRMS", sub: "fire counts", icon: <Flame />, tint: "#f97316", module: "input" },
  { id: "cal", x: 12, y: 298, w: 150, h: 54, title: "Calendar", sub: "hour · holidays", icon: <Timer />, tint: "#a855f7", module: "input" },
  { id: "input", x: 200, y: 160, w: 150, h: 92, title: "Preprocess", sub: "clean · align · scale", icon: <Layers />, tint: "#64748b", module: "input", shape: "(B, T=72, N=33, F)" },
  { id: "wavelet", x: 392, y: 70, w: 168, h: 82, title: "Wavelet MRA", sub: "trend · daily · spikes", icon: <Waves />, tint: "#14b8a6", module: "wavelet", shape: "(B, T, N, 3F)" },
  { id: "graph", x: 392, y: 262, w: 168, h: 82, title: "Adaptive Graph", sub: "diffusion conv", icon: <Network />, tint: "#22c55e", module: "graph", shape: "A ∈ ℝ^{33×33}" },
  { id: "convlstm", x: 596, y: 166, w: 160, h: 82, title: "ConvLSTM", sub: "32×32 raster", icon: <Grid3x3 />, tint: "#6366f1", module: "convlstm", shape: "(B, T, 32, 32, 32)" },
  { id: "transformer", x: 790, y: 166, w: 160, h: 82, title: "Transformer", sub: "causal self-attn", icon: <Brain />, tint: "#8b5cf6", module: "transformer", shape: "(B·N, T, 64)" },
  { id: "attention", x: 984, y: 166, w: 170, h: 82, title: "Causal Attention", sub: "feature gate", icon: <Sparkles />, tint: "#ec4899", module: "attention", shape: "softmax over F" },
  { id: "output", x: 984, y: 300, w: 170, h: 118, title: "Outputs", sub: "P10 · P50 · P90 · AQI · φ", icon: <Target />, tint: "#ef4444", module: "output", shape: "(B, N, 3h, 3q)" },
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<NodeId, NodeDef>;

const EDGES: [NodeId, NodeId][] = [
  ["cpcb", "input"],
  ["era5", "input"],
  ["firms", "input"],
  ["cal", "input"],
  ["input", "wavelet"],
  ["input", "graph"],
  ["wavelet", "convlstm"],
  ["graph", "convlstm"],
  ["convlstm", "transformer"],
  ["transformer", "attention"],
  ["attention", "output"],
];

function edgePath(a: NodeDef, b: NodeDef) {
  if (a.id === "attention" && b.id === "output") {
    const x = a.x + a.w / 2;
    return `M${x},${a.y + a.h} L${x},${b.y}`;
  }
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

export function ArchitectureDiagram() {
  const [sel, setSel] = useState<NodeId>("graph");
  const [hover, setHover] = useState<NodeId | null>(null);
  const active = hover ?? sel;
  const mod = ARCH_MODULES.find((m) => m.id === byId[sel].module) ?? ARCH_MODULES[0];

  return (
    <div>
      <div className="scrollbar-thin -mx-1 overflow-x-auto px-1 pb-2">
        <div className="relative min-w-[960px]" style={{ aspectRatio: `${VB.w} / ${VB.h}` }}>
          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="absolute inset-0 size-full" aria-hidden>
            <defs>
              <linearGradient id="edge-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="var(--primary)" stopOpacity="0.15" />
                <stop offset="1" stopColor="var(--primary)" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* backdrop groups */}
            <rect x={378} y={50} width={196} height={316} rx={22} fill="var(--primary)" opacity={0.045} />
            <text x={476} y={386} textAnchor="middle" fontSize={11} fill="var(--fg-subtle)" fontWeight={600} letterSpacing={1.2}>
              FEATURE LAYER
            </text>
            <rect x={582} y={140} width={384} height={134} rx={22} fill="#6366f1" opacity={0.05} />
            <text x={768} y={294} textAnchor="middle" fontSize={11} fill="var(--fg-subtle)" fontWeight={600} letterSpacing={1.2}>
              SPATIO-TEMPORAL ENGINE
            </text>
            {EDGES.map(([a, b], i) => {
              const d = edgePath(byId[a], byId[b]);
              const lit = active === a || active === b;
              return (
                <g key={`${a}-${b}`}>
                  <path d={d} fill="none" stroke={lit ? "var(--primary)" : "var(--border-strong)"} strokeWidth={lit ? 2.4 : 1.6} style={{ transition: "stroke 300ms" }} />
                  <path d={d} fill="none" stroke="var(--primary)" strokeOpacity={lit ? 0.8 : 0.35} strokeWidth={2} strokeDasharray="4 10" className="animate-dash" />
                  <circle r={lit ? 4 : 3} fill="var(--primary)">
                    <animateMotion dur={`${2 + (i % 3) * 0.4}s`} repeatCount="indefinite" path={d} begin={`${(i * 0.23) % 2}s`} />
                  </circle>
                </g>
              );
            })}
          </svg>
          {NODES.map((n, i) => {
            const isActive = active === n.id || (byId[active].module === n.module && n.module === "input" && byId[active].module === "input");
            return (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 260, damping: 24 }}
                whileHover={{ y: -3 }}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setSel(n.id)}
                className={cn(
                  "glass absolute flex items-center gap-2 rounded-[20px] px-2.5 text-left transition-[box-shadow] duration-300",
                  isActive ? "" : "",
                )}
                style={{
                  left: `${(n.x / VB.w) * 100}%`,
                  top: `${(n.y / VB.h) * 100}%`,
                  width: `${(n.w / VB.w) * 100}%`,
                  height: `${(n.h / VB.h) * 100}%`,
                  boxShadow: isActive ? `0 0 0 2px ${n.tint}, 0 14px 34px -14px ${n.tint}` : undefined,
                }}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-xl [&_svg]:size-4"
                  style={{ color: n.tint, background: `color-mix(in oklab, ${n.tint} 14%, transparent)` }}
                >
                  {n.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[12.5px] font-semibold leading-tight text-fg">{n.title}</span>
                  <span className="block truncate text-[10.5px] leading-tight text-fg-muted">{n.sub}</span>
                  {n.shape && <span className="mt-0.5 block truncate font-mono text-[9.5px] text-fg-subtle">{n.shape}</span>}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mod.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="mt-3 flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-4 sm:flex-row sm:items-center"
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl text-white [&_svg]:size-5" style={{ background: byId[sel].tint }}>
            {byId[sel].icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[15px] font-semibold text-fg">{mod.title}</span>
              <span className="text-xs text-fg-muted">— {mod.subtitle}</span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{mod.detail}</p>
          </div>
          {mod.gap !== "—" && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">
              <GitBranch className="size-3.5" /> Addresses research gap {mod.gap}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
