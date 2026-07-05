import { describe, test, expect } from "vitest";
import { parseHoldings, MAX_HOLDINGS } from "@/lib/parse-holdings";

describe("parseHoldings", () => {
  test("parses a valid rows-only CSV", () => {
    const r = parseHoldings("NVDA,40,Technology,3615.46\nKO,30,Consumer Staples,1722.63");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.holdings).toEqual([
        { ticker: "NVDA", shares: 40, sector: "Technology", market_value: 3615.46 },
        { ticker: "KO", shares: 30, sector: "Consumer Staples", market_value: 1722.63 },
      ]);
    }
  });

  test("tolerates a header row in any case", () => {
    const r = parseHoldings("Ticker,Shares,Sector,Market_Value\nNVDA,40,Technology,3615.46");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.holdings).toHaveLength(1);
  });

  test("trims whitespace and uppercases the ticker", () => {
    const r = parseHoldings("  nvda , 40 , Technology , 3615.46 ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.holdings[0].ticker).toBe("NVDA");
  });

  test("ignores blank lines", () => {
    const r = parseHoldings("NVDA,40,Technology,3615.46\n\n\nKO,30,Consumer Staples,1722.63\n");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.holdings).toHaveLength(2);
  });

  test("reports a non-numeric market_value with the data-row number", () => {
    const r = parseHoldings("NVDA,40,Technology,abc");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0].row).toBe(1);
      expect(r.errors[0].message).toMatch(/market_value/i);
    }
  });

  test("rejects an empty ticker", () => {
    const r = parseHoldings(",40,Technology,3615.46");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/ticker/i);
  });

  test("rejects non-positive shares", () => {
    const r = parseHoldings("NVDA,0,Technology,3615.46");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/shares/i);
  });

  test("rejects a row with the wrong column count", () => {
    const r = parseHoldings("NVDA,40,Technology");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/columns|fields/i);
  });

  test("rejects empty input", () => {
    const r = parseHoldings("   \n  ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/no holdings|empty/i);
  });

  test("enforces the MAX_HOLDINGS cap", () => {
    const line = "NVDA,40,Technology,3615.46";
    const csv = Array.from({ length: MAX_HOLDINGS + 1 }, () => line).join("\n");
    const r = parseHoldings(csv);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(new RegExp(`${MAX_HOLDINGS}`));
  });

  test("collects multiple row errors", () => {
    const r = parseHoldings(",40,Technology,3615.46\nNVDA,xx,Technology,3615.46");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(2);
  });
});
