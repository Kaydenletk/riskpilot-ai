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

// ── portfolio goal (mirrors schema.py PortfolioGoal/FitBand/GoalFit) ──

export type PortfolioGoal = "growth" | "balanced" | "income";

export type FitBand = "aligned" | "partial" | "misaligned";

export interface SectorSuggestion {
  sector: string;
  current_pct: number;
  /** illustrative sector yield proxy — synthetic universe, never a real yield */
  typical_yield_pct: number;
  example_tickers: string[];
}

export interface GoalFit {
  goal: PortfolioGoal;
  income_orientation_pct: number;
  growth_orientation_pct: number;
  fit_score: number;
  fit_band: FitBand;
  income_yield_proxy_pct: number;
  sector_suggestions: SectorSuggestion[];
}

export interface RiskReport {
  portfolio_name: string;
  as_of: string;
  holdings: Holding[];
  facts: RiskFacts;
  explanation: RiskExplanation;
  disclaimer: string;
  /** present only when the request named a portfolio goal */
  goal_fit?: GoalFit | null;
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

export interface SectorContext {
  sector: string;
  sector_median_volatility_pct: number;
  sector_median_beta: number;
  /** % of the universe LESS volatile than this ticker */
  universe_volatility_percentile: number;
  peers: string[];
}

export interface TickerReport {
  ticker: string;
  as_of: string;
  facts: TickerFacts;
  spark: number[];
  explanation: RiskExplanation;
  disclaimer: string;
  /** optional: fixtures predating the field omit it */
  context?: SectorContext | null;
}
