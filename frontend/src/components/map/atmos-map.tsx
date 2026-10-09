"use client";

import { geoMercator, geoPath } from "d3-geo";
import "d3-transition";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { Feature, Geometry } from "geojson";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { categoryForPm } from "@/lib/aqi";
import { INDIA_OUTLINE, INDIA_STATES } from "@/lib/geo/india";
import type { Hour } from "@/lib/sim/core";
import { fieldGrid, windGrid, INDIA_BBOX, type FieldMetric, type FieldPoint } from "@/lib/sim/field";
import { mulberry32 } from "@/lib/rng";
import { cn } from "@/lib/utils";
import { metricColor, metricLabel, rgbOf } from "./scales";

const STATES = INDIA_STATES;
const OUTLINE = INDIA_OUTLINE;

export interface MapCity {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  value: number;
  /** PM value used for marker colour when metric isn't PM. */
  pm?: number;
  sub?: ReactNode;
}

export interface MapArc {
  id: string;
  from: [number, number];
  to: [number, number];
  weight: number;
  color?: string;
}

export interface MapFire {
  id: string;
  lat: number;
  lon: number;
  frp: number;
  confidence: "high" | "nominal" | "low";
}

export interface MapHighlight {
  id: string;
  lat: number;
  lon: number;
  label: string;
  sublabel?: string;
  color?: string;
}

const MAJOR = new Set([
  "delhi",
  "mumbai",
  "kolkata",
  "chennai",
  "bengaluru",
  "hyderabad",
  "ahmedabad",
  "pune",
  "jaipur",
  "lucknow",
  "patna",
  "bhopal",
  "nagpur",
  "guwahati",
  "srinagar",
  "chandigarh",
  "kochi",
  "bhubaneswar",
  "amritsar",
  "visakhapatnam",
  "raipur",
]);

export interface AtmosMapProps {
  cities: MapCity[];
  metric?: FieldMetric;
  t: Hour;
  heat?: boolean;
  heatPoints?: FieldPoint[];
  heatOpacity?: number;
  wind?: boolean;
  fires?: MapFire[];
  arcs?: MapArc[];
  highlights?: MapHighlight[];
  labels?: "all" | "major" | "selected" | "none";
  markers?: boolean;
  selected?: string;
  onSelect?: (slug: string) => void;
  zoomable?: boolean;
  wheelZoom?: boolean;
  controls?: boolean;
  focus?: { lat: number; lon: number; k: number } | null;
  padding?: number;
  className?: string;
  children?: ReactNode;
}

