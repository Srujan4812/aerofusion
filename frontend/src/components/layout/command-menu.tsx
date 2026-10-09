"use client";

import { Command } from "cmdk";
import { ArrowRight, MapPin, Moon, Search, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useMemo } from "react";
import { useAnchor } from "@/hooks/use-anchor";
import { useAppStore } from "@/hooks/use-app-store";
import { categoryForPm } from "@/lib/aqi";
import { CITIES } from "@/lib/cities";
import { ALL_NAV } from "@/lib/nav";
import { pmAt } from "@/lib/sim/core";

const itemCls =
  "group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg-muted outline-none transition-colors data-[selected=true]:bg-primary-soft data-[selected=true]:text-fg";

export function CommandMenu() {
  const open = useAppStore((s) => s.commandOpen);
  const setOpen = useAppStore((s) => s.setCommandOpen);
  const setCity = useAppStore((s) => s.setCity);
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const anchor = useAnchor();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!useAppStore.getState().commandOpen);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const cityValues = useMemo(
    () => (anchor ? Object.fromEntries(CITIES.map((c) => [c.slug, pmAt(c, anchor)])) : {}),
    [anchor],
  );

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed left-1/2 top-[14vh] z-[101] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl border border-border-strong bg-surface-solid/95 shadow-lift backdrop-blur-2xl"
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              >
                <Dialog.Title className="sr-only">Search</Dialog.Title>
                <Command loop className="flex flex-col">
                  <div className="flex items-center gap-3 border-b border-border px-5">
                    <Search className="size-[18px] text-fg-subtle" />
                    <Command.Input
                      autoFocus
                      placeholder="Search cities, pages, actions…"
                      className="h-14 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-subtle"
                    />
                    <kbd className="rounded-md border border-border-strong px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">ESC</kbd>
                  </div>
                  <Command.List className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin" data-lenis-prevent>
                    <Command.Empty className="py-10 text-center text-sm text-fg-muted">Nothing found.</Command.Empty>
                    <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-fg-subtle">
                      {ALL_NAV.map((n) => (
                        <Command.Item key={n.href} value={`${n.label} ${n.description}`} onSelect={() => go(n.href)} className={itemCls}>
                          <span className="grid size-8 place-items-center rounded-lg bg-surface-sunken text-fg-muted group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-fg">
                            <n.icon className="size-4" />
                          </span>
                          <span className="flex-1">
                            <span className="block font-medium text-fg">{n.label}</span>
                            <span className="block text-xs text-fg-subtle">{n.description}</span>
                          </span>
                          <ArrowRight className="size-4 opacity-0 transition group-data-[selected=true]:opacity-100" />
                        </Command.Item>
                      ))}
                    </Command.Group>
                    <Command.Group heading="Cities" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-fg-subtle">
                      {CITIES.map((c) => {
                        const v = cityValues[c.slug];
                        const cat = v !== undefined ? categoryForPm(v) : null;
                        return (
                          <Command.Item
                            key={c.slug}
                            value={`${c.name} ${c.state}`}
                            onSelect={() => {
                              setCity(c.slug);
                              go(pathname.startsWith("/forecast") || pathname === "/" ? "/forecast" : pathname);
                            }}
                            className={itemCls}
                          >
                            <MapPin className="size-4 text-fg-subtle" />
                            <span className="flex-1">
                              <span className="font-medium text-fg">{c.name}</span>
                              <span className="ml-2 text-xs text-fg-subtle">{c.state}</span>
                            </span>
                            {cat && v !== undefined && (
                              <span className="flex items-center gap-2 text-xs tabular">
                                <span className="size-2 rounded-full" style={{ background: cat.color }} />
                                {Math.round(v)} µg/m³
                              </span>
                            )}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                    <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-fg-subtle">
                      <Command.Item
                        value="toggle theme dark light mode"
                        onSelect={() => {
                          setTheme(resolvedTheme === "dark" ? "light" : "dark");
                          setOpen(false);
                        }}
                        className={itemCls}
                      >
                        {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                        <span className="font-medium text-fg">Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode</span>
                      </Command.Item>
                    </Command.Group>
                  </Command.List>
                </Command>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
