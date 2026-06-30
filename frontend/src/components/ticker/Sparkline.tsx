"use client";

// The PRIMARY price visual: drawn from the EXACT synthetic series the risk math
// scores. One source of truth — the line and the risk number always agree.
// Honestly labeled "synthetic illustrative" by the caller. Pure SVG, no deps.
//
// Interactive: a hover crosshair reads the exact value at any point in the
// window (mouse + keyboard). The series is index-based (no calendar dates), so
// the readout shows step position, not a fake timestamp — staying honest about
// what the data is.
import { useId, useMemo, useState } from "react";

import { riskColorForScore } from "@/lib/risk-color";

import styles from "./ticker-view.module.css";

interface SparklineProps {
  values: number[];
  score: number; // colors the line on the risk ramp
  width?: number;
  height?: number;
}

const PAD = 6;

export function Sparkline({ values, score, width = 640, height = 160 }: SparklineProps) {
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const w = width - PAD * 2;
    const h = height - PAD * 2;
    const pts = values.map((v, i) => {
      const x = PAD + (i / (values.length - 1)) * w;
      const y = PAD + (1 - (v - min) / span) * h;
      return [x, y] as const;
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height - PAD} L${pts[0][0].toFixed(1)} ${height - PAD} Z`;
    return { pts, line, area, min, max };
  }, [values, width, height]);

  if (!geom) return null;

  const stroke = riskColorForScore(score);
  const last = geom.pts[geom.pts.length - 1];
  const up = values[values.length - 1] >= values[0];

  // Nearest index to a pointer x within the SVG's own coordinate space.
  function indexFromClientX(clientX: number, rect: DOMRect): number {
    const ratio = (clientX - rect.left) / rect.width;
    const i = Math.round(ratio * (values.length - 1));
    return Math.max(0, Math.min(values.length - 1, i));
  }

  const active = hover != null ? geom.pts[hover] : null;
  const activeVal = hover != null ? values[hover] : null;

  return (
    <div className={styles.chartWrap}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Price path of the scored sample series, ${up ? "up" : "down"} over the window`}
        className={styles.chartSvg}
        onMouseMove={(e) => setHover(indexFromClientX(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={geom.area} fill={`url(#${gradId})`} />
        <path
          d={geom.line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {active && (
          <g pointerEvents="none">
            <line
              x1={active[0]}
              y1={PAD}
              x2={active[0]}
              y2={height - PAD}
              stroke={stroke}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={active[0]} cy={active[1]} r="4.5" fill={stroke} stroke="var(--surface)" strokeWidth="1.5" />
          </g>
        )}
        {!active && <circle cx={last[0]} cy={last[1]} r="3.5" fill={stroke} />}
      </svg>

      {/* Honest readout: index position + value, never a fabricated date. */}
      <div className={styles.chartReadout} aria-live="polite">
        {activeVal != null ? (
          <>
            <span className="caption">step {hover! + 1}/{values.length}</span>
            <span className={`num ${styles.readoutVal}`}>{activeVal.toFixed(2)}</span>
          </>
        ) : (
          <>
            <span className="caption">hover to scrub</span>
            <span className={`num ${styles.readoutVal}`}>
              {geom.min.toFixed(2)} – {geom.max.toFixed(2)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