export function AtmosMap({
  cities,
  metric = "pm",
  t,
  heat = true,
  heatPoints,
  heatOpacity = 0.85,
  wind = false,
  fires,
  arcs,
  highlights,
  labels = "major",
  markers = true,
  selected,
  onSelect,
  zoomable = true,
  wheelZoom = false,
  controls = true,
  focus,
  padding = 16,
  className,
  children,
}: AtmosMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const heatRef = useRef<HTMLCanvasElement>(null);
  const windRef = useRef<HTMLCanvasElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tf, setTf] = useState<ZoomTransform>(zoomIdentity);
  const tfRef = useRef<ZoomTransform>(zoomIdentity);
  const [hover, setHover] = useState<{ city: MapCity; x: number; y: number } | null>(null);

  // ── size ──
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (Math.abs(s.w - width) > 1 || Math.abs(s.h - height) > 1 ? { w: width, h: height } : s));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;

  // ── projection & paths (base, k = 1) ──
  const geo = useMemo(() => {
    if (!w || !h) return null;
    const projection = geoMercator().fitExtent(
      [
        [padding, padding],
        [w - padding, h - padding],
      ],
      OUTLINE,
    );
    const path = geoPath(projection);
    const outlineD = path(OUTLINE) ?? "";
    const states = STATES.features.map((f: Feature<Geometry, { name: string }>) => ({ name: f.properties.name, d: path(f) ?? "" }));
    return { projection, outlineD, outline2D: new Path2D(outlineD), states };
  }, [w, h, padding]);

  const project = useCallback(
    (lon: number, lat: number): [number, number] => {
      const p = geo?.projection([lon, lat]);
      return p ? [p[0], p[1]] : [0, 0];
    },
    [geo],
  );

  // ── zoom behaviour ──
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !zoomable || !w) return;
    const z = d3zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, 7])
      .translateExtent([
        [-w * 0.1, -h * 0.1],
        [w * 1.1, h * 1.1],
      ])
      .filter((event: Event) => {
        if (event.type === "wheel") return wheelZoom || (event as WheelEvent).ctrlKey;
        if (event.type === "dblclick") return true;
        return !(event as MouseEvent).button;
      })
      .on("zoom", (e: { transform: ZoomTransform }) => {
        tfRef.current = e.transform;
        setTf(e.transform);
      });
    zoomRef.current = z;
    const sel = select(el);
    sel.call(z);
    return () => {
      sel.on(".zoom", null);
    };
  }, [zoomable, wheelZoom, w, h]);

  // focus (fly-to) — keyed by value so inline objects don't restart the transition every render
  const focusKey = focus ? `${focus.lat.toFixed(3)},${focus.lon.toFixed(3)},${focus.k}` : "";
  const hadFocus = useRef(false);
  useEffect(() => {
    const el = wrapRef.current;
    const z = zoomRef.current;
    if (!el || !z || !geo) return;
    const sel = select(el);
    if (!focusKey) {
      if (hadFocus.current) sel.transition().duration(900).call(z.transform, zoomIdentity);
      hadFocus.current = false;
      return;
    }
    hadFocus.current = true;
    const [lat, lon, k] = focusKey.split(",").map(Number);
    const [x, y] = project(lon, lat);
    const target = zoomIdentity.translate(w / 2 - x * k, h / 2 - y * k).scale(k);
    sel.transition().duration(1100).call(z.transform, target);
  }, [focusKey, geo, project, w, h]);

  const zoomBy = (factor: number) => {
    const el = wrapRef.current;
    const z = zoomRef.current;
    if (!el || !z) return;
    select(el).transition().duration(350).call(z.scaleBy, factor);
  };
  const resetZoom = () => {
    const el = wrapRef.current;
    const z = zoomRef.current;
    if (!el || !z) return;
    select(el).transition().duration(600).call(z.transform, zoomIdentity);
  };

  // ── heat field (offscreen, base scale) ──
  const pts = useMemo<FieldPoint[]>(() => heatPoints ?? cities.map((c) => ({ lat: c.lat, lon: c.lon, value: c.value })), [heatPoints, cities]);

  useEffect(() => {
    if (!geo || !heat) {
      offRef.current = null;
      return;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const grid = fieldGrid(pts, t, metric, 0.3);
    const raw = document.createElement("canvas");
    raw.width = Math.ceil(w * dpr);
    raw.height = Math.ceil(h * dpr);
    const rctx = raw.getContext("2d")!;
    rctx.scale(dpr, dpr);
    for (let i = 0; i < grid.nLat; i++) {
      const lat0 = grid.minLat + i * grid.step;
      for (let j = 0; j < grid.nLon; j++) {
        const lon0 = grid.minLon + j * grid.step;
        const a = geo.projection([lon0, lat0 + grid.step]);
        const b = geo.projection([lon0 + grid.step, lat0]);
        if (!a || !b) continue;
        const v = grid.values[i * grid.nLon + j];
        const [r, g, bb] = rgbOf(metricColor(metric, v));
        rctx.fillStyle = `rgb(${r},${g},${bb})`;
        rctx.fillRect(a[0] - 0.5, a[1] - 0.5, b[0] - a[0] + 1, b[1] - a[1] + 1);
      }
    }
    const off = document.createElement("canvas");
    off.width = raw.width;
    off.height = raw.height;
    const octx = off.getContext("2d")!;
    octx.scale(dpr, dpr);
    octx.save();
    octx.clip(geo.outline2D);
    octx.filter = `blur(${Math.max(6, w / 90)}px)`;
    octx.drawImage(raw, 0, 0, w, h);
    octx.restore();
    offRef.current = off;
    drawHeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, heat, pts, metric, t, w, h]);

  const drawHeat = useCallback(() => {
    const c = heatRef.current;
    if (!c || !w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.ceil(w * dpr)) {
      c.width = Math.ceil(w * dpr);
      c.height = Math.ceil(h * dpr);
    }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const off = offRef.current;
    if (!off) return;
    const z = tfRef.current;
    ctx.setTransform(dpr * z.k, 0, 0, dpr * z.k, dpr * z.x, dpr * z.y);
    ctx.drawImage(off, 0, 0, w, h);
  }, [w, h]);

  useEffect(() => {
    drawHeat();
  }, [tf, drawHeat]);

  // ── wind particles ──
  useEffect(() => {
    const c = windRef.current;
    if (!c || !geo || !wind || !w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    const ctx = c.getContext("2d")!;
    const field = windGrid(t, 1);
    const rnd = mulberry32(99);
    const n = Math.round(Math.min(1400, Math.max(260, (w * h) / 900)));
    const { minLat, maxLat, minLon, maxLon } = INDIA_BBOX;
    const spawn = () => ({
      lat: minLat + rnd() * (maxLat - minLat),
      lon: minLon + rnd() * (maxLon - minLon),
      age: Math.floor(rnd() * 80),
    });
    const parts = Array.from({ length: n }, spawn);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dark = document.documentElement.classList.contains("dark");
    let raf = 0;
    let lastK = tfRef.current.k;
    let lastX = tfRef.current.x;
    let lastY = tfRef.current.y;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(c);
    const step = () => {
      raf = requestAnimationFrame(step);
      if (!visible) return;
      const z = tfRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (z.k !== lastK || z.x !== lastX || z.y !== lastY) {
        ctx.clearRect(0, 0, c.width, c.height);
        lastK = z.k;
        lastX = z.x;
        lastY = z.y;
      } else {
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = "rgba(0,0,0,0.93)";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.globalCompositeOperation = "source-over";
      }
      if (reduce) return;
      ctx.setTransform(dpr * z.k, 0, 0, dpr * z.k, dpr * z.x, dpr * z.y);
      ctx.save();
      ctx.clip(geo.outline2D);
      ctx.lineWidth = 1.25 / z.k;
      ctx.lineCap = "round";
      ctx.strokeStyle = dark ? "rgba(225,255,245,0.7)" : "rgba(255,255,255,0.92)";
      ctx.beginPath();
      for (const p of parts) {
        const [u, v] = field.sample(p.lat, p.lon);
        const a = geo.projection([p.lon, p.lat]);
        const speed = 0.012;
        p.lon += (u * speed) / Math.cos((p.lat * Math.PI) / 180);
        p.lat += v * speed;
        p.age++;
        const b = geo.projection([p.lon, p.lat]);
        if (a && b) {
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
        }
        if (p.age > 90 || p.lat < minLat || p.lat > maxLat || p.lon < minLon || p.lon > maxLon) Object.assign(p, spawn(), { age: 0 });
      }
      ctx.stroke();
      ctx.restore();
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
    };
  }, [geo, wind, t, w, h]);

  // ── derived screen positions ──
  const k = tf.k;
  const toScreen = (lon: number, lat: number) => {
    const [x, y] = project(lon, lat);
    return [x * k + tf.x, y * k + tf.y] as [number, number];
  };

  const showLabel = (c: MapCity) => {
    if (labels === "none") return false;
    if (labels === "all") return true;
    if (labels === "selected") return c.slug === selected;
    return MAJOR.has(c.slug) || c.slug === selected || k > 2.4;
  };

  const ready = !!geo;

  return (
    <div
      ref={wrapRef}
      className={cn("relative h-full w-full touch-none select-none overflow-hidden", zoomable && "cursor-grab active:cursor-grabbing", className)}
      {...(wheelZoom ? { "data-lenis-prevent": true } : {})}
    >
      {ready && (
        <>
          {/* land */}
          <svg className="absolute inset-0 size-full" aria-hidden>
            <defs>
              <filter id="atmos-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            <g transform={`translate(${tf.x},${tf.y}) scale(${k})`}>
              <path d={geo.outlineD} fill="var(--primary)" opacity={0.18} filter="url(#atmos-glow)" />
              {geo.states.map((s) => (
                <path key={s.name} d={s.d} fill="var(--map-land)" />
              ))}
            </g>
          </svg>
          <canvas ref={heatRef} className="absolute inset-0 size-full" style={{ opacity: heat ? heatOpacity : 0 }} aria-hidden />
          <canvas ref={windRef} className="absolute inset-0 size-full mix-blend-normal" style={{ opacity: wind ? 1 : 0 }} aria-hidden />
          {/* overlay vectors */}
          <svg className="absolute inset-0 size-full" aria-label="Map of India">
            <defs>
              <filter id="fire-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" />
              </filter>
            </defs>
            <g transform={`translate(${tf.x},${tf.y}) scale(${k})`}>
              {geo.states.map((s) => (
                <path key={s.name} d={s.d} fill="none" stroke="var(--map-stroke)" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
              ))}
              <path d={geo.outlineD} fill="none" stroke="var(--primary)" strokeOpacity={0.55} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
              {arcs?.map((a) => {
                const [x1, y1] = project(a.from[0], a.from[1]);
                const [x2, y2] = project(a.to[0], a.to[1]);
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const dx = x2 - x1;
                const dy = y2 - y1;
                const cx = mx - dy * 0.22;
                const cy = my + dx * 0.22;
                const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
                return (
                  <g key={a.id}>
                    <path d={d} fill="none" stroke={a.color ?? "var(--primary)"} strokeOpacity={0.16} strokeWidth={2 + a.weight * 5} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                    <path
                      d={d}
                      fill="none"
                      stroke={a.color ?? "var(--primary)"}
                      strokeOpacity={0.9}
                      strokeWidth={0.8 + a.weight * 2.2}
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray="5 7"
                      strokeLinecap="round"
                      className="animate-dash"
                    />
                  </g>
                );
              })}
              {fires && (
                <g>
                  <g filter="url(#fire-glow)">
                    {fires.map((f) => {
                      const [x, y] = project(f.lon, f.lat);
                      return <circle key={`g${f.id}`} cx={x} cy={y} r={(2.6 + f.frp / 22) / Math.sqrt(k)} fill="#ff6a00" opacity={0.55} />;
                    })}
                  </g>
                  {fires.map((f) => {
                    const [x, y] = project(f.lon, f.lat);
                    return (
                      <circle
                        key={f.id}
                        cx={x}
                        cy={y}
                        r={(1 + f.frp / 40) / Math.sqrt(k)}
                        fill={f.confidence === "high" ? "#ffd166" : "#ff8c42"}
                        opacity={f.confidence === "low" ? 0.5 : 0.95}
                      />
                    );
                  })}
                </g>
              )}
            </g>
          </svg>

          {/* markers (screen space, constant size) */}
          {markers && (
            <svg className="pointer-events-none absolute inset-0 size-full">
              {cities.map((c) => {
                const [x, y] = toScreen(c.lon, c.lat);
                const col = categoryForPm(c.pm ?? c.value).color;
                const isSel = c.slug === selected;
                return (
                  <g
                    key={c.slug}
                    className="pointer-events-auto cursor-pointer"
                    onMouseEnter={() => setHover({ city: c, x, y })}
                    onMouseLeave={() => setHover(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(c.slug);
                    }}
                  >
                    {isSel && (
                      <>
                        <circle cx={x} cy={y} r={10} fill={col} opacity={0.35}>
                          <animate attributeName="r" values="8;22;8" dur="2.4s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.45;0;0.45" dur="2.4s" repeatCount="indefinite" />
                        </circle>
                      </>
                    )}
                    <circle cx={x} cy={y} r={14} fill="transparent" />
                    <circle cx={x} cy={y} r={isSel ? 7 : 5} fill={col} stroke="white" strokeWidth={isSel ? 2.5 : 1.8} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.35))" }} />
                  </g>
                );
              })}
            </svg>
          )}

          {/* labels */}
          {markers &&
            cities.filter(showLabel).map((c) => {
              const [x, y] = toScreen(c.lon, c.lat);
              const isSel = c.slug === selected;
              return (
                <div
                  key={`l-${c.slug}`}
                  className={cn(
                    "pointer-events-none absolute whitespace-nowrap rounded-lg px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight shadow-sm backdrop-blur-md transition-[background] duration-300",
                    isSel ? "z-10 bg-fg text-bg" : "bg-surface-solid/80 text-fg ring-1 ring-border",
                  )}
                  style={{ left: x + 9, top: y - 9 }}
                >
                  {c.name}
                  <span className={cn("ml-1 tabular", isSel ? "opacity-80" : "text-fg-muted")}>{metricLabel(metric, c.value)}</span>
                </div>
              );
            })}

          {/* highlights */}
          {highlights?.map((hl) => {
            const [x, y] = toScreen(hl.lon, hl.lat);
            return (
              <motion.div
                key={hl.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
                style={{ left: x, top: y - 6 }}
              >
                <div className="rounded-xl border border-white/40 bg-surface-solid/90 px-2.5 py-1.5 text-center shadow-lift backdrop-blur-md">
                  <div className="text-[11px] font-semibold text-fg">{hl.label}</div>
                  {hl.sublabel && (
                    <div className="text-[11px] font-bold tabular" style={{ color: hl.color ?? "var(--danger)" }}>
                      {hl.sublabel}
                    </div>
                  )}
                </div>
                <div className="mx-auto h-2 w-px bg-fg/40" />
                <div className="mx-auto size-2 rounded-full ring-2 ring-white" style={{ background: hl.color ?? "var(--danger)" }} />
              </motion.div>
            );
          })}

          {/* hover card */}
          <AnimatePresence>
            {hover && (
              <motion.div
                key={hover.city.slug}
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none absolute z-20 min-w-[150px] rounded-2xl border border-border-strong bg-surface-solid/95 px-3 py-2.5 text-xs shadow-lift backdrop-blur-xl"
                style={{ left: Math.min(hover.x + 14, w - 170), top: Math.max(8, hover.y - 70) }}
              >
                <div className="font-display text-[13px] font-semibold text-fg">{hover.city.name}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-lg font-bold tabular text-fg">{metricLabel(metric, hover.city.value)}</span>
                  <span className="text-fg-subtle">{metric === "pm" ? "µg/m³" : ""}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-fg-muted">
                  <span className="size-2 rounded-full" style={{ background: categoryForPm(hover.city.pm ?? hover.city.value).color }} />
                  {categoryForPm(hover.city.pm ?? hover.city.value).label}
                </div>
                {hover.city.sub && <div className="mt-1 text-fg-muted">{hover.city.sub}</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {controls && zoomable && ready && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-surface-solid/85 shadow-card backdrop-blur-md">
          <button onClick={() => zoomBy(1.6)} className="grid size-8 place-items-center text-fg-muted hover:bg-surface-sunken hover:text-fg" aria-label="Zoom in">
            <Plus className="size-4" />
          </button>
          <button onClick={() => zoomBy(1 / 1.6)} className="grid size-8 place-items-center border-y border-border text-fg-muted hover:bg-surface-sunken hover:text-fg" aria-label="Zoom out">
            <Minus className="size-4" />
          </button>
          <button onClick={resetZoom} className="grid size-8 place-items-center text-fg-muted hover:bg-surface-sunken hover:text-fg" aria-label="Reset view">
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

export function HeatLegend({ metric = "pm", title, className }: { metric?: FieldMetric; title?: string; className?: string }) {
  const stops: Record<FieldMetric, number[]> = {
    pm: [0, 30, 60, 90, 120, 200, 300],
    aqi: [0, 30, 60, 90, 120, 200, 300],
    temp: [8, 16, 22, 27, 32, 38],
    wind: [0, 1.5, 3, 4.5, 6.5, 9],
  };
  const labels: Record<FieldMetric, string[]> = {
    pm: ["0", "30", "60", "90", "120", "200", "300+"],
    aqi: ["0", "50", "100", "200", "300", "400", "500"],
    temp: ["8°", "16°", "22°", "27°", "32°", "38°"],
    wind: ["0", "1.5", "3", "4.5", "6.5", "9"],
  };
  const s = stops[metric];
  const gradient = `linear-gradient(90deg, ${s.map((v, i) => `${metricColor(metric, v)} ${(i / (s.length - 1)) * 100}%`).join(", ")})`;
  return (
    <div className={cn("rounded-xl border border-border bg-surface-solid/85 px-3 py-2 shadow-card backdrop-blur-md", className)}>
      {title && <div className="mb-1.5 text-[10.5px] font-semibold text-fg">{title}</div>}
      <div className="h-2 w-48 rounded-full" style={{ background: gradient }} />
      <div className="mt-1 flex w-48 justify-between text-[9.5px] tabular text-fg-subtle">
        {labels[metric].map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
