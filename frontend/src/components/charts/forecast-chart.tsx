"use client";

import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AQI_CATEGORIES, categoryForAqi, categoryForPm, pmToAqi } from "@/lib/aqi";
import { fmtDay, fmtHour, fmtLead } from "@/lib/format";
import type { ForecastPoint } from "@/lib/sim/forecast";
import { ChartTip } from "./chart-tooltip";

export interface ForecastDatum {
  i: number;
  t: number;
  lead: number;
  actual: number | null;
  pred: number | null;
  band: [number, number] | null;
  cams: number | null;
}

export function toForecastData(points: ForecastPoint[], metric: "pm" | "aqi" = "pm"): ForecastDatum[] {
  const f = metric === "aqi" ? pmToAqi : (v: number) => v;
  return points.map((p, i) => ({
    i,
    t: p.t,
    lead: p.lead,
    actual: p.lead <= 0 ? f(p.actual ?? p.truth) : null,
    pred: p.lead >= 0 ? f(p.pred) : null,
    band: p.lead >= 0 ? [f(p.p10), f(p.p90)] : null,
    cams: p.lead >= 0 ? f(p.cams) : null,
  }));
}

export function ForecastChart({
  data,
  metric = "pm",
  height = 300,
  showCams = false,
  onHover,
  showBands = true,
  daily = false,
}: {
  data: ForecastDatum[];
  metric?: "pm" | "aqi";
  height?: number;
  showCams?: boolean;
  onHover?: (d: ForecastDatum | null) => void;
  showBands?: boolean;
  daily?: boolean;
}) {
  const gid = useId().replace(/:/g, "");
  const values = data.flatMap((d) => [d.actual ?? 0, d.band?.[1] ?? 0, d.pred ?? 0]);
  const yMax = Math.max(60, Math.ceil((Math.max(...values) * 1.12) / 25) * 25);
  const nowIdx = data.findIndex((d) => d.lead === 0);
  const unit = metric === "aqi" ? "" : " µg/m³";
  const cats = metric === "aqi" ? AQI_CATEGORIES.map((c) => ({ ...c, lo: c.aqi[0], hi: c.aqi[1] })) : AQI_CATEGORIES.map((c) => ({ ...c, lo: c.pm[0], hi: c.pm[1] }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 8, bottom: 0, left: -12 }}
          onMouseMove={(s: unknown) => {
            const st = s as { activeTooltipIndex?: number | string | null };
            const idx = st?.activeTooltipIndex;
            if (idx === undefined || idx === null) return;
            onHover?.(data[Number(idx)] ?? null);
          }}
          onMouseLeave={() => onHover?.(null)}
        >
          <defs>
            <linearGradient id={`band-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.08} />
            </linearGradient>
            <linearGradient id={`pred-${gid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          {showBands &&
            cats.map((c) =>
              c.lo < yMax ? (
                <ReferenceArea key={c.key} y1={c.lo} y2={Math.min(c.hi, yMax)} fill={c.color} fillOpacity={0.045} strokeOpacity={0} ifOverflow="hidden" />
              ) : null,
            )}
          <CartesianGrid vertical={false} strokeDasharray="3 6" />
          <XAxis
            dataKey="i"
            type="number"
            domain={[0, data.length - 1]}
            ticks={data.filter((d, k) => (daily ? d.lead % 24 === 0 : k % Math.max(1, Math.round(data.length / 8)) === 0)).map((d) => d.i)}
            tickFormatter={(i: number) => {
              const d = data[i];
              if (!d) return "";
              if (d.lead === 0) return "Now";
              return daily ? fmtDay(d.t) : fmtHour(d.t);
            }}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis domain={[0, yMax]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={46} />
          <Tooltip
            cursor={{ stroke: "var(--fg-subtle)", strokeDasharray: "4 4" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ForecastDatum;
              const v = d.pred ?? d.actual ?? 0;
              const cat = metric === "aqi" ? categoryForAqi(v) : categoryForPm(v);
              return (
                <ChartTip
                  title={`${fmtDay(d.t)} · ${fmtHour(d.t)} (${fmtLead(d.lead)})`}
                  rows={[
                    ...(d.actual !== null ? [{ label: "Observed", value: `${Math.round(d.actual)}${unit}`, color: "var(--fg)" }] : []),
                    ...(d.pred !== null && d.lead > 0 ? [{ label: "Forecast (P50)", value: `${Math.round(d.pred)}${unit}`, color: "var(--primary)" }] : []),
                    ...(d.band && d.lead > 0 ? [{ label: "P10 – P90", value: `${Math.round(d.band[0])} – ${Math.round(d.band[1])}` }] : []),
                    ...(showCams && d.cams !== null && d.lead > 0 ? [{ label: "CAMS (ext.)", value: `${Math.round(d.cams)}${unit}`, color: "var(--accent)", dashed: true }] : []),
                  ]}
                  footer={
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: cat.color }} /> {cat.label}
                    </span>
                  }
                />
              );
            }}
          />
          <Area type="monotone" dataKey="band" stroke="none" fill={`url(#band-${gid})`} isAnimationActive animationDuration={900} connectNulls={false} />
          {showCams && (
            <Line type="monotone" dataKey="cams" stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="5 5" dot={false} isAnimationActive animationDuration={900} />
          )}
          <Line type="monotone" dataKey="actual" stroke="var(--fg)" strokeOpacity={0.75} strokeWidth={2} dot={false} isAnimationActive animationDuration={700} />
          <Line
            type="monotone"
            dataKey="pred"
            stroke={`url(#pred-${gid})`}
            strokeWidth={2.8}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 3, stroke: "var(--surface-solid)", fill: "var(--primary)" }}
            isAnimationActive
            animationDuration={1100}
          />
          {nowIdx >= 0 && (
            <ReferenceLine
              x={nowIdx}
              stroke="var(--fg)"
              strokeOpacity={0.35}
              strokeDasharray="3 4"
              label={{ value: "Now", position: "insideTopRight", fill: "var(--fg-muted)", fontSize: 11 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
