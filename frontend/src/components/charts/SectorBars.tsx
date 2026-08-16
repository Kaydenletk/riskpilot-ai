import type { Holding } from "@/lib/types";

import styles from "./sector-bars.module.css";

const DOMINANT_PCT = 50;

export function sectorWeights(
  holdings: Holding[],
): { sector: string; pct: number }[] {
  const total = holdings.reduce((s, x) => s + x.market_value, 0);
  if (total <= 0) return [];
  const bySector = new Map<string, number>();
  for (const x of holdings) {
    bySector.set(x.sector, (bySector.get(x.sector) ?? 0) + x.market_value);
  }
  return [...bySector.entries()]
    .map(([sector, mv]) => ({ sector, pct: Math.round((mv / total) * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);
}

// Horizontal sector-exposure bars. The dominant sector (≥50%) wears the
// risk-mid ink — data coloring, not decoration.
export function SectorBars({ holdings }: { holdings: Holding[] }) {
  const rows = sectorWeights(holdings);
  if (rows.length === 0) return null;
  return (
    <ul className={styles.bars} aria-label="Sector exposure">
      {rows.map((r) => (
        <li key={r.sector} className={styles.row}>
          <span className={`caption ${styles.label}`}>{r.sector}</span>
          <span className={styles.track}>
            <span
              className={styles.fill}
              style={{
                width: `${r.pct}%`,
                background:
                  r.pct >= DOMINANT_PCT ? "var(--risk-mid-ink)" : "var(--accent)",
              }}
            />
          </span>
          <span className={`num ${styles.pct}`}>{r.pct}%</span>
        </li>
      ))}
    </ul>
  );
}
