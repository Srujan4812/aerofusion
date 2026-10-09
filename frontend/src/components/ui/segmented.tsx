"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  variant = "surface",
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
  className?: string;
  variant?: "surface" | "primary";
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface-sunken/70 p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-0 rounded-[9px] font-medium transition-colors duration-200",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs",
              active ? (variant === "primary" ? "text-primary-fg" : "text-fg") : "text-fg-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className={cn(
                  "absolute inset-0 -z-10 rounded-[9px]",
                  variant === "primary" ? "bg-primary shadow-[0_6px_18px_-8px_var(--primary)]" : "bg-surface-solid shadow-card",
                )}
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function PillTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("glass inline-flex flex-wrap items-center gap-1 rounded-2xl border border-border p-1.5 shadow-card", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-0 rounded-xl px-4 py-2 text-[13px] font-medium transition-colors duration-200",
              active ? "text-primary-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`pill-${id}`}
                className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-[0_8px_22px_-10px_var(--primary)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
