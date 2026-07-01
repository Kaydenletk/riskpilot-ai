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

function drivers(f: RiskFacts): Driver[] {
  const list: Driver[] = [
    { key: "concentration", label: "concentration", strength: f.concentration_pct_top3 - 40 },
    { key: "volatility", label: "volatility", strength: f.volatility_annualized_pct - 20 },
    // sector weight is the weakest signal of the three — only surface it when a
    // single sector is very dominant, so it never crowds out volatility.
    { key: "sector", label: `${f.largest_sector} weight`, strength: f.largest_sector_pct - 50 },
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
