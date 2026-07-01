import type { Metadata } from "next";
import { spaceGrotesk } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "RiskPilot AI — Portfolio Risk Coach",
  description:
    "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
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
      </body>
    </html>
  );
}
