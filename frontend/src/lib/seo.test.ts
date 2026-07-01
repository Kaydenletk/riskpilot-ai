import { describe, expect, it } from "vitest";

import { CANONICAL_ORIGIN, tickerDescription, tickerPath, tickerTitle } from "./seo";
import type { TickerFacts } from "./types";

const NVDA: TickerFacts = {
  risk_score: 80,
  risk_band: "aggressive",
  volatility_annualized_pct: 42,
  max_drawdown_pct: -35.5,
  beta: 1.75,
  sector: "Technology",
};

describe("seo helpers", () => {
  it("canonical origin is the branded prod domain", () => {
    expect(CANONICAL_ORIGIN).toBe("https://riskpilot-coach.vercel.app");
  });

  it("tickerPath lowercases and prefixes /ticker/", () => {
    expect(tickerPath("NVDA")).toBe("/ticker/nvda");
    expect(tickerPath("xom")).toBe("/ticker/xom");
  });

  it("tickerTitle includes ticker, score, and sector", () => {
    const t = tickerTitle("NVDA", NVDA);
    expect(t).toContain("NVDA");
    expect(t).toContain("80");
    expect(t).toContain("Technology");
    expect(t).toContain("RiskPilot AI");
  });

  it("tickerDescription surfaces real facts (volatility, drawdown, beta)", () => {
    const d = tickerDescription("NVDA", NVDA);
    expect(d).toContain("42");
    expect(d).toContain("35.5");
    expect(d).toContain("1.75");
    expect(d.length).toBeGreaterThan(50);
    expect(d.length).toBeLessThanOrEqual(160);
  });
});
