import { expect, test } from "vitest";

import type { Holding } from "@/lib/types";

import { sectorWeights } from "./SectorBars";

const h = (ticker: string, sector: string, market_value: number): Holding => ({
  ticker,
  sector,
  shares: 1,
  market_value,
});

test("aggregates and sorts sector weights", () => {
  const rows = sectorWeights([
    h("NVDA", "Technology", 600),
    h("AAPL", "Technology", 200),
    h("KO", "Consumer Staples", 200),
  ]);
  expect(rows[0]).toEqual({ sector: "Technology", pct: 80 });
  expect(rows[1]).toEqual({ sector: "Consumer Staples", pct: 20 });
});

test("empty holdings → empty", () => {
  expect(sectorWeights([])).toEqual([]);
});

test("rounds to 0.1", () => {
  const rows = sectorWeights([h("A", "X", 100), h("B", "Y", 200)]);
  expect(rows[0]).toEqual({ sector: "Y", pct: 66.7 });
  expect(rows[1]).toEqual({ sector: "X", pct: 33.3 });
});
