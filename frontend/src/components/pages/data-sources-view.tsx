"use client";

import { ArrowRight, BrainCircuit, Calendar, Clock, Database, ExternalLink, Grid3x3, Layers, MapPin, RefreshCw, Satellite, Settings2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { PageHero, GlassNote } from "@/components/layout/page-hero";
import { MiniIndia, type MiniPoint } from "@/components/map/mini-india";
import { Badge, Dot } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { Skeleton } from "@/components/ui/primitives";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { Segmented } from "@/components/ui/segmented";
import { SOURCES, STATUS_LABEL, type DataSource } from "@/data/sources";
import { useAnchor } from "@/hooks/use-anchor";
import { CITIES } from "@/lib/cities";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { mulberry32 } from "@/lib/rng";
import { fireHotspots } from "@/lib/sim/core";
import { cn } from "@/lib/utils";

type Layer = "stations" | "fires" | "grid";

export function DataSourcesView() {
  const anchor = useAnchor();
  const [layer, setLayer] = useState<Layer>("stations");
  const [open, setOpen] = useState<string | null>(null);

  const stationPoints = useMemo<MiniPoint[]>(() => {
    const rnd = mulberry32(5);
    return CITIES.flatMap((c) =>
      Array.from({ length: c.stations }, (_, i) => ({
        id: `${c.slug}-${i}`,
        lat: c.lat + (rnd() - 0.5) * 0.35,
        lon: c.lon + (rnd() - 0.5) * 0.35,
        color: "#10b981",
        r: 2.2,
        opacity: 0.85,
      })),
    );
  }, []);
  const firePoints = useMemo<MiniPoint[]>(
    () => (anchor === null ? [] : fireHotspots(anchor, 300).points.map((f) => ({ id: f.id, lat: f.lat, lon: f.lon, color: "#f97316", r: 1.8, opacity: 0.8 }))),
    [anchor],
  );
  const metPoints = useMemo<MiniPoint[]>(() => CITIES.map((c) => ({ id: c.slug, lat: c.lat, lon: c.lon, color: "#0ea5e9", r: 3.2, pulse: true })), []);

  const hours = useMemo(() => Math.round((Date.UTC(2026, 9, 1) - Date.UTC(2015, 0, 1)) / 3_600_000), []);
  const totalStations = CITIES.reduce((s, c) => s + c.stations, 0);

  return (
    <div>
      <PageHero
        sky={{ variant: "orbit", pm: 20, seed: 2 }}
        title={
          <>
            Data <span className="text-gradient">Sources</span>
          </>
        }
        subtitle="Satellite, ground, meteorological and auxiliary datasets — each with its role, licence and honest status in the pipeline."
        aside={
          <GlassNote icon={<Database />}>
            Diverse data.
            <br />
            Better predictions.
            <br />
            Cleaner India.
          </GlassNote>
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StaggerItem>
          <Kpi icon={<Database />} label="Data sources" value={SOURCES.filter((s) => s.status === "core").length} unit={`core · ${SOURCES.length} total`} tint="#10b981" />
        </StaggerItem>
        <StaggerItem>
          <Kpi icon={<Calendar />} label="Target period" value="2015 – 2026" tint="#0ea5e9" footer={<span>bootstrap 2015–20 · recent via OpenAQ</span>} />
        </StaggerItem>
        <StaggerItem>
          <Kpi icon={<MapPin />} label="Spatial coverage" value={CITIES.length} unit="cities" tint="#f97316" footer={<span>{totalStations} stations (demo layout)</span>} />
        </StaggerItem>
        <StaggerItem>
          <Kpi icon={<RefreshCw />} label="Update frequency" value="Hourly" tint="#8b5cf6" footer={<span>fires ≈ 3 h · static yearly</span>} />
        </StaggerItem>
      </Stagger>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SOURCES.map((s, i) => (
          <SourceCard key={s.id} s={s} i={i} open={open === s.id} onToggle={() => setOpen((o) => (o === s.id ? null : s.id))} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader
            title="Spatial coverage"
            subtitle={layer === "grid" ? "ConvLSTM raster: ≈ 1° cells over the subcontinent" : layer === "fires" ? "Fire detections today (demo)" : "Monitoring stations by city (demo layout)"}
            action={
              <Segmented
                size="sm"
                value={layer}
                onChange={setLayer}
                options={[
                  { value: "stations", label: "Stations" },
                  { value: "fires", label: "Fires" },
                  { value: "grid", label: "Grid" },
                ]}
              />
            }
          />
          <div className="relative mx-auto max-w-[420px]">
            <AnimatePresence mode="wait">
              <motion.div key={layer} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <MiniIndia
                  width={420}
                  height={470}
                  points={layer === "stations" ? stationPoints : layer === "fires" ? firePoints : metPoints}
                  grid={layer === "grid" ? 1 : undefined}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader title="Data integration pipeline" subtitle="From raw feeds to the model's input tensors" icon={<Layers className="size-4" />} />
          <IntegrationFlow />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<Database className="size-4" />} label="Station-hours (2015→)" value={fmtNum(hours * totalStations / 1e6, 1) + " M"} />
            <Stat icon={<Grid3x3 className="size-4" />} label="Spatial resolution" value="~0.25° met · 1° raster" />
            <Stat icon={<Clock className="size-4" />} label="Temporal resolution" value="1 hour" />
            <Stat icon={<Settings2 className="size-4" />} label="Features / node" value="≈ 50" />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent data updates" subtitle="Ingestion log (simulated in demo mode)" action={<Badge tone="warn">demo</Badge>} />
        {anchor !== null ? <UpdatesTable anchor={anchor} /> : <Skeleton className="h-40" />}
      </Card>
    </div>
  );
}

function SourceCard({ s, i, open, onToggle }: { s: DataSource; i: number; open: boolean; onToggle: () => void }) {
  const icons: Record<string, React.ReactNode> = {
    cpcb: <MapPin />,
    met: <Clock />,
    firms: <Satellite />,
    calendar: <Calendar />,
    static: <Layers />,
    cams: <BrainCircuit />,
    aod: <Satellite />,
    kaggle: <Database />,
  };
  const statusTone = s.status === "core" ? "primary" : s.status === "benchmark" ? "accent" : "neutral";
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.06, duration: 0.5 }}>
      <Card className="group h-full !p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl [&_svg]:size-5" style={{ color: s.color, background: `color-mix(in oklab, ${s.color} 13%, transparent)` }}>
            {icons[s.id]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[15px] font-semibold leading-tight text-fg">{s.name}</div>
            <div className="mt-0.5 truncate text-[11.5px] text-fg-muted">{s.provider}</div>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">{s.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.variables.map((v) => (
            <span key={v} className="rounded-lg px-2 py-0.5 text-[11px] font-medium" style={{ color: s.color, background: `color-mix(in oklab, ${s.color} 11%, transparent)` }}>
              {v}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Dot color={s.status === "core" ? "#10b981" : s.status === "benchmark" ? "#3b82f6" : "#94a3b8"} />
            {s.cadence}
          </span>
          <Badge tone={statusTone}>{STATUS_LABEL[s.status]}</Badge>
        </div>
        <button onClick={onToggle} className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">
          {open ? "Hide details" : "View details"} <ArrowRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.dl initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
                {[
                  ["Role", s.role],
                  ["Resolution", s.resolution],
                  ["Access", s.access],
                  ["Licence", s.license],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-fg-subtle">{k}</dt>
                    <dd className="text-right text-fg">{v}</dd>
                  </div>
                ))}
                <a href={s.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-primary hover:underline">
                  Source <ExternalLink className="size-3" />
                </a>
              </div>
            </motion.dl>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function IntegrationFlow() {
  const inputs = SOURCES.filter((s) => s.status === "core");
  const stages = [
    { title: "Preprocessing", sub: "QC · UTC alignment · imputation (train-fit)", icon: <Settings2 className="size-4" />, color: "#8b5cf6" },
    { title: "Unified spatio-temporal dataset", sub: "Parquet · nodes × hours × features + 32×32 raster", icon: <Database className="size-4" />, color: "#0ea5e9" },
    { title: "MW-AeroFusion-Net", sub: "PM2.5 forecasting + attributions", icon: <BrainCircuit className="size-4" />, color: "#10b981" },
  ];
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {inputs.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="rounded-xl border border-border bg-surface-2 px-2.5 py-2 text-center"
          >
            <div className="text-[12px] font-semibold text-fg">{s.name.split(" ")[0]}</div>
            <div className="truncate text-[10px] text-fg-muted">{s.variables.slice(0, 2).join(", ")}</div>
            <div className="mx-auto mt-1.5 h-1 w-8 rounded-full" style={{ background: s.color }} />
          </motion.div>
        ))}
      </div>
      <svg viewBox="0 0 500 40" className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
        {[50, 150, 250, 350, 450].map((x) => (
          <path key={x} d={`M${x},0 C${x},20 250,20 250,40`} fill="none" stroke="var(--primary)" strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="3 5" className="animate-dash" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mx-auto flex max-w-md flex-col items-center gap-2">
        {stages.map((st, i) => (
          <div key={st.title} className="flex w-full flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.12 }}
              className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3"
              style={{ borderColor: `color-mix(in oklab, ${st.color} 30%, transparent)`, background: `color-mix(in oklab, ${st.color} 7%, transparent)` }}
            >
              <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: st.color }}>
                {st.icon}
              </span>
              <div>
                <div className="text-[13px] font-semibold text-fg">{st.title}</div>
                <div className="text-[11px] text-fg-muted">{st.sub}</div>
              </div>
            </motion.div>
            {i < stages.length - 1 && (
              <div className="relative h-6 w-px overflow-hidden bg-border-strong">
                <motion.div className="absolute inset-x-0 h-3 bg-primary" animate={{ y: [-12, 24] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-display text-sm font-bold text-fg">{value}</div>
    </div>
  );
}

function UpdatesTable({ anchor }: { anchor: number }) {
  const rows = useMemo(() => {
    const rnd = mulberry32(anchor);
    const items = [
      { src: "CPCB (OpenAQ)", type: "PM2.5, PM10, AQI", region: "All cities", lag: 0, recs: () => CITIES.reduce((s, c) => s + c.stations, 0) },
      { src: "ERA5 / Open-Meteo", type: "Weather (hourly)", region: "India grid", lag: 1, recs: () => 12480 },
      { src: "NASA FIRMS", type: "Active fires", region: "North & central India", lag: 2, recs: () => fireHotspots(anchor, 10).total },
      { src: "CAMS (benchmark)", type: "PM2.5 forecast", region: "33 nodes", lag: 3, recs: () => 33 * 120 },
      { src: "Calendar", type: "Proxies", region: "National", lag: 6, recs: () => 24 },
    ];
    return items.map((it) => ({ ...it, t: anchor - it.lag, n: it.recs(), ms: Math.round(400 + rnd() * 2600) }));
  }, [anchor]);
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-fg-subtle">
            <th className="px-2 pb-2 font-semibold">Time (IST)</th>
            <th className="px-2 pb-2 font-semibold">Source</th>
            <th className="px-2 pb-2 font-semibold">Data type</th>
            <th className="px-2 pb-2 font-semibold">Region</th>
            <th className="px-2 pb-2 text-right font-semibold">Records</th>
            <th className="px-2 pb-2 text-right font-semibold">Latency</th>
            <th className="px-2 pb-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <motion.tr key={r.src} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-t border-border">
              <td className="px-2 py-2.5 tabular text-fg-muted">{fmtDateTime(r.t)}</td>
              <td className="px-2 py-2.5 font-medium text-fg">{r.src}</td>
              <td className="px-2 py-2.5 text-fg-muted">{r.type}</td>
              <td className="px-2 py-2.5 text-fg-muted">{r.region}</td>
              <td className="px-2 py-2.5 text-right tabular text-fg">{fmtNum(r.n)}</td>
              <td className="px-2 py-2.5 text-right tabular text-fg-muted">{(r.ms / 1000).toFixed(1)} s</td>
              <td className="px-2 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                  <Dot color="#10b981" /> Updated
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
