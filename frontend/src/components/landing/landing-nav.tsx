"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/forecast", label: "Forecast" },
  { href: "/live-map", label: "Live Map" },
  { href: "/model-lab", label: "Model Lab" },
  { href: "/explainability", label: "Explainability" },
  { href: "/about", label: "About" },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6"
    >
      <div
        className={cn(
          "glass mx-auto flex h-16 max-w-6xl items-center gap-6 rounded-full pl-4 pr-2 transition-all duration-500 sm:pl-5",
          scrolled ? "" : "[--lg-fill:rgba(255,255,255,0.32)] dark:[--lg-fill:rgba(255,255,255,0.05)]",
        )}
      >
        <Link href="/" aria-label="AeroFusion home">
          <Logo />
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-fg/80 transition hover:bg-surface-sunken hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-2">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="group hidden h-12 items-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-bg shadow-lift transition hover:opacity-90 sm:inline-flex"
          >
            Open Dashboard <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-full hover:bg-surface-sunken md:hidden" aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-pop mx-auto mt-2 max-w-6xl rounded-[28px] p-2 md:hidden"
          >
            {[...LINKS, { href: "/dashboard", label: "Open Dashboard" }].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-sm font-medium text-fg hover:bg-surface-sunken">
                {l.label}
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
