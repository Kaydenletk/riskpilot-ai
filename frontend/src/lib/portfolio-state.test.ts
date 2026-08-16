import { describe, expect, test } from "vitest";

import {
  addHolding,
  parsePortfolio,
  removeHolding,
  rowsFromHoldings,
  serializePortfolio,
  setWeight,
  toggleLock,
  totalWeight,
  type PortfolioRow,
} from "./portfolio-state";

const row = (ticker: string, weightPct: number, locked = false): PortfolioRow => ({
  ticker,
  weightPct,
  locked,
});

test("addHolding to empty → 100", () => {
  expect(addHolding([], "NVDA")).toEqual([row("NVDA", 100)]);
});

test("addHolding equal-splits among unlocked", () => {
  const rows = addHolding(addHolding([], "NVDA"), "AAPL");
  expect(rows.map((r) => r.weightPct)).toEqual([50, 50]);
});

test("addHolding duplicate is a no-op", () => {
  const rows = addHolding([], "NVDA");
  expect(addHolding(rows, "NVDA")).toBe(rows);
});

test("addHolding preserves locked weights", () => {
  const rows = [row("NVDA", 60, true), row("KO", 40)];
  const next = addHolding(rows, "AAPL");
  expect(next.find((r) => r.ticker === "NVDA")!.weightPct).toBe(60);
  expect(totalWeight(next)).toBeCloseTo(100, 9);
});

test("addHolding when everything is locked scales locks down (only case locks move)", () => {
  // Edge case explicitly called out in the spec: no unlocked space at all.
  // The new row is floored at 0.5 and every locked row shrinks proportionally.
  const rows = [row("NVDA", 60, true), row("KO", 40, true)];
  const next = addHolding(rows, "AAPL");
  expect(next.find((r) => r.ticker === "AAPL")!.weightPct).toBe(0.5);
  expect(next.find((r) => r.ticker === "NVDA")!.weightPct).toBeCloseTo(59.7, 9);
  expect(next.find((r) => r.ticker === "KO")!.weightPct).toBeCloseTo(39.8, 9);
  expect(totalWeight(next)).toBeCloseTo(100, 9);
});

test("setWeight rebalances only unlocked others", () => {
  const rows = [row("NVDA", 40), row("AAPL", 30, true), row("KO", 30)];
  const next = setWeight(rows, "NVDA", 60);
  expect(next.find((r) => r.ticker === "AAPL")!.weightPct).toBe(30);
  expect(next.find((r) => r.ticker === "KO")!.weightPct).toBeCloseTo(10, 9);
  expect(totalWeight(next)).toBeCloseTo(100, 9);
});

test("setWeight clamps to leave 0.5 per unlocked other", () => {
  const rows = [row("NVDA", 40), row("AAPL", 30), row("KO", 30)];
  const next = setWeight(rows, "NVDA", 99.9);
  expect(next.find((r) => r.ticker === "NVDA")!.weightPct).toBe(99);
  expect(totalWeight(next)).toBeCloseTo(100, 9);
});

test("setWeight on a locked row is allowed and moves it, without flipping its lock", () => {
  const rows = [row("NVDA", 40, true), row("AAPL", 30), row("KO", 30)];
  const next = setWeight(rows, "NVDA", 50);
  const nvda = next.find((r) => r.ticker === "NVDA")!;
  expect(nvda.weightPct).toBe(50);
  expect(nvda.locked).toBe(true); // flag untouched — only toggleLock changes it
  expect(totalWeight(next)).toBeCloseTo(100, 9);
});

test("removeHolding redistributes to unlocked", () => {
  const rows = [row("NVDA", 50), row("AAPL", 30, true), row("KO", 20)];
  const next = removeHolding(rows, "NVDA");
  expect(next.find((r) => r.ticker === "AAPL")!.weightPct).toBe(30);
  expect(next.find((r) => r.ticker === "KO")!.weightPct).toBeCloseTo(70, 9);
});

test("removeHolding redistributes across all remaining when none unlocked", () => {
  const rows = [row("NVDA", 50, true), row("AAPL", 30, true), row("KO", 20, true)];
  const next = removeHolding(rows, "KO");
  expect(next.find((r) => r.ticker === "NVDA")!.weightPct).toBeCloseTo(62.5, 9);
  expect(next.find((r) => r.ticker === "AAPL")!.weightPct).toBeCloseTo(37.5, 9);
  expect(totalWeight(next)).toBeCloseTo(100, 9);
});

test("removeHolding of the last row returns []", () => {
  expect(removeHolding([row("NVDA", 100)], "NVDA")).toEqual([]);
});

