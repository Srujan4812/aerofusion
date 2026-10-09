"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import { AnimatedNumber, Skeleton } from "./primitives";

export function Kpi({
  icon,
  label,
  value,
  digits = 0,
  unit,
  sub,
  footer,
  tint = "var(--primary)",
  loading,
  className,
  children,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value?: number | string;
  digits?: number;
  unit?: ReactNode;
  sub?: ReactNode;
  footer?: ReactNode;
  tint?: string;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cn("group overflow-hidden !p-4 sm:!p-5", className)}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: tint }}
      />
      <div className="relative flex items-start gap-3.5">
        {icon && (
          <div
            className="grid size-11 shrink-0 place-items-center rounded-2xl [&_svg]:size-5"
            style={{ color: tint, background: `color-mix(in oklab, ${tint} 13%, transparent)` }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-fg-muted">{label}</div>
          {loading || value === undefined ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-[28px] font-bold leading-none tracking-tight text-fg">
                {typeof value === "number" ? <AnimatedNumber value={value} digits={digits} /> : value}
              </span>
              {unit && <span className="text-xs font-medium text-fg-muted">{unit}</span>}
            </div>
          )}
          {sub && <div className="mt-1.5 truncate text-xs text-fg-muted">{sub}</div>}
          {footer && <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">{footer}</div>}
        </div>
      </div>
      {children}
    </Card>
  );
}
