import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "RiskPilot AI — Portfolio Risk Coach",
  description:
    "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 880, margin: "0 auto", padding: "var(--space)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
