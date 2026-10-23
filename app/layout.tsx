import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/components/Providers";

import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-archivo", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Atlas — Global Situational Awareness",
  description:
    "Real-time OSINT console: country risk, signals, markets and world news on a GPU-rendered map. Built on free, open data.",
  metadataBase: new URL("https://atlas-eight-fawn.vercel.app"),
  openGraph: {
    type: "website",
    siteName: "Atlas",
    title: "Atlas — Global Situational Awareness",
    description: "Country risk, live signals, markets and world news on a GPU-rendered globe, built on free open data.",
    images: [{ url: "/og.png", width: 1440, height: 900, alt: "Atlas console: layer dock, risk globe and intel panel" }]
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#201e1d" },
    { media: "(prefers-color-scheme: light)", color: "#f3f2f2" }
  ]
};

// Applies the saved/system theme before first paint to avoid a theme flash.
const themeScript = `(function(){try{var s=localStorage.getItem("atlas-theme");var l=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches;document.documentElement.classList.add(s||(l?"light":"dark"))}catch(e){document.documentElement.classList.add("dark")}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
