"use client";

import { useEffect, useState } from "react";

import { riskColorForScore, riskInkVar, riskVar, type RiskBand } from "@/lib/risk-color";

import styles from "./risk-gauge.module.css";

interface RiskGaugeProps {
  score: number; // 0-100
  band: RiskBand;
}

const SIZE = 260;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2 - 8;
const CIRC = 2 * Math.PI * RADIUS;
const SWEEP = 0.75; // 270° arc (quarter gap at the bottom)
const ARC_LEN = CIRC * SWEEP;
const GAP_LEN = CIRC * (1 - SWEEP);

export function RiskGauge({ score, band }: RiskGaugeProps) {
  // one displayed value everywhere: the gauge, the aria-label, and any text that
  // references "the risk score" all read this rounded integer. The raw decimal
  // (e.g. 73.8) is a computed internal; users only ever see 74.
  const displayScore = Math.round(score);
  // animate from 0 to the real value on mount (compositor-friendly: stroke offset)
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(score);
      return;
    }
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const pct = Math.max(0, Math.min(100, shown)) / 100;
  // dashoffset shrinks as the value fills the 270° arc
  const filled = ARC_LEN * pct;
  const offset = ARC_LEN - filled;

  // rotate so the gap sits at the bottom and the fill starts bottom-left
  const rotation = 135; // degrees

  return (
    <div className={styles.wrap} role="img" aria-label={`Risk score ${displayScore} of 100, ${band}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.svg}>
        <g transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}>
          {/* track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--rule-strong)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
          />
          {/* value arc */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={riskColorForScore(score)}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${CIRC}`}
            strokeDashoffset={offset}
            className={styles.valueArc}
          />
        </g>
      </svg>

      <div className={styles.center}>
        <div className={`num ${styles.score}`} style={{ color: riskVar(band) }}>
          {Math.round(shown)}
        </div>
        <div className={`caption ${styles.band}`} style={{ color: riskInkVar(band) }}>
          {band}
        </div>
        <div className="caption" style={{ marginTop: 2, opacity: 0.7 }}>
          risk score / 100
        </div>
      </div>
    </div>
  );
}
