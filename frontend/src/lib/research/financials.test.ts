import { expect, test } from "vitest";
import { companies } from "./corpus";
import { financialSummary, formatBillions, percentOf } from "./financials";

test("visual percentages use annual totals and show actual net income, not stock returns", () => {
  const summary = financialSummary(companies[0].financials!);
  expect(summary.revenue).toBe(130497);
  expect(summary.growth).toBeCloseTo(114.2, 1);
  expect(summary.profitPer100).toBeCloseTo(55.8, 1);
  expect(summary.largest.id).toBe("data-center");
  expect(percentOf(summary.largest.amount, summary.revenue)).toBeCloseTo(
    88.27,
    2,
  );
  expect(formatBillions(summary.revenue)).toBe("$130.5B");
});

test("every visual breakdown reconciles and the company switch changes the numbers", () => {
  for (const company of companies) {
    const summary = financialSummary(company.financials!);
    expect(
      company.financials!.revenueMix.reduce(
        (sum, row) => sum + percentOf(row.amount, summary.revenue),
        0,
      ),
    ).toBeCloseTo(100, 8);
  }
  expect(financialSummary(companies[1].financials!).revenue).toBe(281724);
  expect(financialSummary(companies[2].financials!).revenue).toBe(416161);
});

test("losses remain negative instead of looking like positive earnings", () => {
  const facts = { ...companies[0].financials!, netIncome: -1000 };
  expect(financialSummary(facts).profitPer100).toBeLessThan(0);
});
