"use client";
// Persona A — "The Evaluator". The precise instrument dashboard: gauge, the
// deterministic receipts, allocation, and the AI explanation with verified chips.
// This view is unchanged from the original design — it already serves A well.
import { useState } from "react";

import type { RiskReport } from "@/lib/types";

import { AllocationBar } from "./AllocationBar";
import { GroundedText } from "./GroundedText";
import { HoldingsTable } from "./HoldingsTable";
import { RiskGauge } from "./RiskGauge";
import styles from "../../app/page.module.css";

const SOURCE_LABEL: Record<string, string> = {
  model: "AI-written · every figure verified against computed data",
  model_regenerated: "AI-written (regenerated after a guardrail catch) · figures verified",
  template_fallback: "Deterministic summary (AI fell back) · figures verified",
  demo_fixture: "Sample explanation · every figure verified against computed data",
};

function bandKey(band: string): string {
  if (band === "aggressive") return "high";
  if (band === "moderate") return "mid";
  return "low";
}

// metric tile label -> the keyword that identifies its risk-factor <li>.
const TILE_FACTOR_KEYWORD: Record<string, string> = {
  "Top-3 concentration": "concentration",
  "Annualized volatility": "volatility",
  "Worst drawdown": "drawdown",
  "Holdings": "diversification",
};

// resolve a tile label to a factor index, or null if none matches.
function factorIndexFor(label: string, factors: string[]): number | null {
  const kw = TILE_FACTOR_KEYWORD[label];
  if (!kw) return null;
  const i = factors.findIndex((f) => f.toLowerCase().includes(kw));
  return i >= 0 ? i : null;
}

export function AnalystView({ report }: { report: RiskReport }) {
  const { facts, explanation, holdings, disclaimer, portfolio_name, as_of } = report;
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [flashed, setFlashed] = useState<number | null>(null);

  function jumpToFactor(label: string) {
    const i = factorIndexFor(label, explanation.top_risk_factors);
    if (i === null) return;
    const el = document.getElementById(`risk-factor-${i}`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    setFlashed(i);
    window.setTimeout(() => setFlashed((cur) => (cur === i ? null : cur)), 1200);
  }

  return (
    <>
      <section className={`${styles.hero} stage stage-2`}>
        <RiskGauge score={facts.risk_score} band={facts.risk_band} />
        <div className={styles.verdict}>
          <div className="caption">{portfolio_name}</div>
          <h1 className={styles.headline}>
            This portfolio is{" "}
            <span style={{ color: `var(--risk-${bandKey(facts.risk_band)})` }}>
              {facts.risk_band}
            </span>
            .
          </h1>
          <p className={styles.lede}>
            Its top 3 holdings are{" "}
            <strong className="num">{facts.concentration_pct_top3}%</strong> of the book, and{" "}
            {facts.largest_sector} is the largest sector at{" "}
            <strong className="num">{facts.largest_sector_pct}%</strong>.
          </p>
        </div>
      </section>

      <section className={`${styles.metrics} stage stage-3`}>
        <Metric label="Top-3 concentration" value={`${facts.concentration_pct_top3}%`} onJump={() => jumpToFactor("Top-3 concentration")} />
        <Metric label="Annualized volatility" value={`${facts.volatility_annualized_pct}%`} onJump={() => jumpToFactor("Annualized volatility")} />
        <Metric label="Worst drawdown" value={`${facts.max_drawdown_pct}%`} onJump={() => jumpToFactor("Worst drawdown")} />
        <Metric label="Holdings" value={`${facts.holdings_count}`} onJump={() => jumpToFactor("Holdings")} />
      </section>

      <section className={`${styles.allocation} stage stage-3`}>
        <AllocationBar
          holdings={holdings}
          selectedSector={selectedSector}
          onSelectSector={setSelectedSector}
        />
      </section>

      <section className={`${styles.allocation} stage stage-3`}>
        <div className="caption" style={{ marginBottom: 8 }}>Holdings</div>
        <HoldingsTable
          holdings={holdings}
          selectedSector={selectedSector}
          onClearFilter={() => setSelectedSector(null)}
        />
      </section>

      <section className={`${styles.explain} stage stage-4`}>
        <div className={styles.verified}>
          <span className={styles.check} aria-hidden>
            ✓
          </span>
          {SOURCE_LABEL[explanation.source] ?? "Figures verified against computed data"}
        </div>
        <p className={styles.summary}>
          <GroundedText text={explanation.summary} />
        </p>
        <div className={styles.cols}>
          <div>
            <div className="caption">Top risk factors</div>
            <ul className={styles.list}>
              {explanation.top_risk_factors.map((f, i) => (
                <li key={f} id={`risk-factor-${i}`} className={flashed === i ? styles.factorFlash : undefined}>
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
      </section>

      <footer className={styles.footer}>
        <span className="num">{holdings.length} holdings</span> · {as_of}
        <p className="disclaimer">{disclaimer}</p>
      </footer>
    </>
  );
}

function Metric({ label, value, onJump }: { label: string; value: string; onJump?: () => void }) {
  if (!onJump) {
    return (
      <div className={styles.tile}>
        <div className="caption">{label}</div>
        <div className={`num ${styles.tileValue}`}>{value}</div>
      </div>
    );
  }
  return (
    <button type="button" className={`${styles.tile} ${styles.tileButton}`} onClick={onJump} title="Jump to the related risk factor">
      <div className="caption">{label}</div>
      <div className={`num ${styles.tileValue}`}>{value}</div>
    </button>
  );
}
