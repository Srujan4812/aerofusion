import Link from "next/link";
import { DATA_MODE } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="no-print border-t border-border px-4 py-6 text-xs text-fg-subtle sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          © 2026 MW-AeroFusion-Net · Group 40, Dept. of CSE, B.M.S. College of Engineering, Bengaluru
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Mode:{" "}
            <span className={DATA_MODE === "demo" ? "font-semibold text-amber-600 dark:text-amber-300" : "font-semibold text-primary"}>
              {DATA_MODE === "demo" ? "Demo simulator" : "API"}
            </span>
          </span>
          <span>
            Boundaries:{" "}
            <a className="underline-offset-2 hover:underline" href="https://github.com/datameet/maps" target="_blank" rel="noreferrer">
              DataMeet (CC BY 4.0)
            </a>
          </span>
          <Link href="/about" className="underline-offset-2 hover:underline">
            Methodology & integrity
          </Link>
        </div>
      </div>
    </footer>
  );
}
