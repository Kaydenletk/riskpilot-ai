import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "RiskPilot AI — Portfolio Risk Coach",
  description:
    "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
};

// No stored choice -> honor OS preference for the INITIAL theme; light is the
// final fallback (no stored value AND no OS dark preference). Stored value always wins.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('rp-theme');if(t!=='dark'&&t!=='light'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
