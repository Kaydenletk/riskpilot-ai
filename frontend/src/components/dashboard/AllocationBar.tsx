"use client";
// Horizontal stacked allocation bar — deliberately NOT a pie. Reads faster in a
// 5-second skim and looks like an instrument readout. The most-concentrated
// sector is tinted warm (semantic risk color); the rest step cooler.
import type { Holding } from "@/lib/types";

import styles from "./allocation-bar.module.css";

interface AllocationBarProps {
  holdings: Holding[];
  selectedSector?: string | null;
  onSelectSector?: (sector: string | null) => void;
}

interface Segment {
  sector: string;
  pct: number;
}

function sectorSegments(holdings: Holding[]): Segment[] {
  const total = holdings.reduce((s, h) => s + h.market_value, 0) || 1;
  const bySector = new Map<string, number>();
  for (const h of holdings) {
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.market_value);
  }
  return [...bySector.entries()]
    .map(([sector, value]) => ({ sector, pct: Math.round((1000 * value) / total) / 10 }))
    .sort((a, b) => b.pct - a.pct);
}

// largest = warm (risk), then step toward cool for smaller slices
function segColor(index: number, count: number): string {
  if (index === 0) return "var(--risk-high)";
  const t = count > 1 ? index / (count - 1) : 0; // 0..1
  return `color-mix(in oklch, var(--risk-low) ${Math.round(t * 100)}%, var(--risk-mid))`;
}

export function AllocationBar({ holdings, selectedSector = null, onSelectSector }: AllocationBarProps) {
  const segments = sectorSegments(holdings);

  return (
    <div>
      <div className="caption" style={{ marginBottom: 8 }}>
        Sector allocation
      </div>
      <div
        className={styles.bar}
        role="img"
        aria-label={
          "Sector allocation: " + segments.map((s) => `${s.sector} ${s.pct}%`).join(", ")
        }
      >
        {segments.map((seg, i) => {
          const dimmed = selectedSector !== null && selectedSector !== seg.sector;
          return (
            <button
              key={seg.sector}
              type="button"
              className={styles.seg}
              aria-pressed={selectedSector === seg.sector}
              style={{
                width: `${seg.pct}%`,
                background: segColor(i, segments.length),
                opacity: dimmed ? 0.35 : 1,
              }}
              title={`${seg.sector} ${seg.pct}%`}
              onClick={() => onSelectSector?.(selectedSector === seg.sector ? null : seg.sector)}
            />
          );
        })}
      </div>
      <ul className={styles.legend}>
        {segments.map((seg, i) => (
          <li key={seg.sector} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: segColor(i, segments.length) }} />
            <span className={styles.legendSector}>{seg.sector}</span>
            <span className={`num ${styles.legendPct}`}>{seg.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
