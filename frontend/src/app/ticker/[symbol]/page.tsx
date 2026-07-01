// Server Component for a single-ticker read. Resolves the symbol through the
// allow-list: anything outside the universe → notFound() (the injection/Scope-A
// boundary — a bad "ticker" never reaches a model call).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TickerView } from "@/components/ticker/TickerView";
import { tickerDescription, tickerPath, tickerTitle } from "@/lib/seo";
import { fetchTickerReport, fixtureUniverse } from "@/lib/ticker-backend";

import styles from "../../page.module.css";

// ISR: prerender at build, refresh hourly. With a hosted backend the fetches
// below pick up live data on the cycle; with none, the fixture render repeats.
// Literal (not imported const): Next statically analyzes segment config.
export const revalidate = 3600;

// Prerender all 11 allow-listed tickers at build (from the committed fixtures).
// Unknown symbols aren't listed → rendered on demand → notFound() → 404.
export function generateStaticParams() {
  return fixtureUniverse().map((o) => ({ symbol: o.ticker.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const report = await fetchTickerReport(symbol);
  if (!report) {
    // Page will notFound(); don't index it.
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const title = tickerTitle(report.ticker, report.facts);
  const description = tickerDescription(report.ticker, report.facts);
  const path = tickerPath(report.ticker);
  return {
    title: { absolute: title }, // already ends with "| RiskPilot AI"
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const report = await fetchTickerReport(symbol);
  if (!report) notFound();

  return (
    <div className={styles.page}>
      <header className={`${styles.masthead} stage stage-1`}>
        <Link href="/" className={styles.brand} style={{ textDecoration: "none" }}>
          RiskPilot<span className={styles.brandAccent}>AI</span>
        </Link>
        <div className="caption">single-instrument risk read · explains the math</div>
      </header>
      <TickerView report={report} />
    </div>
  );
}
