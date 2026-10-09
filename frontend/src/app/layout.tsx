import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "AeroFusion — Explainable PM2.5 forecasting for India",
    template: "%s · AeroFusion",
  },
  description:
    "MW-AeroFusion-Net: multi-resolution wavelet, adaptive diffusion graph, ConvLSTM and Transformer network for explainable PM2.5 forecasting across Indian cities.",
  applicationName: "AeroFusion",
  authors: [{ name: "Group 40 · B.M.S. College of Engineering" }],
  keywords: ["PM2.5", "air quality", "India", "forecasting", "explainable AI", "graph neural network", "ConvLSTM"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#050c09" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jakarta.variable} ${mono.variable} h-full antialiased`}
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
