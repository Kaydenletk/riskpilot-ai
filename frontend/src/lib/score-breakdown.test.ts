import { expect, test } from "vitest";

import type { RiskFacts } from "@/lib/types";

import { scoreBreakdown } from "./score-breakdown";

// Real facts from frontend/src/lib/demo-report.json (the live sample report).
// Chosen deliberately: max_drawdown_pct (-54.0) exceeds the engine's -50% ceiling,
// so this fixture also exercises the drawdown signal's clamp/saturation path.
const FACTS: RiskFacts = {
  risk_score: 67.0,
  risk_band: "aggressive",
  concentration_pct_top3: 73.8,
  volatility_annualized_pct: 27.3,
  max_drawdown_pct: -54.0,
  largest_sector: "Technology",
  largest_sector_pct: 68.5,
  holdings_count: 5,
};

test("segments sum to the engine score within tolerance", () => {
  const segs = scoreBreakdown(FACTS)!;
  const total = segs.reduce((s, x) => s + x.points, 0);
  expect(Math.abs(total - FACTS.risk_score)).toBeLessThan(0.75);
  expect(segs.map((s) => s.label)).toEqual(["Concentration", "Volatility", "Drawdown"]);
});

test("returns null when facts do not reproduce the score (fail closed)", () => {
  expect(scoreBreakdown({ ...FACTS, risk_score: 20 })).toBeNull();
});
