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

// Horizontal sector-exposure bars. All fills share the chrome gradient — a
// dominant sector (≥50%) is flagged with an amber dot marker instead of a
// tinted bar (graphical risk marker, not text: no contrast constraint, and
// no mud-colored fills).
export function SectorBars({ holdings }: { holdings: Holding[] }) {
  const rows = sectorWeights(holdings);
  if (rows.length === 0) return null;
  return (
    <ul className={styles.bars} aria-label="Sector exposure">
      {rows.map((r) => {
        const dominant = r.pct >= DOMINANT_PCT;
        return (
          <li key={r.sector} className={styles.row}>
            <span className={`caption ${styles.label}`}>
              {r.sector}
              {dominant && (
                <span
                  className={styles.dominantDot}
                  role="img"
                  aria-label="dominant sector — concentration driver"
                  title="Dominant sector — concentration driver"
                />
              )}
            </span>
            <span className={styles.track}>
              <span className={styles.fill} style={{ width: `${r.pct}%` }} />
            </span>
            <span className={`num ${styles.pct}`}>{r.pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
