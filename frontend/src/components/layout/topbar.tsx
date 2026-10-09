"use client";

import { Bell, CalendarClock, Menu, Search, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { useMemo } from "react";
import { AqiBadge, Dot } from "@/components/ui/badge";
import { Kbd, Tip } from "@/components/ui/primitives";
import { useAnchor, useClock } from "@/hooks/use-anchor";
import { useAppStore } from "@/hooks/use-app-store";
import { fmtDateTimeMs } from "@/lib/format";
import { DATA_MODE } from "@/lib/nav";
import { nationalSnapshot } from "@/lib/sim/national";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";

function DataModePill() {
  const demo = DATA_MODE === "demo";
  return (
    <Tip
      content={
        demo ? (
          <div className="space-y-1">
            <div className="font-semibold">Demo data</div>
            <div className="text-fg-muted">
              Values come from a deterministic simulator so the interface can be built while MW-AeroFusion-Net is
              trained. Set <code className="font-mono">NEXT_PUBLIC_API_URL</code> to show model outputs from the API.
            </div>
          </div>
        ) : (
          "Connected to the AeroFusion API — model outputs."
        )
      }
      side="bottom"
    >
      <div
        className={cn(
          "hidden h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold sm:flex",
          demo
            ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        )}
      >
        <Dot color={demo ? "#f59e0b" : "#10b981"} pulse />
        {demo ? "Demo data" : "Live"}
      </div>
    </Tip>
  );
}

function Clock() {
  const now = useClock();
  return (
    <div className="hidden h-10 items-center gap-2 rounded-xl border border-border bg-surface-solid/70 px-3 text-xs font-medium text-fg-muted xl:flex">
      <CalendarClock className="size-4 text-fg-subtle" />
      <span className="tabular">{now ? fmtDateTimeMs(now) : "—"}</span>
      <span className="text-fg-subtle">IST</span>
    </div>
  );
}

function Notifications() {
  const anchor = useAnchor();
  const alerts = useMemo(() => (anchor ? nationalSnapshot(anchor).alerts : []), [anchor]);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Alerts"
          className="relative grid size-10 place-items-center rounded-xl border border-border bg-surface-solid/70 text-fg-muted transition hover:text-fg"
        >
          <Bell className="size-[18px]" />
          {alerts.length > 0 && (
            <span className="absolute right-2 top-2 grid size-2 place-items-center">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-500" />
              <span className="relative size-2 rounded-full bg-red-500 ring-2 ring-surface-solid" />
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-[90] w-[340px] rounded-2xl border border-border-strong bg-surface-solid/95 p-2 shadow-lift backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="font-display text-sm font-semibold">Forecast alerts</div>
            <span className="text-[11px] text-fg-subtle">next 24 h</span>
          </div>
          <div className="max-h-[360px] space-y-1 overflow-y-auto" data-lenis-prevent>
            {alerts.length === 0 && <div className="px-3 py-6 text-center text-xs text-fg-muted">No cities forecast to cross “Poor”.</div>}
            {alerts.map((a) => (
              <Link
                key={a.city.slug}
                href={`/forecast?city=${a.city.slug}`}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-sunken"
              >
                <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-500">
                  <TriangleAlert className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{a.city.name}</span>
                    <AqiBadge pm={a.peak24} size="xs" />
                  </div>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    Peak <span className="font-semibold text-fg tabular">{Math.round(a.peak24)} µg/m³</span> expected in {a.peakLead} h
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Topbar() {
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const setMobileNav = useAppStore((s) => s.setMobileNav);
  return (
    <header className="sticky top-0 z-30 h-[76px]">
      <div className="pointer-events-none absolute inset-0 border-b border-transparent bg-gradient-to-b from-bg/80 via-bg/40 to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]" />
      <div className="relative flex h-full items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setMobileNav(true)}
          aria-label="Open navigation"
          className="grid size-10 place-items-center rounded-xl border border-border bg-surface-solid/70 text-fg-muted lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/" className="lg:hidden">
          <LogoMark className="size-8" />
        </Link>
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => setCommandOpen(true)}
          className="glass group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border px-3 text-left text-sm text-fg-subtle shadow-card transition hover:border-border-strong sm:max-w-[380px]"
        >
          <Search className="size-4 shrink-0 transition group-hover:text-primary" />
          <span className="truncate">Search city, page or action…</span>
          <span className="ml-auto hidden items-center gap-1 sm:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </motion.button>
        <div className="ml-auto flex items-center gap-2">
          <Clock />
          <DataModePill />
          <Notifications />
          <ThemeToggle />
          <Link
            href="/about"
            className="hidden size-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 font-display text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.8)] sm:grid"
            aria-label="Team"
          >
            G40
          </Link>
        </div>
      </div>
    </header>
  );
}
