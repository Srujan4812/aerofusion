"use client";

import { ArrowRight, BrainCircuit, Building2, Clock3, Layers3, MapIcon } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { SkyScene } from "@/components/sky/sky-scene";
import { AqiBadge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/primitives";
import { useAnchor } from "@/hooks/use-anchor";
import { CITY_BY_SLUG } from "@/lib/cities";
import { pmAt } from "@/lib/sim/core";
import { IndiaNetwork } from "./india-network";

const EASE = [0.22, 1, 0.36, 1] as const;

function Words({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.08 }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const anchor = useAnchor();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [pm, setPm] = useState(150);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.round((150 - 135 * Math.min(1, v * 1.25)) / 4) * 4;
    setPm((p) => (p === next ? p : next));
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const contentOpacity = useTransform(scrollYProgress, [0.55, 0.95], [1, 0]);
  const progressWidth = useTransform(scrollYProgress, [0, 0.8], ["0%", "100%"]);

  const delhi = useMemo(() => (anchor === null ? null : pmAt(CITY_BY_SLUG.delhi, anchor)), [anchor]);

  return (
    <section ref={ref} className="relative h-[190vh]">
      <div className="sticky top-0 h-dvh overflow-hidden">
        <SkyScene pm={pm} landmark="indiaGate" hour={7} seed={4} extendTop={320} align="right" className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/80 via-bg/20 to-transparent dark:from-bg/85" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg/40 to-transparent" />

        <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative z-10 mx-auto grid h-full max-w-7xl items-center gap-6 px-5 pb-36 pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.32em] text-primary"
            >
              <span className="h-px w-10 bg-primary" />
              AI for cleaner air
            </motion.div>
            <h1 className="font-display text-[44px] font-bold leading-[1.0] tracking-[-0.04em] text-fg sm:text-6xl xl:text-[84px]">
              <Words text="Forecast the Air." />
              <br />
              <Words text="Understand the" delay={0.25} />
              <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span className="text-gradient inline-block" initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}>
                  Future.
                </motion.span>
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.7 }}
              className="mt-6 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg"
            >
              MW-AeroFusion-Net delivers explainable PM2.5 forecasts by learning from satellites, ground sensors and weather across India — and tells you{" "}
              <em className="font-semibold not-italic text-fg">why</em> the air will change.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.85 }} className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/forecast"
                className="glass-tint group relative inline-flex h-13 items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-[15px] font-semibold transition hover:brightness-110"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                Explore forecasts <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/live-map"
                className="glass inline-flex h-13 items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold text-fg transition hover:brightness-[1.04]"
              >
                View live map <MapIcon className="size-4" />
              </Link>
            </motion.div>
          </div>

          <div className="relative hidden h-[min(64vh,600px)] lg:block">
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.2 }} className="absolute inset-0">
              <IndiaNetwork anchor={anchor} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.2, duration: 0.8, ease: EASE }}
              className="glass absolute right-0 top-[18%] w-[204px] rounded-[26px] p-4 text-fg"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-400" />
                  <span className="relative size-2 rounded-full bg-red-400" />
                </span>
                Delhi · now
              </div>
              <div className="mt-1 text-[11px] text-fg-muted">PM2.5</div>
              <div className="font-display text-3xl font-bold leading-none">
                {delhi === null ? "—" : <AnimatedNumber value={Math.round(delhi)} />}
                <span className="ml-1 text-xs font-medium text-fg-muted">µg/m³</span>
              </div>
              {delhi !== null && <AqiBadge pm={delhi} size="xs" className="mt-2" />}
            </motion.div>
          </div>
        </motion.div>

        {/* scroll cue */}
        <div className="absolute bottom-[132px] left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] font-medium text-fg-muted sm:flex">
          <span>Scroll — watch the smog lift</span>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-fg/10">
            <motion.div style={{ width: progressWidth }} className="h-full rounded-full bg-gradient-to-r from-amber-500 via-lime-500 to-emerald-500" />
          </div>
        </div>

        {/* stats band */}
        <div className="absolute inset-x-3 bottom-4 z-10 sm:inset-x-6">
          <div className="glass mx-auto grid max-w-6xl grid-cols-2 gap-y-4 rounded-[28px] px-5 py-4 lg:grid-cols-4 lg:px-8">
            {[
              { icon: <Building2 />, title: "33 Cities", sub: "Across India" },
              { icon: <Clock3 />, title: "1–48 h Forecasts", sub: "Hourly, with uncertainty" },
              { icon: <Layers3 />, title: "Multi-Source Data", sub: "CPCB · ERA5 · NASA FIRMS" },
              { icon: <BrainCircuit />, title: "Explainable AI", sub: "Understand key drivers" },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.1, duration: 0.6 }}
                className="flex items-center gap-3.5 lg:border-l lg:border-border lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
              >
                <span className="text-primary [&_svg]:size-7 [&_svg]:stroke-[1.5]">{s.icon}</span>
                <div>
                  <div className="font-display text-base font-semibold text-fg sm:text-lg">{s.title}</div>
                  <div className="text-xs text-fg-muted sm:text-[13px]">{s.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
