"use client";

// Rows + Run bar for the weighted builder. Pure UI over the immutable
// portfolio-state helpers — every mutation routes through the sum-to-100
// invariant, so the total it prints is trust display, not arithmetic done here.
import { useMemo, useState } from "react";

import { MAX_HOLDINGS, MIN_HOLDINGS } from "@/lib/portfolio-schema";
import {
  addHolding,
  removeHolding,
  setWeight,
  toggleLock,
  totalWeight,
  type PortfolioRow,
} from "@/lib/portfolio-state";
import type { TickerOption } from "@/lib/types";

import { TickerTypeahead } from "./TickerTypeahead";
import styles from "./portfolio-builder.module.css";

// Input bounds: 0.5 floor matches portfolio-state's MIN_ROW_WEIGHT; the 99 cap
// leaves ≥0.5 for at least one other row (a runnable portfolio is always ≥3).
const WEIGHT_MIN = 0.5;
const WEIGHT_MAX = 99;
const WEIGHT_STEP = 0.5;

interface PortfolioBuilderProps {
  universe: TickerOption[];
  rows: PortfolioRow[];
  onRowsChange: (rows: PortfolioRow[]) => void;
  onRun: (rows: PortfolioRow[]) => void;
  /** Client-side zod rejection (belt-and-braces — should not happen). */
  error: string | null;
}

interface WeightDraft {
  ticker: string;
  text: string;
}

export function PortfolioBuilder({
  universe,
  rows,
  onRowsChange,
  onRun,
  error,
}: PortfolioBuilderProps) {
  // While a weight field is being typed in, show the raw text so partial
  // entries ("0.", a cleared field) aren't snapped mid-keystroke by the
  // rebalance; the canonical number always lives in `rows`.
  const [draft, setDraft] = useState<WeightDraft | null>(null);

  const sectorOf = useMemo(() => new Map(universe.map((o) => [o.ticker, o.sector])), [universe]);
  const total = Math.round(totalWeight(rows) * 10) / 10;
  const canRun = rows.length >= MIN_HOLDINGS;

  function onWeightInput(ticker: string, text: string) {
    setDraft({ ticker, text });
    const value = Number(text);
    if (text.trim() !== "" && Number.isFinite(value)) {
      onRowsChange(setWeight(rows, ticker, value));
    }
  }

  return (
    <section className={`glass ${styles.builder}`} aria-label="Portfolio builder">
      <TickerTypeahead
        universe={universe}
        exclude={rows.map((r) => r.ticker)}
        atCapacity={rows.length >= MAX_HOLDINGS}
        onPick={(ticker) => onRowsChange(addHolding(rows, ticker))}
      />

      {rows.length > 0 && (
        <p className={`caption ${styles.legend}`}>
          Change any weight — the others rebalance to keep 100%. Lock 🔒 to pin one in place.
        </p>
      )}
      {rows.length > 0 ? (
        <ul className={styles.rows}>
          {rows.map((r) => (
            <li key={r.ticker} className={styles.row}>
              <span className={`num ${styles.ticker}`}>{r.ticker}</span>
              <span className={`caption ${styles.sector}`}>{sectorOf.get(r.ticker) ?? "—"}</span>
              <span className={styles.weightWrap}>
                <input
                  className={`num ${styles.weightInput}`}
                  type="number"
                  min={WEIGHT_MIN}
                  max={WEIGHT_MAX}
                  step={WEIGHT_STEP}
                  inputMode="decimal"
                  value={draft?.ticker === r.ticker ? draft.text : String(r.weightPct)}
                  aria-label={`${r.ticker} weight percent`}
                  onChange={(e) => onWeightInput(r.ticker, e.target.value)}
                  onBlur={() => setDraft(null)}
                />
                <span
                  className={styles.weightFill}
                  aria-hidden
                  style={{ "--fill": `${r.weightPct}%` } as React.CSSProperties}
                />
                <span aria-hidden> %</span>
              </span>
              <button
                type="button"
                className={styles.iconBtn}
                aria-pressed={r.locked}
                title="Lock weight"
                aria-label={`${r.locked ? "Unlock" : "Lock"} ${r.ticker} weight`}
                onClick={() => onRowsChange(toggleLock(rows, r.ticker))}
              >
                {r.locked ? "🔒" : "🔓"}
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={`Remove ${r.ticker}`}
                onClick={() => onRowsChange(removeHolding(rows, r.ticker))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyRows}>
          Search a ticker or sector above — weights auto-balance to 100% as you add.
        </p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.footer}>
        <span className={`num ${styles.total}`}>Total {total}%</span>
        <span className="caption">
          {rows.length} of {MAX_HOLDINGS} holdings
        </span>
        <span className={styles.runWrap}>
          {!canRun ? (
            <span className={styles.reason}>Add at least {MIN_HOLDINGS} holdings</span>
          ) : (
            <span className={`caption ${styles.runHint}`}>
              engine computes · AI explains · guardrail checks
            </span>
          )}
          <button
            type="button"
            className={styles.run}
            disabled={!canRun}
            onClick={() => onRun(rows)}
          >
            Run the X-Ray
          </button>
        </span>
      </div>
    </section>
  );
}
