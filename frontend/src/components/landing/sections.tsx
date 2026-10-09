"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Building,
  CloudSun,
  FileChartColumn,
  FlaskConical,
  HeartPulse,
  MapPinned,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ThermometerSun,
} from "lucide-react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { LogoMark } from "@/components/layout/logo";
import { SkyScene } from "@/components/sky/sky-scene";
import { AqiBadge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/primitives";
import { useAnchor } from "@/hooks/use-anchor";
import { categoryForPm } from "@/lib/aqi";
import { CITIES } from "@/lib/cities";
import { DATA_MODE } from "@/lib/nav";
import { pmAt } from "@/lib/sim/core";
import { forecastSeries } from "@/lib/sim/forecast";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function LiveStrip() {
  const anchor = useAnchor();
  const items = useMemo(
    () => (anchor === null ? [] : CITIES.map((c) => ({ c, v: pmAt(c, anchor) })).sort((a, b) => b.v - a.v)),
    [anchor],
  );
  return (
    <section className="relative py-6">
      <div className="mx-auto mb-3 flex max-w-7xl items-center gap-2 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-fg-subtle lg:px-8">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-500" />
          <span className="relative size-2 rounded-full bg-emerald-500" />
        </span>
        Right now across India {DATA_MODE === "demo" && <span className="normal-case tracking-normal text-amber-600 dark:text-amber-300">· demo data</span>}
      </div>
      <div className="mask-fade-x relative overflow-hidden">
        <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
          {[...items, ...items].map(({ c, v }, i) => (
            <Link
              key={`${c.slug}-${i}`}
              href={`/forecast?city=${c.slug}`}
              className="glass flex items-center gap-3 rounded-full px-4 py-2.5 transition duration-300 hover:-translate-y-0.5"
            >
              <span className="size-2.5 rounded-full" style={{ background: categoryForPm(v).color }} />
              <span className="text-sm font-semibold text-fg">{c.name}</span>
              <span className="font-display text-sm font-bold tabular text-fg">{Math.round(v)}</span>
              <AqiBadge pm={v} size="xs" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TiltCard({ children, className, href }: { children: ReactNode; className?: string; href: string }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glow = useMotionTemplate`radial-gradient(500px circle at ${gx} ${gy}, color-mix(in oklab, var(--primary) 14%, transparent), transparent 45%)`;
  return (
    <motion.div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        mx.set(x);
        my.set(y);
        rx.set((0.5 - y) * 7);
        ry.set((x - 0.5) * 9);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={cn("group relative", className)}
    >
      <Link href={href} className="card relative block h-full overflow-hidden !rounded-[28px] p-6 transition-shadow duration-300 hover:shadow-lift">
        <motion.div className="pointer-events-none absolute inset-0" style={{ background: glow }} />
        {children}
        <ArrowUpRight className="absolute right-5 top-5 size-5 text-fg-subtle transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
    </motion.div>
  );
}

export function FeatureBento() {
  const anchor = useAnchor();
  const delhi = useMemo(() => (anchor === null ? [] : forecastSeries(CITIES[0], anchor, 48, 0, 2).map((p) => p.pred)), [anchor]);
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-12 max-w-2xl">
        <div className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-primary">Inside the dashboard</div>
        <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl">
          From a single number to a <span className="text-gradient">decision.</span>
        </h2>
      </motion.div>
      <div className="grid auto-rows-[minmax(220px,auto)] gap-4 md:grid-cols-6">
        <motion.div className="md:col-span-4" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }}>
          <TiltCard href="/forecast" className="h-full">
            <div className="flex h-full flex-col gap-6 sm:flex-row sm:items-end">
              <div className="max-w-xs">
                <Badge icon={<CloudSun className="size-4" />} label="Forecast" />
                <h3 className="mt-4 font-display text-2xl font-bold text-fg">48 hours ahead, with honest uncertainty.</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">P10–P90 bands, hour-by-hour categories, best time to step outside and health advice.</p>
              </div>
              <div className="flex-1">
                {delhi.length > 0 && <Sparkline values={delhi} width={420} height={150} color="var(--primary)" strokeWidth={2.6} className="h-auto w-full" />}
              </div>
            </div>
          </TiltCard>
        </motion.div>
        <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.08, ease: EASE }}>
          <TiltCard href="/live-map" className="h-full">
            <Badge icon={<MapPinned className="size-4" />} label="Live map" />
            <h3 className="mt-4 font-display text-xl font-bold text-fg">Heat, wind flow, fires & transport arcs.</h3>
            <p className="mt-2 text-sm text-fg-muted">Scrub 24 h back and 48 h ahead.</p>
          </TiltCard>
        </motion.div>
        <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }}>
          <TiltCard href="/explainability" className="h-full">
            <Badge icon={<Sparkles className="size-4" />} label="Explainability" />
            <h3 className="mt-4 font-display text-xl font-bold text-fg">Why is Delhi’s air bad tonight?</h3>
            <p className="mt-2 text-sm text-fg-muted">SHAP-style waterfalls, upwind sources, attention maps.</p>
          </TiltCard>
        </motion.div>
        <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.08, ease: EASE }}>
          <TiltCard href="/simulator" className="h-full">
            <Badge icon={<SlidersHorizontal className="size-4" />} label="What-if" />
            <h3 className="mt-4 font-display text-xl font-bold text-fg">Stop stubble burning. Watch the sky clear.</h3>
            <p className="mt-2 text-sm text-fg-muted">Policy levers with instant feedback.</p>
          </TiltCard>
        </motion.div>
        <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.16, ease: EASE }}>
          <TiltCard href="/model-lab" className="h-full">
            <Badge icon={<FlaskConical className="size-4" />} label="Model lab" />
            <h3 className="mt-4 font-display text-xl font-bold text-fg">Every number traceable to a run.</h3>
            <p className="mt-2 text-sm text-fg-muted">Architecture, ablation ladder, training curves.</p>
          </TiltCard>
        </motion.div>
        <motion.div className="md:col-span-6" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }}>
          <TiltCard href="/reports" className="h-full">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_1.3fr]">
              <div>
                <Badge icon={<FileChartColumn className="size-4" />} label="Reports" />
                <h3 className="mt-4 font-display text-2xl font-bold text-fg">City reports, trends and exports for decision-makers.</h3>
                <p className="mt-2 text-sm text-fg-muted">CSV, JSON and print-ready PDFs — each export states its data provenance.</p>
              </div>
              <div className="grid grid-cols-12 items-end gap-1.5">
                {Array.from({ length: 12 }, (_, i) => {
                  const h = [1.75, 1.35, 1.0, 0.85, 0.8, 0.6, 0.38, 0.36, 0.48, 1.0, 2.0, 1.8][i];
                  return (
                    <motion.div
                      key={i}
                      className="rounded-t-md"
                      style={{ background: categoryForPm(h * 60).color }}
                      initial={{ height: 0 }}
                      whileInView={{ height: h * 70 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.7, ease: EASE }}
                    />
                  );
                })}
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </div>
    </section>
  );
}

