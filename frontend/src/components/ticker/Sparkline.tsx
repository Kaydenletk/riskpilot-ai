"use client";

// The PRIMARY price visual: drawn from the EXACT synthetic series the risk math
// scores. One source of truth — the line and the risk number always agree.
// Honestly labeled "synthetic illustrative" by the caller. Pure SVG, no deps.
import { useId } from "react";

import { riskColorForScore } from "@/lib/risk-color";

interface SparklineProps {
  values: number[];
  score: number; // colors the line on the risk ramp
  width?: number;
  height?: number;
}

export function Sparkline({ values, score, width = 640, height = 160 }: SparklineProps) {
  const gradId = useId();
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 6;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + (1 - (v - min) / span) * h;
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height - pad} L${pts[0][0].toFixed(1)} ${height - pad} Z`;
  const stroke = riskColorForScore(score);
  const last = pts[pts.length - 1];
  const up = values[values.length - 1] >= values[0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Price path of the scored sample series, ${up ? "up" : "down"} over the window`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={stroke} />
    </svg>
  );
}
