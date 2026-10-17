import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";

import { spaceGrotesk } from "@/lib/fonts";
import { CANONICAL_ORIGIN } from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: {
    default: "RiskPilot — Your Investing Second Brain",
    template: "%s | RiskPilot AI",
  },
  description:
    "Understand public companies, inspect source evidence, and keep your own investment research and reasoning.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "RiskPilot AI",
    title: "RiskPilot — Your Investing Second Brain",
    description:
      "Understand public companies, inspect source evidence, and keep your own investment research and reasoning.",
    url: CANONICAL_ORIGIN,
  },
  twitter: {
    card: "summary_large_image",
    title: "RiskPilot — Your Investing Second Brain",
    description:
      "Explore company fundamentals and disclosed risks with source-linked research. Build your own understanding.",
  },
};

// Structured data: the site + the free web app. Static content only — no user
// input flows into this JSON.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "RiskPilot AI",
      url: CANONICAL_ORIGIN,
    },
    {
      "@type": "WebApplication",
      name: "RiskPilot — Guided Stock Research",
      url: CANONICAL_ORIGIN,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "A guided research workspace with company maps, historical source notes, personal understanding and a decision journal. Educational research; no buy/sell recommendations.",
    },
  ],
};

// No stored choice -> honor OS preference for the INITIAL theme; light is the
// final fallback (no stored value AND no OS dark preference). Stored value always wins.
// Key is rp-theme (matches ThemeToggle + the e2e/theme spec).
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('rp-theme');if(t!=='dark'&&t!=='light'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={spaceGrotesk.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>
        <main>{children}</main>
        <SpeedInsights />
      </body>
    </html>
  );
}
