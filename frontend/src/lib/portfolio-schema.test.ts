import { describe, expect, test } from "vitest";

import { weightedPortfolio } from "./portfolio-schema";

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    ticker: `T${i}`.slice(0, 5).toUpperCase().replace(/[0-9]/g, "A"),
    weight_pct: 100 / n,
  }));

describe("weightedPortfolio", () => {
  test("accepts a valid 4-holding portfolio", () => {
    expect(
      weightedPortfolio.safeParse([
        { ticker: "NVDA", weight_pct: 40 },
        { ticker: "AAPL", weight_pct: 25 },
        { ticker: "KO", weight_pct: 20 },
        { ticker: "JNJ", weight_pct: 15 },
      ]).success,
    ).toBe(true);
  });

  test("rejects fewer than 3 rows", () => {
    expect(
      weightedPortfolio.safeParse([
        { ticker: "NVDA", weight_pct: 60 },
        { ticker: "KO", weight_pct: 40 },
      ]).success,
    ).toBe(false);
  });

  test("rejects more than 20 rows", () => {
    expect(weightedPortfolio.safeParse(rows(21)).success).toBe(false);
  });

  test("rejects weights not summing to 100", () => {
    expect(
      weightedPortfolio.safeParse([
        { ticker: "NVDA", weight_pct: 50 },
        { ticker: "AAPL", weight_pct: 30 },
        { ticker: "KO", weight_pct: 10 },
      ]).success,
    ).toBe(false);
  });

  test("rejects lowercase or invalid ticker", () => {
    expect(
      weightedPortfolio.safeParse([
        { ticker: "nvda", weight_pct: 40 },
        { ticker: "AAPL", weight_pct: 30 },
        { ticker: "KO", weight_pct: 30 },
      ]).success,
    ).toBe(false);
  });

  test("tolerates 99.8 (within ±0.5)", () => {
    expect(
      weightedPortfolio.safeParse([
        { ticker: "NVDA", weight_pct: 40 },
        { ticker: "AAPL", weight_pct: 30 },
        { ticker: "KO", weight_pct: 29.8 },
      ]).success,
    ).toBe(true);
  });
});
