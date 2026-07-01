"use client";

import { useEffect, useState } from "react";

import { riskColorForScore, riskVar, type RiskBand } from "@/lib/risk-color";

import styles from "./risk-gauge.module.css";

interface RiskGaugeProps {
  score: number; // 0-100
  band: RiskBand;
  size?: number; // px, default 260
}

const STROKE_RATIO = 18 / 260; // keep the original 18px stroke at size 260
const SWEEP = 0.75; // 270° arc (quarter gap at the bottom)

export function RiskGauge({ score, band, size = 260 }: RiskGaugeProps) {
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

  const SIZE = size;
  const STROKE = Math.round(SIZE * STROKE_RATIO);
  const RADIUS = (SIZE - STROKE) / 2 - 8;
  const CIRC = 2 * Math.PI * RADIUS;
  const ARC_LEN = CIRC * SWEEP;
  const GAP_LEN = CIRC * (1 - SWEEP);

  const pct = Math.max(0, Math.min(100, shown)) / 100;
  const filled = ARC_LEN * pct;
  const offset = ARC_LEN - filled;
  const rotation = 135; // gap at the bottom, fill starts bottom-left

  return (
    <div
      className={styles.wrap}
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`Risk score ${score} of 100, ${band}`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.svg}>
        <g transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
            stroke="var(--rule-strong)" strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
          />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
            stroke={riskColorForScore(score)} strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${CIRC}`} strokeDashoffset={offset}
            className={styles.valueArc}
          />
        </g>
      </svg>

      <div className={styles.center}>
        <div className={`num ${styles.score}`} style={{ color: riskVar(band), fontSize: `${SIZE / 61}px` }}>
          {Math.round(shown)}
        </div>
        <div className={`caption ${styles.band}`} style={{ color: riskVar(band) }}>
          {band}
        </div>
        <div className="caption" style={{ marginTop: 2, opacity: 0.7 }}>
          risk score / 100
        </div>
      </div>
    </div>
  );
}
