import { describe, test, expect } from "vitest";
import { computeBreakdown } from "@/lib/breakdown";
import type { Holding } from "@/lib/types";

const H = (ticker: string, sector: string, mv: number): Holding => ({
  ticker, sector, shares: 1, market_value: mv,
});

describe("computeBreakdown", () => {
  test("computes total and sector weights summing to ~100", () => {
    const b = computeBreakdown([H("A", "Tech", 60), H("B", "Tech", 20), H("C", "Energy", 20)]);
    expect(b.total).toBe(100);
    expect(b.largestSector).toBe("Tech");
    expect(b.largestSectorPct).toBe(80);
    const sum = b.sectors.reduce((s, x) => s + x.pct, 0);
    expect(Math.round(sum)).toBe(100);
  });

  test("top-3 concentration uses the 3 largest holdings", () => {
    const b = computeBreakdown([
      H("A", "Tech", 50), H("B", "Tech", 30), H("C", "Energy", 15), H("D", "Energy", 5),
    ]);
    expect(b.concentrationTop3Pct).toBe(95); // (50+30+15)/100
  });

  test("handles fewer than 3 holdings", () => {
    const b = computeBreakdown([H("A", "Tech", 70), H("B", "Energy", 30)]);
    expect(b.concentrationTop3Pct).toBe(100);
  });

  test("empty input yields zeros, no divide-by-zero", () => {
    const b = computeBreakdown([]);
    expect(b.total).toBe(0);
    expect(b.concentrationTop3Pct).toBe(0);
    expect(b.sectors).toEqual([]);
  });
});
