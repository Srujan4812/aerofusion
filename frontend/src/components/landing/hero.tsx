"use client";

import { ArrowRight, BookOpen, BrainCircuit, Building2, ChevronRight, Clock3, Layers3 } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, type ReactNode } from "react";
import { AqiBadge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/primitives";
import { useAnchor } from "@/hooks/use-anchor";
import { CITY_BY_SLUG } from "@/lib/cities";
import { DATA_MODE } from "@/lib/nav";
import { pmAt } from "@/lib/sim/core";
import { forecastSeries } from "@/lib/sim/forecast";

const EASE = [0.22, 1, 0.36, 1] as const;

function Words({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span className="inline-block" initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.08 }}>
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function MiniBars({ values, color = "#5eead4" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  return (
    <div className="flex h-14 items-end gap-[3px]">
      {values.map((v, i) => (
        <motion.span
          key={i}
          className="w-[6px] rounded-full"
          style={{ background: `linear-gradient(to top, ${color}55, ${color})` }}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ delay: 1.2 + i * 0.04, duration: 0.6, ease: EASE }}
        />
      ))}
    </div>
  );
}

function MiniLine({ values }: { values: number[] }) {
  const w = 120;
  const h = 44;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - ((v - min) / (max - min || 1)) * (h - 10)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-28 overflow-visible">
      <defs>
        <linearGradient id="hero-line" x1="0" x2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      <motion.path d={d} fill="none" stroke="url(#hero-line)" strokeWidth={2.4} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.3, duration: 1.2, ease: EASE }} />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill="#5eead4" stroke="white" strokeWidth={1.5} />
    </svg>
  );
}

function LayerStack() {
  const cols = ["#f59e0b", "#a78bfa", "#38bdf8", "#34d399"];
  return (
    <div className="relative h-14 w-16">
      {cols.map((c, i) => (
        <motion.span
          key={c}
          className="absolute left-1/2 h-6 w-12 rounded-md"
          style={{ bottom: i * 8, background: `${c}cc`, transform: "translateX(-50%) rotateX(58deg) rotateZ(45deg)", boxShadow: `0 0 12px ${c}66` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 + i * 0.1 }}
        />
      ))}
    </div>
  );
}

function StatCard({ href, icon, title, sub, visual, delay }: { href: string; icon: ReactNode; title: string; sub: string; visual: ReactNode; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.8, ease: EASE }}>
      <Link href={href} className="glass-hero group flex h-[120px] items-center gap-4 rounded-[28px] px-5 transition duration-300 hover:-translate-y-1">
        <span className="glass-hero grid size-14 shrink-0 place-items-center rounded-full text-emerald-200 [&_svg]:size-7 [&_svg]:stroke-[1.4]">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-semibold leading-tight text-white">{title}</div>
          <div className="mt-0.5 truncate text-[13px] text-white/75">{sub}</div>
        </div>
        <div className="hidden shrink-0 min-[1560px]:block">{visual}</div>
        <ChevronRight className="size-5 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const anchor = useAnchor();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.16]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const delhi = useMemo(() => (anchor === null ? null : pmAt(CITY_BY_SLUG.delhi, anchor)), [anchor]);
  const line = useMemo(() => (anchor === null ? [3, 4, 3, 5, 4, 6, 5, 7] : forecastSeries(CITY_BY_SLUG.delhi, anchor, 24, 0, 3).map((p) => p.pred)), [anchor]);

  return (
    <section ref={ref} className="relative h-dvh min-h-[760px] overflow-hidden text-white">
      <motion.div style={{ scale: bgScale, y: bgY }} className="absolute inset-0 will-change-transform">
        <Image src="/hero/background1.png" alt="" fill priority sizes="100vw" className="object-cover object-[62%_center]" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b1d33]/70 via-[#0b1d33]/25 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0b1d33]/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#06140e]/55 to-transparent" />
      <div className="absolute inset-0 hidden bg-[#050a14]/35 dark:block" />

      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative z-10 mx-auto flex h-full max-w-[1500px] flex-col px-5 pb-6 pt-32 lg:px-10">
        <div className="grid flex-1 items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="glass-hero mb-7 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
            >
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
              AI for cleaner air
            </motion.div>
            <h1 className="font-display text-[46px] font-semibold leading-[1.02] tracking-[-0.035em] [text-shadow:0_2px_30px_rgba(5,15,35,0.35)] sm:text-6xl xl:text-[84px]">
              <Words text="Forecast the Air." />
              <br />
              <Words text="Understand the" delay={0.25} />
              <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span className="inline-block text-[#5ef0bf]" initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}>
                  Future<span className="text-white">.</span>
                </motion.span>
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.7 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-[21px]"
            >
              MW-AeroFusion-Net delivers explainable PM2.5 forecasts by learning from multi-source environmental data across India.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.85 }} className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/forecast"
                className="group relative inline-flex h-[60px] items-center gap-3 overflow-hidden rounded-full bg-gradient-to-b from-[#5eead4] to-[#14b8a6] px-8 text-[17px] font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),inset_0_-2px_6px_rgba(0,80,70,0.25),0_0_0_1px_rgba(255,255,255,0.25),0_14px_40px_-8px_rgba(45,212,191,0.75)] transition hover:brightness-110"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                Explore Forecasts <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/live-map" className="glass-hero inline-flex h-[60px] items-center gap-3 rounded-full px-8 text-[17px] font-semibold transition hover:brightness-110">
                View Live Map
                <span className="h-6 w-px bg-white/30" />
                <BookOpen className="size-5" />
              </Link>
            </motion.div>
          </div>

          <div className="relative hidden h-full lg:block">
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, duration: 0.8, ease: EASE }} className="absolute right-0 top-[6%]">
              <Link href="/forecast?city=delhi" className="glass-hero group block w-[270px] rounded-[30px] p-6 transition hover:brightness-110">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl font-semibold">Delhi</span>
                  <ChevronRight className="size-5 text-white/80 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-1 text-[15px] text-white/80">PM2.5</div>
                <div className="mt-1 font-display text-4xl font-semibold tracking-tight">
                  {delhi === null ? "—" : <AnimatedNumber value={Math.round(delhi)} />}
                  <span className="ml-1.5 text-xl font-medium text-white/90">µg/m³</span>
                </div>
                {delhi !== null && <AqiBadge pm={delhi} size="md" className="mt-3 !bg-white/90" />}
                {DATA_MODE === "demo" && <div className="mt-3 text-[10.5px] text-white/60">Demo data · simulated</div>}
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard href="/live-map" icon={<Building2 />} title="33 Cities" sub="Across India" delay={0.9} visual={<MiniBars values={[3, 5, 4, 7, 6, 9, 8, 10, 7, 9]} />} />
          <StatCard href="/forecast" icon={<Clock3 />} title="1–48h Forecasts" sub="Hourly predictions" delay={1} visual={<MiniLine values={line} />} />
          <StatCard href="/data-sources" icon={<Layers3 />} title="Multi-Source Data" sub="CPCB, ERA5, NASA & more" delay={1.1} visual={<LayerStack />} />
          <StatCard href="/explainability" icon={<BrainCircuit />} title="Explainable AI" sub="Understand key factors" delay={1.2} visual={<MiniBars values={[4, 7, 5, 9, 6, 10, 8]} color="#38bdf8" />} />
        </div>
      </motion.div>
    </section>
  );
}
