"use client";

// Live risk preview beside the builder: scores the in-progress portfolio via
// the math-only /api/score path (same debounced hook as the what-if sliders)
// and mirrors it as a mini gauge + sector mix. Read-only teaser — the full
// report (AI explanation + guardrails) still requires Run the X-Ray.
import { useEffect, useMemo, useState } from "react";

import { SectorBars } from "@/components/charts/SectorBars";
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { useDebouncedScore } from "@/hooks/useDebouncedScore";
import type { PortfolioRow } from "@/lib/portfolio-state";
import type { Holding, RiskFacts, TickerOption } from "@/lib/types";

import styles from "./preview-rail.module.css";

const MIN_PREVIEW_HOLDINGS = 3;
const GAUGE_SIZE = 120;

interface PreviewRailProps {
  rows: PortfolioRow[];
  universe: TickerOption[];
}

export function PreviewRail({ rows, universe }: PreviewRailProps) {
  const enabled = rows.length >= MIN_PREVIEW_HOLDINGS;
  const { state } = useDebouncedScore(rows, enabled);

  const sectorOf = useMemo(() => new Map(universe.map((o) => [o.ticker, o.sector])), [universe]);
  // Weight-proportional market_value gives SectorBars correct sector percentages
  // without needing real dollar values — this is a preview, not the report.
  const synthetic: Holding[] = useMemo(
    () =>
      rows.map((r) => ({
        ticker: r.ticker,
        sector: sectorOf.get(r.ticker) ?? "—",
        shares: 1,
        market_value: r.weightPct,
      })),
    [rows, sectorOf],
  );

  // Retain the last scored facts across idle/pending/error debounce cycles so
  // the preview never blanks mid-edit — the gauge dims for any non-"scored"
  // state (fresh score in flight, or re-entering the debounce window after
  // dropping below 3 holdings and back), never just "pending". The sector mix
  // is derived locally from `rows` and always stays current regardless.
  // `displayFacts` folds the current tick's facts in immediately (rather than
  // waiting a render for the effect below) so a scored -> scored transition
  // never flashes the placeholder for a frame.
  const [lastFacts, setLastFacts] = useState<RiskFacts | null>(null);
  const scoredFacts = state.kind === "scored" ? state.facts : null;
  useEffect(() => {
    if (scoredFacts) setLastFacts(scoredFacts);
  }, [scoredFacts]);
  const displayFacts = scoredFacts ?? lastFacts;

  if (!enabled) {
    const remaining = MIN_PREVIEW_HOLDINGS - rows.length;
    return (
      <aside className={`glass ${styles.rail}`} aria-label="Risk preview">
        <p className={`caption ${styles.message}`}>
          Add {remaining} more holding{remaining === 1 ? "" : "s"} to preview your risk
        </p>
      </aside>
    );
  }

  return (
    <aside className={`glass ${styles.rail}`} aria-label="Risk preview">
      {displayFacts && (
        <>
          <div className={styles.gaugeWrap} style={{ opacity: state.kind === "scored" ? 1 : 0.4 }}>
            <RiskGauge
              score={displayFacts.risk_score}
              band={displayFacts.risk_band}
              size={GAUGE_SIZE}
            />
          </div>
          <SectorBars holdings={synthetic} />
          {state.kind !== "error" && (
            <p className={`caption ${styles.message}`}>previewing · run for the full read</p>
          )}
        </>
      )}

      {/* First-ever score for this session: nothing to show yet and nothing
          failed — a bare glass shell would read as broken, so show a
          scoring placeholder instead of leaving the card empty. */}
      {!displayFacts && state.kind !== "error" && (
        <div className={styles.placeholder} role="status" aria-label="Scoring your portfolio">
          <p className={`caption ${styles.message}`}>scoring your mix…</p>
          <div className={styles.skelBlock} />
        </div>
      )}

      {state.kind === "error" && (
        <p className={`caption ${styles.message}`} role="alert">
          engine unreachable — preview paused
        </p>
      )}
    </aside>
  );
}
