// Exact, non-modeled portfolio arithmetic for the upload offline panel.
// Concentration % and sector % are pure division — safe to compute client-side.
// Risk score / volatility / drawdown / beta are NOT here (engine-only).
import type { Holding } from "@/lib/types";

export interface SectorWeight {
  sector: string;
  pct: number; // 0..100, one decimal
}

export interface Breakdown {
  total: number;
  sectors: SectorWeight[];
  concentrationTop3Pct: number;
  largestSector: string;
  largestSectorPct: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeBreakdown(holdings: Holding[]): Breakdown {
  const total = holdings.reduce((s, h) => s + h.market_value, 0);
  if (total <= 0) {
    return { total: 0, sectors: [], concentrationTop3Pct: 0, largestSector: "", largestSectorPct: 0 };
  }

  const bySector = new Map<string, number>();
  for (const h of holdings) {
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.market_value);
  }
  const sectors: SectorWeight[] = [...bySector.entries()]
    .map(([sector, value]) => ({ sector, pct: round1((100 * value) / total) }))
    .sort((a, b) => b.pct - a.pct);

  const top3 = [...holdings]
    .sort((a, b) => b.market_value - a.market_value)
    .slice(0, 3)
    .reduce((s, h) => s + h.market_value, 0);

  return {
    total,
    sectors,
    concentrationTop3Pct: round1((100 * top3) / total),
    largestSector: sectors[0]?.sector ?? "",
    largestSectorPct: sectors[0]?.pct ?? 0,
  };
}
