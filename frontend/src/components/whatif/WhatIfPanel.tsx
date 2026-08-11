"use client";

// What-if simulator: sliders over the report's holdings, scored live by the
// math-only /api/score path. Every number shown comes from the engine — this
// component only rearranges weights and renders deltas.
import { useMemo, useState } from "react";

import { useDebouncedScore } from "@/hooks/useDebouncedScore";
import { riskInkVar } from "@/lib/risk-color";
import {
  removeHolding,
  setWeight,
  serializePortfolio,
  totalWeight,
  type PortfolioRow,
} from "@/lib/portfolio-state";
import type { RiskReport } from "@/lib/types";

import styles from "./what-if-panel.module.css";

const SLIDER_MIN = 0.5;
const SLIDER_MAX = 95;
const SLIDER_STEP = 0.5;
// The engine's floor: below 2 holdings there is nothing to rebalance.
const MIN_SIM_ROWS = 2;

// Derive percent weights from the report's computed market values. Rounded to
// 0.1 — well inside the /score sum tolerance of ±0.5.
function baselineRows(report: RiskReport): PortfolioRow[] {
  const total = report.holdings.reduce((sum, h) => sum + h.market_value, 0);
  if (total <= 0) return [];
  return report.holdings.map((h) => ({
    ticker: h.ticker,
    weightPct: Math.round((h.market_value / total) * 1000) / 10,
    locked: false,
  }));
}

export function WhatIfPanel({ report }: { report: RiskReport }) {
  const baseline = useMemo(() => baselineRows(report), [report]);
  const [rows, setRows] = useState<PortfolioRow[]>(baseline);

  const dirty = serializePortfolio(rows) !== serializePortfolio(baseline);
  const simulatable = rows.length >= MIN_SIM_ROWS;
  const { state, retry } = useDebouncedScore(rows, dirty && simulatable);

  const removed = baseline.filter((b) => !rows.some((r) => r.ticker === b.ticker));
  const scored = state.kind === "scored" ? state.facts : null;

  return (
    <section className={styles.panel} aria-labelledby="whatif-h">
      <div className={styles.head}>
        <h2 id="whatif-h" className={`caption ${styles.title}`}>
          What if
        </h2>
        <div className={styles.scoreLine}>
          <span className={`num ${styles.scoreFrom}`}>{report.facts.risk_score.toFixed(0)}</span>
          <span className={styles.arrow} aria-hidden>
            →
          </span>
          {scored ? (
            <span
              className={`num ${styles.scoreTo}`}
              style={{ color: riskInkVar(scored.risk_band) }}
            >
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
        {dirty && (
          <button type="button" className={styles.reset} onClick={() => setRows(baseline)}>
            Reset
          </button>
        )}
      </div>

      {scored && (
        <dl className={styles.deltas}>
          <div className={styles.delta}>
            <dt className="caption">Concentration</dt>
            <dd className="num">
              {report.facts.concentration_pct_top3}% → {scored.concentration_pct_top3}%
            </dd>
          </div>
          <div className={styles.delta}>
            <dt className="caption">Volatility</dt>
            <dd className="num">
              {report.facts.volatility_annualized_pct}% → {scored.volatility_annualized_pct}%
            </dd>
          </div>
          <div className={styles.delta}>
            <dt className="caption">Worst dip</dt>
            <dd className="num">
              {report.facts.max_drawdown_pct}% → {scored.max_drawdown_pct}%
            </dd>
          </div>
        </dl>
      )}

      {!simulatable ? (
        <p className={styles.note}>Nothing to rebalance with a single holding.</p>
      ) : (
        <ul className={styles.sliders}>
          {rows.map((r) => (
            <li key={r.ticker} className={styles.sliderRow}>
              <span className={`num ${styles.ticker}`}>{r.ticker}</span>
              <input
                type="range"
                className={styles.slider}
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={SLIDER_STEP}
                value={r.weightPct}
                aria-label={`${r.ticker} weight percent`}
                onChange={(e) => setRows(setWeight(rows, r.ticker, Number(e.target.value)))}
              />
              <span className={`num ${styles.weight}`}>{r.weightPct}%</span>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={`Remove ${r.ticker} from what-if`}
                disabled={rows.length <= MIN_SIM_ROWS}
                onClick={() => setRows(removeHolding(rows, r.ticker))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {removed.length > 0 && (
        <p className={styles.removedLine}>
          Removed:{" "}
          {removed.map((b) => (
            <button
              key={b.ticker}
              type="button"
              className={styles.addBack}
              onClick={() => setRows(setWeight([...rows, { ...b, weightPct: SLIDER_MIN }], b.ticker, b.weightPct))}
            >
              + {b.ticker}
            </button>
          ))}
        </p>
      )}

      {state.kind === "error" && (
        <div className={styles.errorBox} role="alert">
          <span>Couldn&apos;t reach the engine — the report above is untouched.</span>
          <button type="button" className={styles.retry} onClick={retry}>
            Retry
          </button>
        </div>
      )}

      <p className={`caption ${styles.foot}`}>
        Total {Math.round(totalWeight(rows) * 10) / 10}% · scored by the engine on every change ·
        no AI in this loop
      </p>
    </section>
  );
}
