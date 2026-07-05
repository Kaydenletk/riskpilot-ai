// Single source of truth for SEO-facing strings and the canonical origin.
// The sitemap, OG images, and generateMetadata all read from here so the
// ticker metadata can never drift between surfaces.
import type { TickerFacts } from "./types";

export const CANONICAL_ORIGIN = "https://riskpilot-coach.vercel.app";

export function tickerPath(ticker: string): string {
  return `/ticker/${ticker.toLowerCase()}`;
}

export function tickerTitle(ticker: string, facts: TickerFacts): string {
  const score = Math.round(facts.risk_score);
  return `${ticker.toUpperCase()} Risk Score ${score}/100 — ${facts.sector} | RiskPilot AI`;
}

export function tickerDescription(ticker: string, facts: TickerFacts): string {
  const vol = Math.round(facts.volatility_annualized_pct);
  const dd = Math.abs(facts.max_drawdown_pct);
  const t = ticker.toUpperCase();
  const score = Math.round(facts.risk_score);
  return `${t} risk read: ${facts.risk_band}, score ${score}/100. Volatility ~${vol}%, worst sample drawdown ${dd}%, beta ${facts.beta}. Illustrative sample data.`;
}
