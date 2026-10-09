"use client";

import { ArrowRight, Factory, Flame, Gauge, ShieldCheck, Sparkles, TriangleAlert, Users } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo } from "react";
import { Donut } from "@/components/charts/donut";
import { Sparkline } from "@/components/charts/sparkline";
import { PageHero } from "@/components/layout/page-hero";
import { AtmosMap, HeatLegend } from "@/components/map/atmos-map";
import { AqiBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { AnimatedNumber, Delta, Skeleton } from "@/components/ui/primitives";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { useAnchor, useClock } from "@/hooks/use-anchor";
import { useAppStore } from "@/hooks/use-app-store";
import { useCity } from "@/hooks/use-city";
import { categoryForPm, NAAQS_PM25_24H, pmToAqi } from "@/lib/aqi";
import { fmtHour } from "@/lib/format";
import { fireHotspots, pmAt } from "@/lib/sim/core";
import { globalImportance } from "@/lib/sim/explain";
import { forecastSeries } from "@/lib/sim/forecast";
import { nationalSnapshot } from "@/lib/sim/national";
import { DATA_MODE } from "@/lib/nav";
import { METRICS_STATUS } from "@/data/model-lab";
import { cn } from "@/lib/utils";

function greeting(ms: number | null) {
  if (ms === null) return "Welcome";
  const h = (new Date(ms).getUTCHours() + 5.5) % 24;
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardView() {
  const anchor = useAnchor();
  const clock = useClock();
  const city = useCity();
  const setCity = useAppStore((s) => s.setCity);

  const data = useMemo(() => {
    if (anchor === null) return null;
    const nat = nationalSnapshot(anchor);
    const fires = fireHotspots(anchor, 300);
    const spark = Object.fromEntries(
      nat.cities.map((c) => [c.city.slug, Array.from({ length: 13 }, (_, i) => pmAt(c.city, anchor - 24 + i * 2))]),
    );
    const natSpark = Array.from({ length: 25 }, (_, i) => nat.cities.reduce((s, c) => s + pmAt(c.city, anchor - 48 + i * 2), 0) / nat.cities.length);
    const importance = globalImportance(anchor, 24, 6).slice(0, 5);
    return { nat, fires, spark, natSpark, importance };
  }, [anchor]);

  const mine = useMemo(() => {
    if (anchor === null) return null;
    const s = forecastSeries(city, anchor, 24, 0, 1);
    return { now: s[0].truth, next: s.map((p) => p.pred), peak: Math.max(...s.map((p) => p.pred)) };
  }, [anchor, city]);

  const nat = data?.nat;
  const natCat = categoryForPm(nat?.avg ?? 50);

  return (
    <div>
      <PageHero
        sky={{ pm: nat?.avg ?? 55, landmark: "taj", seed: 11 }}
        eyebrow={<Badge tone="primary">{greeting(clock)} · India air briefing</Badge>}
        title={
          <>
            Air Quality <span className="text-gradient">Overview</span>
          </>
        }
        subtitle={
          nat ? (
            <>
              National average is <b className="text-fg">{Math.round(nat.avg)} µg/m³</b> ({natCat.label.toLowerCase()}).{" "}
              <b className="text-fg">{nat.aboveNaaqs}</b> of {nat.cities.length} cities exceed the 24-h NAAQS of {NAAQS_PM25_24H} µg/m³ right now.
            </>
          ) : (
            "Loading the national picture…"
          )
        }
        aside={
          <div className="glass w-[300px] rounded-3xl border border-white/40 p-4 shadow-lift dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-fg-muted">National avg · 48 h</div>
              {nat && <AqiBadge pm={nat.avg} size="xs" />}
            </div>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div className="font-display text-4xl font-extrabold leading-none text-fg">
                {nat ? <AnimatedNumber value={Math.round(nat.avg)} /> : "—"}
                <span className="ml-1 text-xs font-medium text-fg-muted">µg/m³</span>
              </div>
              {data && <Sparkline values={data.natSpark} width={130} height={44} color={natCat.color} />}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/forecast">
              Open {city.name} forecast <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/live-map">Explore live map</Link>
          </Button>
        </div>
      </PageHero>

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <Kpi
            icon={<Gauge />}
            label="National average PM2.5"
            value={nat ? Math.round(nat.avg) : undefined}
            unit="µg/m³"
            tint={natCat.color}
            footer={nat && (<><Delta value={nat.change24} /> <span>vs same hour yesterday</span></>)}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<TriangleAlert />}
            label="Cities above NAAQS"
            value={nat?.aboveNaaqs}
            unit={nat ? `/ ${nat.cities.length}` : undefined}
            tint="#f97316"
            footer={nat && <span>{nat.improving} cities improving vs yesterday</span>}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<Users />}
            label="People exposed"
            value={nat ? Number(nat.exposed.toFixed(1)) : undefined}
            digits={1}
            unit="million"
            tint="#ef4444"
            footer={nat && <span>in cities above 60 µg/m³ (of {nat.popTotal.toFixed(0)} M)</span>}
          />
        </StaggerItem>
        <StaggerItem>
          <Kpi
            icon={<Flame />}
            label="Fire detections today"
            value={data?.fires.total}
            tint="#f59e0b"
            footer={<span>NASA FIRMS-style (demo)</span>}
          />
        </StaggerItem>
      </Stagger>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card padded={false} className="relative h-[540px] overflow-hidden xl:col-span-7">
          <div className="absolute left-5 top-4 z-10">
            <div className="font-display text-base font-semibold text-fg">PM2.5 across India</div>
            <div className="text-xs text-fg-muted">Interpolated surface · click a city to focus it</div>
          </div>
          {data && anchor !== null ? (
            <AtmosMap
              t={anchor}
              cities={data.nat.cities.map((c) => ({ slug: c.city.slug, name: c.city.name, lat: c.city.lat, lon: c.city.lon, value: c.pm }))}
              fires={data.fires.points}
              selected={city.slug}
              onSelect={setCity}
              padding={40}
              wind
            />
          ) : (
            <Skeleton className="absolute inset-4" />
          )}
          <div className="absolute bottom-4 right-4 z-10">
            <HeatLegend title="PM2.5 (µg/m³)" />
          </div>
        </Card>

        <div className="grid gap-4 xl:col-span-5">
          <Card>
            <CardHeader
              title={`${city.name} · next 24 h`}
              subtitle="Your selected city"
              action={
                <Link href="/forecast" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Details <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            {mine ? (
              <div className="flex items-center gap-5">
                <AqiRing pm={mine.now} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <AqiBadge pm={mine.now} />
                    <span className="text-xs text-fg-muted">AQI {pmToAqi(mine.now)}</span>
                  </div>
                  <Sparkline values={mine.next} width={260} height={64} color={categoryForPm(mine.peak).color} className="mt-2 w-full" />
                  <div className="mt-1 flex justify-between text-[11px] text-fg-subtle">
                    <span>Now</span>
                    <span>
                      Peak <b className="text-fg">{Math.round(mine.peak)}</b> µg/m³
                    </span>
                    <span>+24 h</span>
                  </div>
                </div>
              </div>
            ) : (
              <Skeleton className="h-28" />
            )}
          </Card>

          <Card>
            <CardHeader title="Forecast alerts" subtitle="Cities expected to reach “Poor” or worse in 24 h" icon={<TriangleAlert className="size-4" />} />
            <div className="space-y-1.5">
              {nat ? (
                nat.alerts.length ? (
                  nat.alerts.slice(0, 4).map((a, i) => (
                    <motion.button
                      key={a.city.slug}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => setCity(a.city.slug)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2 text-left transition hover:border-border-strong hover:bg-surface-sunken"
                    >
                      <span className="size-2.5 rounded-full" style={{ background: categoryForPm(a.peak24).color }} />
                      <span className="flex-1 text-sm font-medium text-fg">{a.city.name}</span>
                      <span className="text-xs text-fg-muted">
                        {Math.round(a.pm)} → <b className="text-fg">{Math.round(a.peak24)}</b> at {fmtHour((anchor ?? 0) + a.peakLead)}
                      </span>
                    </motion.button>
                  ))
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="size-4" /> No cities forecast to cross “Poor” in the next 24 h.
                  </div>
                )
              ) : (
                <Skeleton className="h-24" />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="What’s driving PM2.5 today"
              subtitle="Mean |attribution| across all cities, last 24 h"
              icon={<Sparkles className="size-4" />}
              action={
                <Link href="/explainability" className="text-xs font-semibold text-primary hover:underline">
                  Explain
                </Link>
              }
            />
            <div className="space-y-2.5">
              {data
                ? data.importance.map((f, i) => (
                    <div key={f.key}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-fg-muted">{f.label}</span>
                        <span className="font-semibold tabular text-fg">{f.value.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: f.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(f.value / data.importance[0].value) * 100}%` }}
                          transition={{ delay: 0.1 + i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  ))
                : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7" />)}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader title="City rankings" subtitle="Live PM2.5, 24-h trend and next-24-h peak" icon={<Factory className="size-4" />} />
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-fg-subtle">
                  <th className="px-2 pb-2 font-semibold">#</th>
                  <th className="px-2 pb-2 font-semibold">City</th>
                  <th className="px-2 pb-2 text-right font-semibold">PM2.5</th>
                  <th className="px-2 pb-2 font-semibold">Category</th>
                  <th className="px-2 pb-2 font-semibold">Last 24 h</th>
                  <th className="px-2 pb-2 text-right font-semibold">24 h peak</th>
                  <th className="px-2 pb-2 text-right font-semibold">Δ 24 h</th>
                </tr>
              </thead>
              <tbody>
                {nat
                  ? nat.sorted.slice(0, 10).map((c, i) => (
                      <motion.tr
                        key={c.city.slug}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setCity(c.city.slug)}
                        className={cn("cursor-pointer border-t border-border transition hover:bg-surface-sunken/60", c.city.slug === city.slug && "bg-primary-soft/60")}
                      >
                        <td className="px-2 py-2.5 text-xs font-semibold text-fg-subtle">{i + 1}</td>
                        <td className="px-2 py-2.5">
                          <div className="font-medium text-fg">{c.city.name}</div>
                          <div className="text-[11px] text-fg-subtle">{c.city.state}</div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-display font-bold tabular text-fg">{Math.round(c.pm)}</td>
                        <td className="px-2 py-2.5">
                          <AqiBadge pm={c.pm} size="xs" />
                        </td>
                        <td className="px-2 py-2.5">
                          {data && <Sparkline values={data.spark[c.city.slug]} width={110} height={28} color={c.category.color} dot={false} />}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular text-fg-muted">{Math.round(c.peak24)}</td>
                        <td className="px-2 py-2.5 text-right">
                          <Delta value={c.change24} />
                        </td>
                      </motion.tr>
                    ))
                  : null}
              </tbody>
            </table>
            {!nat && <Skeleton className="mx-2 h-64" />}
          </div>
        </Card>

        <div className="grid gap-4 xl:col-span-4">
          <Card>
            <CardHeader title="Stations by category" subtitle="CPCB AQI classes" />
            {nat ? (
              <Donut
                size={170}
                data={nat.counts.filter((c) => c.stations > 0).map((c) => ({ key: c.key, label: c.label, value: c.stations, color: c.color }))}
                center={
                  <div>
                    <div className="font-display text-2xl font-extrabold text-fg">{nat.stations}</div>
                    <div className="text-[11px] text-fg-muted">stations</div>
                  </div>
                }
              />
            ) : (
              <Skeleton className="h-44" />
            )}
          </Card>
          <Card className="overflow-hidden">
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-primary/15 blur-3xl" />
            <CardHeader title="Model status" subtitle="Serving configuration" icon={<ShieldCheck className="size-4" />} />
            <dl className="space-y-2 text-sm">
              <Row label="Model" value="MW-AeroFusion-Net" />
              <Row label="Data mode" value={DATA_MODE === "demo" ? <Badge tone="warn">Demo simulator</Badge> : <Badge tone="primary">API</Badge>} />
              <Row label="Metrics" value={METRICS_STATUS === "measured" ? <Badge tone="primary">Measured</Badge> : <Badge tone="warn">Illustrative</Badge>} />
              <Row label="Horizons" value="1 h · 24 h · 48 h" />
            </dl>
            <Button asChild variant="soft" size="sm" className="mt-4 w-full">
              <Link href="/model-lab">Open Model Lab</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-medium text-fg">{value}</dd>
    </div>
  );
}

function AqiRing({ pm }: { pm: number }) {
  const cat = categoryForPm(pm);
  const aqi = pmToAqi(pm);
  const frac = Math.min(1, aqi / 500);
  const C = 2 * Math.PI * 42;
  return (
    <div className="relative grid size-[112px] shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-sunken)" strokeWidth="9" />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={cat.color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - frac) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${cat.color}66)` }}
        />
      </svg>
      <div className="text-center">
        <div className="font-display text-[26px] font-extrabold leading-none text-fg">
          <AnimatedNumber value={Math.round(pm)} />
        </div>
        <div className="mt-1 text-[10px] text-fg-muted">µg/m³</div>
      </div>
    </div>
  );
}
