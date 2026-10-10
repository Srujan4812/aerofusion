import {
  CloudSun,
  Database,
  FileChartColumn,
  FlaskConical,
  Info,
  LayoutDashboard,
  MapPinned,
  SlidersHorizontal,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Monitor",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, description: "National snapshot & alerts" },
      { href: "/forecast", label: "Forecast", icon: CloudSun, description: "City PM2.5 forecasts, 24 h – 7 days" },
      { href: "/live-map", label: "Live Map", icon: MapPinned, description: "Heat, wind, fires & transport graph" },
    ],
  },
  {
    label: "Model",
    items: [
      { href: "/model-lab", label: "Model Lab", icon: FlaskConical, description: "Architecture, ablations, training" },
      { href: "/explainability", label: "Explainability", icon: Sparkles, description: "Why the model predicts what it does" },
      { href: "/simulator", label: "What-if Simulator", icon: SlidersHorizontal, description: "Test policy & weather scenarios" },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/data-sources", label: "Data Sources", icon: Database, description: "CPCB, ERA5/IMD, FIRMS & more" },
      { href: "/pipeline", label: "Live Data", icon: Workflow, description: "Live NASA, CAMS, weather & CPCB fusion" },
      { href: "/reports", label: "Reports", icon: FileChartColumn, description: "Trends, rankings & downloads" },
    ],
  },
];

export const NAV_FOOTER: NavItem[] = [{ href: "/about", label: "About", icon: Info, description: "Team, method & integrity" }];

export const ALL_NAV = [...NAV_GROUPS.flatMap((g) => g.items), ...NAV_FOOTER];

export const DATA_MODE: "demo" | "api" = process.env.NEXT_PUBLIC_API_URL ? "api" : "demo";
