"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Dialog } from "radix-ui";
import { Suspense, useEffect, type ReactNode } from "react";
import { useAppStore } from "@/hooks/use-app-store";
import { CITY_BY_SLUG } from "@/lib/cities";
import { CommandMenu } from "./command-menu";
import { Footer } from "./footer";
import { Sidebar, SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";

function MobileNav() {
  const open = useAppStore((s) => s.mobileNavOpen);
  const setOpen = useAppStore((s) => s.setMobileNav);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-y-0 left-0 z-[81] w-[288px] border-r border-border bg-bg-elevated shadow-lift lg:hidden"
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
              >
                <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                <Dialog.Close className="absolute right-3 top-5 z-10 grid size-9 place-items-center rounded-xl text-fg-muted hover:bg-surface-sunken">
                  <X className="size-5" />
                </Dialog.Close>
                <SidebarContent collapsed={false} onNavigate={() => setOpen(false)} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function CityFromQuery() {
  const params = useSearchParams();
  const setCity = useAppStore((s) => s.setCity);
  const q = params.get("city");
  useEffect(() => {
    if (q && CITY_BY_SLUG[q]) setCity(q);
  }, [q, setCity]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 px-4 pb-10 sm:px-6 lg:px-8">{children}</main>
        <Footer />
      </div>
      <MobileNav />
      <CommandMenu />
      <Suspense fallback={null}>
        <CityFromQuery />
      </Suspense>
    </div>
  );
}
