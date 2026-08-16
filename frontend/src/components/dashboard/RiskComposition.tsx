// Self-validating "why this score" bar. Segments are the ACTUAL point
// contributions computed by scoreBreakdown — a mirror of the backend engine
// (backend/src/riskpilot/risk_engine/score.py). If that mirror ever disagrees
// with the engine's reported risk_score, scoreBreakdown returns null and this
// component renders NOTHING: no partial bars, no "approximately" — fail
// closed by design, same as the rest of the grounding contract.
import { scoreBreakdown } from "@/lib/score-breakdown";
import type { RiskFacts } from "@/lib/types";

import styles from "./risk-composition.module.css";

// Composition segments are chrome-data (relative weight of each input), NOT
// risk-band data — so they step through opacity of --accent, never the
// semantic risk ramp (--risk-low/mid/high).
const SEGMENT_OPACITY = [0.9, 0.6, 0.35];

export function RiskComposition({ facts }: { facts: RiskFacts }) {
  const segments = scoreBreakdown(facts);
  if (!segments) return null;

  return (
    <div className={styles.composition}>
      <div className="caption" style={{ marginBottom: 8 }}>
        Why this score
      </div>
      <div
        className={styles.bar}
        role="group"
        aria-label={
          "Score composition: " +
          segments.map((s) => `${s.label} ${s.points.toFixed(1)} points`).join(", ")
        }
      >
        {segments.map((seg, i) => (
          <div
            key={seg.label}
            className={styles.seg}
            style={{ width: `${seg.points}%`, opacity: SEGMENT_OPACITY[i] ?? 0.35 }}
            title={`${seg.label}: ${seg.points.toFixed(1)} points`}
          />
        ))}
      </div>
      <ul className={styles.legend}>
        {segments.map((seg, i) => (
          <li key={seg.label} className={styles.legendItem}>
            <span className={styles.dot} style={{ opacity: SEGMENT_OPACITY[i] ?? 0.35 }} />
            <span className={styles.legendLabel}>{seg.label}</span>
            <span className={`num ${styles.legendValue}`}>{seg.points.toFixed(1)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
