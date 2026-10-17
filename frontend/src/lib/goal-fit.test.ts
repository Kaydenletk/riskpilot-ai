import { describe, expect, test } from "vitest";

import { fitBandInkVar, fitBandVar, orientationSplit, suggestionsHeading } from "./goal-fit";
import type { GoalFit } from "./types";

function fit(income: number, growth: number): GoalFit {
  return {
    goal: "income",
    income_orientation_pct: income,
    growth_orientation_pct: growth,
    fit_score: income,
    fit_band: "partial",
    income_yield_proxy_pct: 2.1,
    sector_suggestions: [],
  };
}

describe("orientationSplit", () => {
  test("normalizes rounded halves to a full 100% track", () => {
    const split = orientationSplit(fit(33.3, 66.6));
    expect(split.incomePct + split.growthPct).toBeCloseTo(100, 5);
    expect(split.incomePct).toBeCloseTo(33.33, 1);
  });

  test("returns zeros when the engine sends an empty split", () => {
    expect(orientationSplit(fit(0, 0))).toEqual({ incomePct: 0, growthPct: 0 });
  });
});

describe("fitBandVar", () => {
  test("maps bands onto the existing semantic risk ramp", () => {
    expect(fitBandVar("aligned")).toBe("var(--risk-low)");
    expect(fitBandVar("partial")).toBe("var(--risk-mid)");
    expect(fitBandVar("misaligned")).toBe("var(--risk-high)");
    expect(fitBandInkVar("misaligned")).toBe("var(--risk-high-ink)");
  });
});

describe("suggestionsHeading", () => {
  test("names the goal for income and growth, empty for balanced", () => {
    expect(suggestionsHeading("income")).toMatch(/income/i);
    expect(suggestionsHeading("growth")).toMatch(/growth/i);
    expect(suggestionsHeading("balanced")).toBe("");
  });
});
