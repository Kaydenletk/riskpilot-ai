import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";

import { spaceGrotesk } from "@/lib/fonts";
import { CANONICAL_ORIGIN } from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: {
    default: "RiskPilot AI — Portfolio Risk Coach",
    template: "%s | RiskPilot AI",
  },
  description:
    "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "RiskPilot AI",
    title: "RiskPilot AI — Portfolio Risk Coach",
    description:
      "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
    url: CANONICAL_ORIGIN,
  },
  twitter: {
    card: "summary_large_image",
    title: "RiskPilot AI — Portfolio Risk Coach",
    description:
      "Portfolio risk math you can verify. AI explanations that cannot invent the numbers.",
  },
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
      </head>
      <body>
        <main>{children}</main>
        <SpeedInsights />
      </body>
    </html>
  );
}
