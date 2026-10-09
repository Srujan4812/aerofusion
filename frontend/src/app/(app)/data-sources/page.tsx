import type { Metadata } from "next";
import { DataSourcesView } from "@/components/pages/data-sources-view";

export const metadata: Metadata = { title: "Data Sources" };

export default function DataSourcesPage() {
  return <DataSourcesView />;
}
