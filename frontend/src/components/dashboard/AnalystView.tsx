"use client";

// Persona A — "The Evaluator". The precise instrument dashboard: gauge, the
// deterministic receipts, allocation, and the AI explanation with verified chips.

import { useState } from "react";

import type { RiskReport } from "@/lib/types";

import { AllocationBar } from "./AllocationBar";
import { GroundedText } from "./GroundedText";
import { HoldingsTable } from "./HoldingsTable";
import { NumberCard } from "./NumberCard";
import { RiskGauge } from "./RiskGauge";
import { VerdictHeadline } from "./VerdictHeadline";
import styles from "../../app/page.module.css";

const SOURCE_LABEL: Record<string, string> = {
  model: "AI-written · every figure verified against computed data",
  model_regenerated: "AI-written (regenerated after a guardrail catch) · figures verified",
  template_fallback: "Deterministic summary (AI fell back) · figures verified",
  demo_fixture: "Sample explanation · every figure verified against computed data",
};


export function AnalystView({ report }: { report: RiskReport }) {
  const { facts, explanation, holdings, disclaimer, portfolio_name, as_of } = report;

  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const shownHoldings = sectorFilter
    ? holdings.filter((h) => h.sector === sectorFilter)
    : holdings;

  return (
    <>
      <section className={`${styles.hero} stage stage-2`}>
        <RiskGauge score={facts.risk_score} band={facts.risk_band} />
        <div className={styles.verdict}>
          <div className="caption">{portfolio_name}</div>
          <VerdictHeadline facts={facts} />
          <p className={styles.lede}>
            Top 3 holdings are <strong className="num">{facts.concentration_pct_top3}%</strong> of
            the book; {facts.largest_sector} leads at{" "}
            <strong className="num">{facts.largest_sector_pct}%</strong>.
          </p>
        </div>
      </section>

      <section className={`${styles.metrics} stage stage-3`}>
        <NumberCard label="Top-3 concentration" value={`${facts.concentration_pct_top3}%`} />
        <NumberCard label="Annualized volatility" value={`${facts.volatility_annualized_pct}%`} />
        <NumberCard label="Worst drawdown" value={`${facts.max_drawdown_pct}%`} />
        <NumberCard label="Holdings" value={`${facts.holdings_count}`} />
      </section>

      <section className={`${styles.allocation} stage stage-3`}>
        <div className="caption" style={{ marginBottom: "var(--space-2)" }}>
          Holdings {sectorFilter ? `· ${sectorFilter}` : ""}
        </div>
        <HoldingsTable holdings={holdings} onSelectSector={setSectorFilter} />
        <AllocationBar holdings={shownHoldings} />
      </section>

      <section className={`${styles.explain} stage stage-4`}>
        <div className={styles.verified}>
          <span className={styles.check} aria-hidden>
            ✓
          </span>
          {SOURCE_LABEL[explanation.source] ?? "Figures verified against computed data"}
        </div>
        <details>
          <summary className="caption">Full explanation</summary>
          <p className={styles.summary}>
            <GroundedText text={explanation.summary} />
          </p>
          <div className={styles.cols}>
            <div>
              <div className="caption">Top risk factors</div>
              <ul className={styles.list}>
                {explanation.top_risk_factors.map((f) => (
                  <li key={f}>
                    <GroundedText text={f} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="caption">Review checklist</div>
              <ul className={styles.list}>
                {explanation.review_checklist.map((q) => (
                  <li key={q}>
                    <GroundedText text={q} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </section>

      <footer className={styles.footer}>
        <span className="num">{holdings.length} holdings</span> · {as_of}
        <p className="disclaimer">{disclaimer}</p>
      </footer>
    </>
  );
}

