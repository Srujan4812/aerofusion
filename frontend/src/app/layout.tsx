import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });
// NCL Gasdrifo (Enxyclo Studio) — free for personal / non-commercial use only. Buy a licence before commercial use.
const gasdrifo = localFont({ src: "../fonts/NCLGasdrifo-Demo.otf", variable: "--font-gasdrifo", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "AeroFusion — Explainable PM2.5 forecasting for India",
    template: "%s · AeroFusion",
  },
  description:
    "MW-AeroFusion-Net: multi-resolution wavelet, adaptive diffusion graph, ConvLSTM and Transformer network for explainable PM2.5 forecasting across Indian cities.",
  applicationName: "AeroFusion",
  authors: [{ name: "AeroFusion" }],
  keywords: ["PM2.5", "air quality", "India", "forecasting", "explainable AI", "graph neural network", "ConvLSTM"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#07080d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable} ${gasdrifo.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <div className="app-backdrop" aria-hidden />
          {children}
        </Providers>
      </body>
    </html>
  );
}
