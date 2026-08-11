// Server shell: fetches the universe, renders the header, hands off to the
// client builder. useSearchParams (in AnalyzeClient) requires the Suspense
// boundary in Next 15.
import { Suspense } from "react";
import type { Metadata } from "next";

import { Masthead } from "@/components/layout/Masthead";
import { fetchTickerUniverse } from "@/lib/ticker-backend";

import { AnalyzeClient } from "./AnalyzeClient";
import styles from "./analyze.module.css";
import page from "../page.module.css";

export const metadata: Metadata = {
  title: "Analyze your portfolio",
  description:
    "Build a weighted portfolio from the vetted universe and get a deterministic risk X-Ray, explained by a guardrailed AI.",
};

export default async function AnalyzePage() {
  const universe = await fetchTickerUniverse();

  return (
    <div className={page.page}>
      <Masthead caption="analyze your own holdings · figures come from the engine" />

      <header className={`${styles.header} stage stage-1`}>
        <div className="caption">Build your portfolio</div>
        <h1 className={styles.title}>What are you actually holding?</h1>
        <p className={styles.support}>
          3–20 holdings from the {universe.length}-instrument universe. Weights, not dollars —
          nothing you enter leaves your browser except tickers and percentages.
        </p>
      </header>

      <Suspense fallback={null}>
        <AnalyzeClient universe={universe} />
      </Suspense>
    </div>
  );
}
