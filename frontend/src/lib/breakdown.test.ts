import { describe, expect, test } from "vitest";

import { holdingRows, sectorRows } from "./breakdown";
import type { Holding } from "./types";

const holdings: Holding[] = [
  { ticker: "NVDA", shares: 40, sector: "Technology", market_value: 6000 },
  { ticker: "MSFT", shares: 10, sector: "Technology", market_value: 3000 },
  { ticker: "KO", shares: 20, sector: "Staples", market_value: 1000 },
];

describe("holdingRows", () => {
  test("weights sum to ~100 and are sorted desc", () => {
    const rows = holdingRows(holdings);
    expect(rows[0].ticker).toBe("NVDA");
    const sum = rows.reduce((s, r) => s + r.weightPct, 0);
    expect(sum).toBeGreaterThan(99.9);
    expect(sum).toBeLessThan(100.1);
  });

  test("does not mutate input", () => {
    const copy = JSON.parse(JSON.stringify(holdings));
    holdingRows(holdings);
    expect(holdings).toEqual(copy);
  });

  test("single holding is 100%", () => {
    const rows = holdingRows([holdings[0]]);
    expect(rows[0].weightPct).toBeCloseTo(100, 5);
  });
});

describe("sectorRows", () => {
  test("aggregates by sector, sorted desc", () => {
    const rows = sectorRows(holdings);
    expect(rows[0].sector).toBe("Technology");
    expect(rows[0].pct).toBeCloseTo(90, 1);
  });

  test("empty input yields empty rows", () => {
    expect(sectorRows([])).toEqual([]);
  });
});
