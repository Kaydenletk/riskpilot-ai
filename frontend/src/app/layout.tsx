import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";

import { spaceGrotesk } from "@/lib/fonts";
import { CANONICAL_ORIGIN } from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: {
    default: "RiskPilot AI — Portfolio Risk Management Coach",
    template: "%s | RiskPilot AI",
  },
  description:
    "Portfolio risk analysis for investors: deterministic risk scores, volatility and drawdown metrics, explained in plain English by an AI that cannot invent numbers.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "RiskPilot AI",
    title: "RiskPilot AI — Portfolio Risk Management Coach",
    description:
      "Portfolio risk analysis for investors: deterministic risk scores, volatility and drawdown metrics, explained in plain English by an AI that cannot invent numbers.",
    url: CANONICAL_ORIGIN,
  },
  twitter: {
    card: "summary_large_image",
    title: "RiskPilot AI — Portfolio Risk Management Coach",
    description:
      "Investment risk analysis you can verify. AI explanations that cannot invent the numbers.",
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
      name: "RiskPilot AI — Portfolio Risk X-Ray",
      url: `${CANONICAL_ORIGIN}/analyze`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Build a weighted portfolio and get an instant investment risk analysis — concentration, volatility, worst drawdown — with plain-English risk coaching. Educational, never buy/sell advice.",
    },
  ],
};

// No stored choice -> honor OS preference for the INITIAL theme; light is the
// final fallback (no stored value AND no OS dark preference). Stored value always wins.
// Key is rp-theme (matches ThemeToggle + the e2e/theme spec).
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('rp-theme');if(t!=='dark'&&t!=='light'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={spaceGrotesk.variable} suppressHydrationWarning>
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
