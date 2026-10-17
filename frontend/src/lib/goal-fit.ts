// Presentation helpers for the engine's goal-fit facts. Pure functions only —
// every number rendered comes from the report; nothing is recomputed here.
import type { FitBand, GoalFit, PortfolioGoal } from "./types";

export const GOAL_LABELS: Record<PortfolioGoal, string> = {
  growth: "Growth",
  balanced: "Balanced",
  income: "Income",
};

export const GOAL_DESCRIPTIONS: Record<PortfolioGoal, string> = {
  growth: "long-term appreciation",
  balanced: "a mix of both",
  income: "dividends & stability",
};

export const FIT_BAND_LABELS: Record<FitBand, string> = {
  aligned: "on target",
  partial: "partly there",
  misaligned: "off target",
};

// Fit bands ride the existing semantic risk ramp — aligned reads calm (cool),
// misaligned reads hot — so no new palette entries are introduced.
export function fitBandVar(band: FitBand): string {
  if (band === "aligned") return "var(--risk-low)";
  if (band === "partial") return "var(--risk-mid)";
  return "var(--risk-high)";
}

export function fitBandInkVar(band: FitBand): string {
  if (band === "aligned") return "var(--risk-low-ink)";
  if (band === "partial") return "var(--risk-mid-ink)";
  return "var(--risk-high-ink)";
}

export interface OrientationSplit {
  incomePct: number;
  growthPct: number;
}

// The two engine percentages are each rounded to 1dp and can sum to 99.9/100.1;
// normalize so the stacked bar always fills exactly 100% of its track.
export function orientationSplit(fit: GoalFit): OrientationSplit {
  const total = fit.income_orientation_pct + fit.growth_orientation_pct;
  if (total <= 0) return { incomePct: 0, growthPct: 0 };
  return {
    incomePct: (fit.income_orientation_pct / total) * 100,
    growthPct: (fit.growth_orientation_pct / total) * 100,
  };
}

export function suggestionsHeading(goal: PortfolioGoal): string {
  if (goal === "income") return "Sectors income portfolios typically draw from";
  if (goal === "growth") return "Sectors growth portfolios typically draw from";
  return "";
}
