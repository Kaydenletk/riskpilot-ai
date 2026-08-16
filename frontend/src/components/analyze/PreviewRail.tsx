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

  // Retain the last scored facts across pending/error debounce cycles so the
  // preview never blanks mid-edit — only the gauge dims while a fresh score
  // is in flight; the sector mix is derived locally and always stays current.
  const [lastFacts, setLastFacts] = useState<RiskFacts | null>(null);
  useEffect(() => {
    if (state.kind === "scored") setLastFacts(state.facts);
  }, [state]);

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
      {lastFacts && (
        <>
          <div
            className={styles.gaugeWrap}
            style={{ opacity: state.kind === "pending" ? 0.4 : 1 }}
          >
            <RiskGauge score={lastFacts.risk_score} band={lastFacts.risk_band} size={GAUGE_SIZE} />
          </div>
          <SectorBars holdings={synthetic} />
          <p className={`caption ${styles.message}`}>previewing · run for the full read</p>
        </>
      )}
      {state.kind === "error" && (
        <p className={`caption ${styles.message}`} role="alert">
          engine unreachable — preview paused
        </p>
      )}
    </aside>
  );
}
