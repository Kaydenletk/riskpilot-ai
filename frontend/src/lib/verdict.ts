import type { RiskFacts } from './types';

/**
 * Generate a one-line plain-English verdict from risk facts.
 * Format: "{RiskBand} — {concentration}% in 3 stocks"
 * Example: "Aggressive — 62% in 3 stocks"
 * 
 * This is a pure, deterministic function with no side effects.
 * 
 * @param facts - The risk facts object containing risk_band and concentration_pct_top3
 * @returns A formatted verdict string
 */
export function generateVerdict(facts: RiskFacts): string {
  const capitalizedBand =
    facts.risk_band.charAt(0).toUpperCase() + facts.risk_band.slice(1);
  const concentration = Math.round(facts.concentration_pct_top3);
  
  return `${capitalizedBand} — ${concentration}% in 3 stocks`;
}
