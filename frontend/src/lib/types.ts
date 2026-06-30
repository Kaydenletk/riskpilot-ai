// Mirrors backend/src/riskpilot/schema.py. Keep in sync (M2: codegen from OpenAPI).

export interface Holding {
  ticker: string;
  shares: number;
  sector: string;
  market_value: number;
}

export interface RiskFacts {
  risk_score: number;
  risk_band: "conservative" | "moderate" | "aggressive";
  concentration_pct_top3: number;
  volatility_annualized_pct: number;
  max_drawdown_pct: number;
  largest_sector: string;
  largest_sector_pct: number;
  holdings_count: number;
}

export interface RiskExplanation {
  summary: string;
  top_risk_factors: string[];
  review_checklist: string[];
  source: "model" | "model_regenerated" | "template_fallback" | "demo_fixture";
}

export interface RiskReport {
  portfolio_name: string;
  as_of: string;
  holdings: Holding[];
  facts: RiskFacts;
  explanation: RiskExplanation;
  disclaimer: string;
}

// ── single-ticker search (mirrors schema.py TickerOption/TickerFacts/TickerReport) ──

export interface TickerOption {
  ticker: string;
  sector: string;
}

export interface TickerFacts {
  risk_score: number;
  risk_band: "conservative" | "moderate" | "aggressive";
  volatility_annualized_pct: number;
  max_drawdown_pct: number;
  beta: number;
  sector: string;
}

export interface TickerReport {
  ticker: string;
  as_of: string;
  facts: TickerFacts;
  spark: number[];
  explanation: RiskExplanation;
  disclaimer: string;
}
