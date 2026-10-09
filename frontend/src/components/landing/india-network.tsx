"use client";

import { geoMercator, geoPath } from "d3-geo";
import { motion } from "motion/react";
import { useMemo } from "react";
import { categoryForPm } from "@/lib/aqi";
import { CITIES } from "@/lib/cities";
import { INDIA_OUTLINE, INDIA_STATES } from "@/lib/geo/india";
import { pmAt } from "@/lib/sim/core";
import { diffusionGraph } from "@/lib/sim/graph";

const W = 560;
const H = 620;

/** Hero visual: India drawn as a glowing graph — nodes are cities, arcs are the learned transport edges. */
export function IndiaNetwork({ anchor }: { anchor: number | null }) {
  const geo = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [10, 10],
        [W - 10, H - 10],
      ],
      INDIA_OUTLINE,
    );
    const path = geoPath(projection).digits(1);
    const p = (lon: number, lat: number) => {
      const xy = projection([lon, lat]) ?? [0, 0];
      return [Math.round(xy[0] * 10) / 10, Math.round(xy[1] * 10) / 10] as [number, number];
    };
    return { outline: path(INDIA_OUTLINE) ?? "", states: INDIA_STATES.features.map((f) => path(f) ?? ""), p };
  }, []);

  const net = useMemo(() => {
    if (anchor === null) return null;
    const nodes = CITIES.map((c) => ({ c, pm: pmAt(c, anchor), xy: geo.p(c.lon, c.lat) }));
    const edges = diffusionGraph(anchor, 2).map((e) => {
      const a = geo.p(e.source.lon, e.source.lat);
      const b = geo.p(e.target.lon, e.target.lat);
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      return { id: `${e.source.slug}-${e.target.slug}`, d: `M${a[0]},${a[1]} Q${mx - dy * 0.25},${my + dx * 0.25} ${b[0]},${b[1]}`, w: e.weight };
    });
    return { nodes, edges };
  }, [anchor, geo]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="net-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
        <radialGradient id="net-fill" cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.04" />
        </radialGradient>
        <filter id="net-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <motion.path d={geo.outline} fill="url(#net-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6, delay: 0.8 }} />
      {geo.states.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="white"
          strokeOpacity={0.22}
          strokeWidth={0.6}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, delay: 0.6 + i * 0.02, ease: "easeInOut" }}
        />
      ))}
      <motion.path
        d={geo.outline}
        fill="none"
        stroke="url(#net-stroke)"
        strokeWidth={1.8}
        filter="url(#net-glow)"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.8, ease: [0.65, 0, 0.35, 1] }}
      />
      {net?.edges.map((e, i) => (
        <motion.path
          key={e.id}
          d={e.d}
          fill="none"
          stroke="white"
          strokeOpacity={0.35 + e.w * 0.5}
          strokeWidth={0.6 + e.w * 1.6}
          strokeDasharray="3 6"
          className="animate-dash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 + i * 0.015 }}
        />
      ))}
      {net?.nodes.map((n, i) => {
        const col = categoryForPm(n.pm).color;
        const big = n.pm > 90;
        return (
          <motion.g key={n.c.slug} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6 + i * 0.03, type: "spring", stiffness: 260, damping: 16 }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <circle cx={n.xy[0]} cy={n.xy[1]} r={big ? 16 : 10} fill={col} opacity={0.22}>
              <animate attributeName="r" values={big ? "10;22;10" : "6;14;6"} dur={`${2.4 + (i % 5) * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0.05;0.35" dur={`${2.4 + (i % 5) * 0.3}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={n.xy[0]} cy={n.xy[1]} r={big ? 4.6 : 3.4} fill="white" />
            <circle cx={n.xy[0]} cy={n.xy[1]} r={big ? 2.6 : 1.9} fill={col} />
          </motion.g>
        );
      })}
    </svg>
  );
}
