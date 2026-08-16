"use client";

// Live what-if teaser: replaces the old static link-strip with one real
// slider on the sample report's top holding, scored by the same math-only
// /api/score path as the full WhatIfPanel. Every number shown still comes
// from the engine — this component only rearranges the top weight.
import Link from "next/link";
import { useMemo, useState } from "react";

import { useDebouncedScore } from "@/hooks/useDebouncedScore";
import { riskInkVar } from "@/lib/risk-color";
import {
  rowsFromHoldings,
  serializePortfolio,
  setWeight,
  type PortfolioRow,
} from "@/lib/portfolio-state";
import type { RiskReport } from "@/lib/types";

import styles from "./live-what-if-strip.module.css";

const SLIDER_MIN = 0.5;
const SLIDER_MAX = 95;
const SLIDER_STEP = 0.5;
// The engine's floor: below 2 holdings there is nothing to rebalance.
const MIN_SIM_ROWS = 2;

// The row with the largest baseline weight — the one worth dragging first.
function topRow(rows: readonly PortfolioRow[]): PortfolioRow | null {
  return rows.reduce<PortfolioRow | null>(
    (top, r) => (!top || r.weightPct > top.weightPct ? r : top),
    null,
  );
}

export function LiveWhatIfStrip({ report }: { report: RiskReport }) {
  const baseline = useMemo(() => rowsFromHoldings(report.holdings), [report]);
  const [rows, setRows] = useState<PortfolioRow[]>(baseline);
  const top = topRow(baseline);

  const dirty = serializePortfolio(rows) !== serializePortfolio(baseline);
  const simulatable = rows.length >= MIN_SIM_ROWS && top !== null;
  const { state } = useDebouncedScore(rows, dirty && simulatable);
  const scored = state.kind === "scored" ? state.facts : null;

  const current = top ? (rows.find((r) => r.ticker === top.ticker) ?? top) : null;

  return (
    <section
      className={`glass ${styles.strip}`}
      role="region"
      aria-label="Drag it — the engine re-scores live"
    >
      <span className="caption">Drag it — the engine re-scores live</span>

      {simulatable && current ? (
        <div className={styles.sliderRow}>
          <span className={`num ${styles.ticker}`}>{current.ticker}</span>
          <input
            type="range"
            className={styles.slider}
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={current.weightPct}
            aria-label={`${current.ticker} weight percent`}
            onChange={(e) => setRows(setWeight(rows, current.ticker, Number(e.target.value)))}
          />
          <span className={`num ${styles.weight}`}>{current.weightPct}%</span>
        </div>
      ) : (
        <p className={styles.note}>Nothing to rebalance with a single holding.</p>
      )}

      <div className={styles.scoreLine}>
        <span className={`num ${styles.scoreFrom}`}>{report.facts.risk_score.toFixed(0)}</span>
        <span className={styles.arrow} aria-hidden>
          →
        </span>
        {scored ? (
          <span className={`num ${styles.scoreTo}`} style={{ color: riskInkVar(scored.risk_band) }}>
            {scored.risk_score.toFixed(0)}
          </span>
        ) : (
          <span
            className={`num ${styles.scoreTo} ${state.kind === "pending" ? styles.pending : ""}`}
          >
            {dirty ? "…" : report.facts.risk_score.toFixed(0)}
          </span>
        )}
        <span className="caption">risk score</span>
      </div>

      <div className={styles.links}>
        <a href="#sample" className={styles.simLink}>
          Open the full simulator ↓
        </a>
        <Link href="/analyze" className={styles.buildLink}>
          Build yours →
        </Link>
      </div>
    </section>
  );
}