test("toggleLock flips only the flag", () => {
  const rows = [row("NVDA", 60), row("KO", 40)];
  const next = toggleLock(rows, "NVDA");
  expect(next.find((r) => r.ticker === "NVDA")).toEqual(row("NVDA", 60, true));
  expect(next.find((r) => r.ticker === "KO")).toEqual(row("KO", 40, false));
  expect(toggleLock(next, "NVDA").find((r) => r.ticker === "NVDA")!.locked).toBe(false);
});

test("unknown-ticker operations are no-ops (decision: same reference back)", () => {
  const rows = [row("NVDA", 100)];
  expect(removeHolding(rows, "AAPL")).toBe(rows);
  expect(setWeight(rows, "AAPL", 50)).toBe(rows);
  expect(toggleLock(rows, "AAPL")).toBe(rows);
});

test("URL round-trip", () => {
  const rows = parsePortfolio("NVDA:40,AAPL:25.5,KO:34.5");
  expect(serializePortfolio(rows)).toBe("NVDA:40,AAPL:25.5,KO:34.5");
});

test("serializePortfolio trims trailing zeros and drops locked flag", () => {
  expect(serializePortfolio([row("NVDA", 40, true), row("AAPL", 25.5)])).toBe("NVDA:40,AAPL:25.5");
});

test("parse drops garbage segments", () => {
  expect(parsePortfolio("NVDA:40,???,aapl:20,KO:-5,PG:0,JNJ:20")).toEqual([
    row("NVDA", 40),
    row("JNJ", 20),
  ]);
});

test("inputs are never mutated", () => {
  const rows = Object.freeze([
    Object.freeze(row("NVDA", 40)),
    Object.freeze(row("KO", 60)),
  ]) as readonly PortfolioRow[];
  expect(() => setWeight(rows, "NVDA", 50)).not.toThrow();
  expect(() => addHolding(rows, "AAPL")).not.toThrow();
  expect(() => removeHolding(rows, "KO")).not.toThrow();
  expect(() => toggleLock(rows, "KO")).not.toThrow();
  expect(rows[0].weightPct).toBe(40);
});

test("drift absorption may nudge the just-set target by 0.1 if it is the largest unlocked row (documented decision)", () => {
  // 50 / 90 * 30 = 16.666..., rounds to 16.7 for each of the 3 unlocked
  // others -> 50.1, 0.1 over budget. The generic "largest unlocked row
  // absorbs drift" rule (see absorbDrift in portfolio-state.ts) applies
  // uniformly post-mutation and picks NVDA itself here since it's the
  // largest unlocked row after the edit — nudging it to 49.9 to keep the
  // sum-to-100 invariant exact, rather than special-casing the target.
  const rows = [row("NVDA", 10), row("AAPL", 30), row("KO", 30), row("PG", 30)];
  const next = setWeight(rows, "NVDA", 50);
  expect(next.find((r) => r.ticker === "NVDA")!.weightPct).toBe(49.9);
  expect(totalWeight(next)).toBeCloseTo(100, 9);
  for (const r of next) {
    expect(Math.round(r.weightPct * 10)).toBeCloseTo(r.weightPct * 10, 9);
  }
});

// Tiny seeded LCG so the fuzz run is deterministic across CI runs.
function makeLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1103515245, state) + 12345) >>> 0;
    return state / 4294967296;
  };
}

test("fuzz: 200 random ops keep totalWeight ~100 (seeded LCG)", () => {
  const rand = makeLcg(42);
  const tickers = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH"];
  let rows: PortfolioRow[] = [];

  for (let i = 0; i < 200; i++) {
    const roll = rand();
    if (rows.length === 0 || roll < 0.3) {
      const t = tickers[Math.floor(rand() * tickers.length)];
      rows = addHolding(rows, t);
    } else if (roll < 0.55) {
      const t = rows[Math.floor(rand() * rows.length)].ticker;
      rows = removeHolding(rows, t);
    } else if (roll < 0.85) {
      const t = rows[Math.floor(rand() * rows.length)].ticker;
      const w = 0.5 + rand() * 99;
      rows = setWeight(rows, t, w);
    } else {
      const t = rows[Math.floor(rand() * rows.length)].ticker;
      rows = toggleLock(rows, t);
    }

    if (rows.length > 0) {
      expect(totalWeight(rows)).toBeCloseTo(100, 6);
    }
  }
});

test("rowsFromHoldings derives rounded percent weights", () => {
  const rows = rowsFromHoldings([
    { ticker: "NVDA", sector: "T", shares: 1, market_value: 600 },
    { ticker: "KO", sector: "S", shares: 1, market_value: 400 },
  ]);
  expect(rows).toEqual([
    { ticker: "NVDA", weightPct: 60, locked: false },
    { ticker: "KO", weightPct: 40, locked: false },
  ]);
});

describe("totalWeight", () => {
  test("sums weights, 0 for empty", () => {
    expect(totalWeight([])).toBe(0);
    expect(totalWeight([row("NVDA", 40), row("KO", 60)])).toBe(100);
  });
});
