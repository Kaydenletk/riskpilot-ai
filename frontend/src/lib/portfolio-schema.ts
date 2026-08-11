// Zod boundary for the weight-based (builder / what-if) portfolio input.
// Mirrors backend/src/riskpilot/schema.py WeightedHolding + the /score and
// /report(weighted) route validation (2-20 rows, weight_pct in (0,100], sum
// ~100). The Next boundary rejects garbage BEFORE it reaches the engine; the
// engine re-validates independently (defense in depth — the engine is the
// source of truth for the actual bounds it enforces).
import { z } from "zod";

export const MIN_HOLDINGS = 3;
export const MAX_HOLDINGS = 20;
export const WEIGHT_SUM_TOLERANCE = 0.5;

export const weightedHolding = z.object({
  ticker: z.string().regex(/^[A-Z.]{1,6}$/),
  weight_pct: z.number().gt(0).lte(100),
});

export type WeightedHolding = z.infer<typeof weightedHolding>;

export const weightedPortfolio = z
  .array(weightedHolding)
  .min(MIN_HOLDINGS)
  .max(MAX_HOLDINGS)
  .refine(
    (rows) =>
      Math.abs(rows.reduce((sum, row) => sum + row.weight_pct, 0) - 100) <=
      WEIGHT_SUM_TOLERANCE,
    { message: "weights must sum to 100" },
  );

// The simulator can drop to 2 rows via remove-toggles (the engine's own floor);
// building a NEW portfolio still requires MIN_HOLDINGS. Separate schema so the
// /score boundary matches the engine instead of the builder.
export const SIMULATOR_MIN_HOLDINGS = 2;

export const simulatorPortfolio = z
  .array(weightedHolding)
  .min(SIMULATOR_MIN_HOLDINGS)
  .max(MAX_HOLDINGS)
  .refine(
    (rows) =>
      Math.abs(rows.reduce((sum, row) => sum + row.weight_pct, 0) - 100) <=
      WEIGHT_SUM_TOLERANCE,
    { message: "weights must sum to 100" },
  );
