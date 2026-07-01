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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <head>
        <script
          // Pre-paint: apply the saved theme before first paint to avoid a flash.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("riskpilot-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}`,
          }}
        />
      </head>
      <body>
        <main>{children}</main>
        <SpeedInsights />
      </body>
    </html>
  );
}