function Badge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-primary">
      {icon}
      {label}
    </span>
  );
}

export function Impact() {
  const sdgs = [
    { n: "3", title: "Good Health & Well-being", text: "Early warnings so hospitals, schools and vulnerable people can act before the air turns hazardous.", icon: <HeartPulse className="size-6" />, c: "#4c9f38" },
    { n: "11", title: "Sustainable Cities", text: "Hotspot and source insights for municipal planning, GRAP triggers and traffic policy.", icon: <Building className="size-6" />, c: "#fd9d24" },
    { n: "13", title: "Climate Action", text: "Tracks stubble burning and inversions — the climate-linked drivers of India’s worst episodes.", icon: <ThermometerSun className="size-6" />, c: "#3f7e44" },
  ];
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 opacity-60 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
        <SkyScene pm={18} landmark="vidhana" hour={10} seed={12} className="absolute inset-0" particles={false} />
      </div>
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 max-w-2xl">
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-primary">Why it matters</div>
          <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl">Built for people, not leaderboards.</h2>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-3">
          {sdgs.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: EASE }}
              className="card !rounded-[28px] p-7"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl text-white" style={{ background: s.c }}>
                  {s.icon}
                </span>
                <span className="font-display text-sm font-bold text-fg-subtle">SDG {s.n}</span>
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-fg">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{s.text}</p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-4 flex flex-col gap-4 !rounded-[28px] p-6 sm:flex-row sm:items-center"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="size-6" />
          </span>
          <p className="text-[15px] leading-relaxed text-fg-muted">
            <b className="text-fg">Integrity by design.</b> Simulated values are labelled <i>Demo data</i>, benchmark models like CAMS are never passed off as ours, and Model Lab numbers stay flagged
            “illustrative” until they come from a logged training run.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const anchor = useAnchor();
  const n = useMemo(() => (anchor === null ? null : CITIES.filter((c) => pmAt(c, anchor) > 60).length), [anchor]);
  return (
    <section className="px-5 pb-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE }}
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-gradient-to-br from-[#0e1a2b] via-[#141a36] to-[#1d1438] px-6 py-16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_40px_80px_-30px_rgba(20,20,60,0.5)] sm:px-14"
      >
        <div className="absolute -left-20 -top-24 size-[420px] animate-aurora rounded-full bg-teal-400/30 blur-[90px]" />
        <div className="absolute -bottom-32 right-0 size-[460px] animate-aurora rounded-full bg-violet-400/25 blur-[100px] [animation-delay:-6s]" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
              Breathe easier.
              <br />
              <span className="bg-gradient-to-r from-teal-200 via-sky-200 to-violet-200 bg-clip-text text-transparent">Know what’s coming.</span>
            </h2>
            <p className="mt-4 max-w-lg text-white/70">Open the dashboard to explore forecasts, maps and explanations for 33 Indian cities.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0e1a2b] shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] transition hover:bg-white/90">
                Open Dashboard <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/about" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-7 py-3.5 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_0_0_0.5px_rgba(255,255,255,0.2)] backdrop-blur-xl transition hover:bg-white/15">
                About the project
              </Link>
            </div>
          </div>
          <div className="rounded-[30px] bg-white/[0.07] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_0_0_0.5px_rgba(255,255,255,0.14)] backdrop-blur-2xl">
            <div className="text-sm text-white/60">Cities above the 24-h NAAQS right now</div>
            <div className="mt-2 font-display text-6xl font-bold">
              {n === null ? "—" : <AnimatedNumber value={n} />}
              <span className="text-2xl text-white/50"> / {CITIES.length}</span>
            </div>
            <div className="mt-3 text-xs text-white/50">{DATA_MODE === "demo" ? "Demo simulator value." : "Live value."}</div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-5 py-10 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <div className="font-display font-bold text-fg">AeroFusion</div>
            <div className="text-xs text-fg-muted">Group 40 · Dept. of CSE · B.M.S. College of Engineering, Bengaluru</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
          <Link href="/dashboard" className="hover:text-fg">Dashboard</Link>
          <Link href="/model-lab" className="hover:text-fg">Model Lab</Link>
          <Link href="/data-sources" className="hover:text-fg">Data Sources</Link>
          <Link href="/about" className="hover:text-fg">About</Link>
        </div>
      </div>
    </footer>
  );
}
