import type { RiskFacts } from "./types";

// Deterministic, LLM-free verdict. One editorial sentence: the band framing
// plus up to two of the strongest drivers, ranked by how far each exceeds a
// "notable" threshold. Honest — every clause maps to a computed fact.
type Driver = { key: string; label: string; strength: number };

const BAND_LEAD: Record<RiskFacts["risk_band"], string> = {
  aggressive: "Elevated risk",
  moderate: "Moderate risk",
  conservative: "Steady, conservative risk",
};

// Each driver's "strength" = how far its metric exceeds a notability threshold.
// Thresholds are calibrated so the ranking matches how a risk analyst would weight
// them: concentration is flagged past 40% (top-3 heavy), volatility past 20%
// annualized (elevated), sector weight only past 50% (a single sector must truly
// dominate before it out-ranks volatility). A driver with strength <= 0 is dropped.
const CONCENTRATION_NOTABLE = 40;
const VOLATILITY_NOTABLE = 20;
const SECTOR_NOTABLE = 50;

function drivers(f: RiskFacts): Driver[] {
  const list: Driver[] = [
    { key: "concentration", label: "concentration", strength: f.concentration_pct_top3 - CONCENTRATION_NOTABLE },
    { key: "volatility", label: "volatility", strength: f.volatility_annualized_pct - VOLATILITY_NOTABLE },
    { key: "sector", label: `${f.largest_sector} weight`, strength: f.largest_sector_pct - SECTOR_NOTABLE },
  ];
  return list.filter((d) => d.strength > 0).sort((a, b) => b.strength - a.strength);
}

export function buildVerdict(facts: RiskFacts): string {
  const lead = BAND_LEAD[facts.risk_band];
  const top = drivers(facts).slice(0, 2).map((d) => d.label);
  if (top.length === 0) return `${lead} — no single factor stands out.`;
  if (top.length === 1) return `${lead} — driven by ${top[0]}.`;
  return `${lead} — driven by ${top[0]} and ${top[1]}.`;
}
