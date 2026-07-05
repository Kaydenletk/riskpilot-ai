import { describe, test, expect } from "vitest";
import { toggleCompare, serializeCompare, parseCompare, MAX_COMPARE } from "@/lib/compare";

describe("compare helpers", () => {
  test("toggle adds a new ticker", () => {
    expect(toggleCompare(["NVDA"], "AMD")).toEqual(["NVDA", "AMD"]);
  });
  test("toggle removes an existing ticker", () => {
    expect(toggleCompare(["NVDA", "AMD"], "NVDA")).toEqual(["AMD"]);
  });
  test("toggle is case-insensitive on identity", () => {
    expect(toggleCompare(["NVDA"], "nvda")).toEqual([]);
  });
  test("toggle respects the cap", () => {
    const full = ["A", "B", "C", "D"];
    expect(toggleCompare(full, "E")).toEqual(full); // unchanged at cap
    expect(full.length).toBe(MAX_COMPARE);
  });
  test("serialize joins with commas", () => {
    expect(serializeCompare(["NVDA", "AMD"])).toBe("NVDA,AMD");
  });
  test("parse dedupes, uppercases, and caps", () => {
    expect(parseCompare("nvda,NVDA,amd,msft,tsla,jpm")).toEqual(["NVDA", "AMD", "MSFT", "TSLA"]);
  });
  test("parse handles null/empty", () => {
    expect(parseCompare(null)).toEqual([]);
    expect(parseCompare("")).toEqual([]);
  });
});
