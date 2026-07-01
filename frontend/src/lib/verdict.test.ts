import { describe, expect, test } from "vitest";

import { buildVerdict } from "./verdict";
import type { RiskFacts } from "./types";

const base: RiskFacts = {
  risk_score: 74,
  risk_band: "aggressive",
  concentration_pct_top3: 73.8,
  volatility_annualized_pct: 32.1,
  max_drawdown_pct: -41.2,
  largest_sector: "Technology",
  largest_sector_pct: 61.0,
  holdings_count: 6,
};

describe("buildVerdict", () => {
  test("aggressive band leads with an elevated-risk clause", () => {
    const v = buildVerdict(base);
    expect(v.toLowerCase()).toContain("elevated");
    expect(v).toContain("concentration");
  });

  test("conservative band reads calm", () => {
    const v = buildVerdict({ ...base, risk_band: "conservative", concentration_pct_top3: 18 });
    expect(v.toLowerCase()).toMatch(/steady|conservative|calm/);
  });

  test("names the two strongest drivers", () => {
    const v = buildVerdict(base);
    expect(v).toContain("concentration");
    expect(v).toContain("volatility");
  });

  test("falls back to a generic sentence when drivers are muted", () => {
    const calm: RiskFacts = {
      ...base,
      risk_band: "moderate",
      concentration_pct_top3: 20,
      volatility_annualized_pct: 12,
      largest_sector_pct: 25,
    };
    const v = buildVerdict(calm);
    expect(v.length).toBeGreaterThan(0);
    expect(v.toLowerCase()).toContain("moderate");
  });

  test("returns a single sentence (one terminal period)", () => {
    const v = buildVerdict(base);
    expect(v.trim().match(/\./g)?.length).toBe(1);
  });
});
