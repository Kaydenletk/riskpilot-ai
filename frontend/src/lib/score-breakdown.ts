// Mirrors backend/src/riskpilot/risk_engine/score.py (SCORE_VERSION
// "v1-concentration-led"). If the engine's formula changes, the sum stops
// matching facts.risk_score and this returns null — the UI hides the bar
// rather than showing invented segment math (fail-closed by design).
import type { RiskFacts } from "@/lib/types";

// weights — score.py: W_CONCENTRATION / W_VOLATILITY / W_DRAWDOWN (sum to 1.0)
const W_CONCENTRATION = 0.5;
const W_VOLATILITY = 0.35;
const W_DRAWDOWN = 0.15;

// signal-mapping anchors — score.py: _VOL_FLOOR 0.10 / _VOL_CEIL 0.50 (as a
// fraction; expressed here in the same percent units as facts.*_pct)
const VOL_FLOOR = 10;
const VOL_CEIL = 50;
// score.py: _DD_CEIL 0.50 (|dd%| / 100 / 0.50 == |dd%| / 50)
const DD_CEIL = 50;

// max allowed drift between our mirrored sum and the engine's reported score
// before we declare disagreement and fail closed.
const TOLERANCE = 0.75;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

export interface ScoreSegment {
  label: string;
  points: number;
}

export function scoreBreakdown(facts: RiskFacts): ScoreSegment[] | null {
  const concentrationSignal = clamp01(facts.concentration_pct_top3 / 100);
  const volatilitySignal = clamp01((facts.volatility_annualized_pct - VOL_FLOOR) / (VOL_CEIL - VOL_FLOOR));
  const drawdownSignal = clamp01(Math.abs(facts.max_drawdown_pct) / DD_CEIL);

  const conc = concentrationSignal * W_CONCENTRATION * 100;
  const vol = volatilitySignal * W_VOLATILITY * 100;
  const dd = drawdownSignal * W_DRAWDOWN * 100;

  const segments: ScoreSegment[] = [
    { label: "Concentration", points: conc },
    { label: "Volatility", points: vol },
    { label: "Drawdown", points: dd },
  ];

  const total = conc + vol + dd;
  if (Math.abs(total - facts.risk_score) >= TOLERANCE) return null;
  return segments;
}
