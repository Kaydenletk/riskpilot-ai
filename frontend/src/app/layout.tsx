import type { Metadata } from "next";

import "./globals.css";

const SITE_TITLE = "RiskPilot AI — Portfolio Risk Coach";
const SITE_DESCRIPTION =
  "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.";

// Absolute-URL base for social cards. Vercel injects VERCEL_URL at build; fall
// back to a sane default for local/preview so tags still resolve.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "RiskPilot AI",
  openGraph: {
    type: "website",
    siteName: "RiskPilot AI",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
