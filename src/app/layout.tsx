import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Jost } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SteepEasterEgg } from "@/components/layout/SteepEasterEgg";
import { StickyBookBar } from "@/components/layout/StickyBookBar";
import { ServiceWorker } from "@/components/system/ServiceWorker";
import { copy } from "@/content/copy";
import "@/styles/globals.css";

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
  /* Mono text is never the first paint, so it does not compete with Jost and CSS. */
  preload: false,
});

export const metadata: Metadata = {
  title: { default: copy.meta.title, template: `%s · ${copy.meta.title}` },
  description: copy.meta.description,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" data-theme="night" className={`${jost.variable} ${plexMono.variable}`}>
      <body className="flex min-h-svh flex-col">
        <a
          href="#content"
          className="sr-only z-50 rounded-sm bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {copy.nav.skip}
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <StickyBookBar />
        <ServiceWorker />
        <SteepEasterEgg />
        <div className="noise-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
