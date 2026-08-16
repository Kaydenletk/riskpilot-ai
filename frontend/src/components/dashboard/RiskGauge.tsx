"use client";

import { useEffect, useState } from "react";

import { riskColorForScore, riskVar, type RiskBand } from "@/lib/risk-color";

import styles from "./risk-gauge.module.css";

interface RiskGaugeProps {
  score: number; // 0-100
  band: RiskBand;
  size?: number; // px, default 260
}

const STROKE_RATIO = 12 / 260; // v3: thinner arc — the number is the star
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
      aria-label={`Risk score ${Math.round(score)} percent — ${band}`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.svg}>
        <g transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
            stroke="var(--rule)" strokeWidth={STROKE} strokeLinecap="round"
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
        {/* percent framing (score is /100 by construction) — "80%" reads instantly;
            the old "risk score / 100" caption became redundant and was cut */}
        <div className={`num ${styles.score}`} style={{ color: riskVar(band), fontSize: `${SIZE / 4}px` }}>
          {Math.round(shown)}
          <span className={styles.pctSign} style={{ fontSize: `${SIZE / 9}px` }}>
            %
          </span>
        </div>
        <div
          className={`caption ${styles.bandChip}`}
          style={{
            color: riskVar(band),
            background: `color-mix(in oklch, ${riskVar(band)} 12%, transparent)`,
            fontSize: `${Math.max(9, SIZE / 22)}px`,
          }}
        >
          {band} risk
        </div>
      </div>
    </div>
  );
}
