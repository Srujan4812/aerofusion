"use client";

import { ChevronsLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tip } from "@/components/ui/primitives";
import { SkyScene } from "@/components/sky/sky-scene";
import { useAppStore } from "@/hooks/use-app-store";
import { NAV_FOOTER, NAV_GROUPS, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors duration-200",
        active ? "text-primary" : "text-fg-muted hover:text-fg",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl bg-primary-soft ring-1 ring-primary/10"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      {!active && <span className="absolute inset-0 rounded-xl bg-surface-sunken opacity-0 transition-opacity duration-200 group-hover:opacity-100" />}
      <Icon className={cn("relative size-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110", active && "drop-shadow-[0_0_6px_var(--ring)]")} />
      {!collapsed && <span className="relative truncate">{item.label}</span>}
      {active && !collapsed && (
        <motion.span layoutId="nav-dot" className="relative ml-auto size-1.5 rounded-full bg-primary" />
      )}
    </Link>
  );
  return collapsed ? (
    <Tip content={item.label} side="right">
      {link}
    </Tip>
  ) : (
    link
  );
}

export function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/" className={cn("flex h-[76px] shrink-0 items-center px-5", collapsed && "justify-center px-0")}>
        <Logo compact={collapsed} />
      </Link>
      <nav className="scrollbar-none flex-1 overflow-y-auto px-3 pb-4" data-lenis-prevent>
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="mt-3 first:mt-1">
            {!collapsed ? (
              <div className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">{g.label}</div>
            ) : (
              <div className="mx-auto mb-2 mt-4 h-px w-6 bg-border-strong" />
            )}
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-3 space-y-0.5 border-t border-border pt-3">
          {NAV_FOOTER.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
            className="relative mx-3 mb-3 h-[188px] shrink-0 overflow-hidden rounded-[22px] border border-border shadow-card"
          >
            <SkyScene pm={18} landmark="vidhana" seed={3} className="absolute inset-0" particles={false} />
            <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/10 to-transparent dark:from-black/60 dark:via-black/10" />
            <div className="relative p-4">
              <div className="text-[11px] font-medium text-fg-muted">AI for</div>
              <div className="font-display text-[19px] font-bold leading-[1.1] text-fg">
                Cleaner Air,
                <br />
                Healthier Tomorrows
              </div>
              <div className="mt-1.5 text-[11px] text-fg-muted">For a sustainable India.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 84 : 264 }}
      transition={{ type: "spring", stiffness: 300, damping: 34 }}
      className="glass sticky top-0 z-40 hidden h-dvh shrink-0 border-r border-border lg:block"
    >
      <SidebarContent collapsed={collapsed} />
      <button
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-[88px] grid size-6 place-items-center rounded-full border border-border-strong bg-surface-solid text-fg-muted shadow-card transition hover:text-primary"
      >
        <ChevronsLeft className={cn("size-3.5 transition-transform duration-300", collapsed && "rotate-180")} />
      </button>
    </motion.aside>
  );
}
