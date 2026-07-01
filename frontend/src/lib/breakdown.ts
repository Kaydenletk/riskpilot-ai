import type { Holding } from "./types";

export interface HoldingRow {
  ticker: string;
  sector: string;
  marketValue: number;
  weightPct: number;
}

export interface SectorRow {
  sector: string;
  pct: number;
}

function totalValue(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + h.market_value, 0) || 1;
}

export function holdingRows(holdings: Holding[]): HoldingRow[] {
  const total = totalValue(holdings);
  return holdings
    .map((h) => ({
      ticker: h.ticker,
      sector: h.sector,
      marketValue: h.market_value,
      weightPct: (100 * h.market_value) / total,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);
}

export function sectorRows(holdings: Holding[]): SectorRow[] {
  if (holdings.length === 0) return [];
  const total = totalValue(holdings);
  const bySector = new Map<string, number>();
  for (const h of holdings) {
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.market_value);
  }
  return [...bySector.entries()]
    .map(([sector, value]) => ({ sector, pct: (100 * value) / total }))
    .sort((a, b) => b.pct - a.pct);
}
