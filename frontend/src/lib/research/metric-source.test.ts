import { describe, expect, it } from "vitest";
import { companies, corpusVersion, type ResearchCompany } from "./corpus";
import { buildMetricSource } from "./metric-source";

describe("buildMetricSource", () => {
  const nvda = companies.find((company) => company.symbol === "NVDA")!;

  it("pins reported annual sales and derives sales growth from adjacent years", () => {
    const sales = buildMetricSource(nvda, { kind: "sales" });
    expect(sales).toMatchObject({
      symbol: "NVDA", title: "Annual sales", basis: "reported", value: 130497,
      display: "$130.5B", formula: "130,497 million USD ÷ 1,000 = 130.5 billion USD (rounded)",
      rows: [{ id: "revenue-2025", label: "Annual revenue", year: 2025, amount: 130497 }],
    });
    const growth = buildMetricSource(nvda, { kind: "growth" });
    expect(growth).toMatchObject({
      basis: "derived", value: expect.closeTo((130497 - 60922) / 60922 * 100),
      display: "+114.2%", formula: "(130,497 − 60,922) ÷ 60,922 × 100",
      rows: [
        { id: "revenue-2024", label: "Annual revenue", year: 2024, amount: 60922 },
        { id: "revenue-2025", label: "Annual revenue", year: 2025, amount: 130497 },
      ],
    });
  });

  it("calculates profit per $100 and category revenue share with source rows", () => {
    expect(buildMetricSource(nvda, { kind: "profit" })).toMatchObject({
      title: "Profit per $100 of sales", basis: "derived",
      value: expect.closeTo(72880 / 130497 * 100), display: "$55.8 kept",
      formula: "72,880 ÷ 130,497 × 100",
      rows: [
        { id: "net-income-2025", label: "Net income", year: 2025, amount: 72880 },
        { id: "revenue-2025", label: "Annual revenue", year: 2025, amount: 130497 },
      ],
    });
    expect(buildMetricSource(nvda, { kind: "share", categoryId: "data-center" })).toMatchObject({
      title: "Data Center revenue share", basis: "derived",
      value: expect.closeTo(115186 / 130497 * 100), display: "88.3%",
      formula: "115,186 ÷ 130,497 × 100",
      rows: [
        { id: "category-data-center-2025", label: "Data Center", year: 2025, amount: 115186 },
        { id: "revenue-2025", label: "Annual revenue", year: 2025, amount: 130497 },
      ],
    });
    const lossCompany: ResearchCompany = {
      ...nvda,
      financials: { ...nvda.financials!, netIncome: -1000 },
    };
    expect(buildMetricSource(lossCompany, { kind: "profit" })).toMatchObject({
      value: expect.closeTo(-1000 / 130497 * 100), display: "$0.8 lost",
    });
  });

  it("pins source metadata and catalogue amounts for every company", () => {
    for (const company of companies) {
      const pin = buildMetricSource(company, { kind: "sales" })!;
      const latest = company.financials!.revenueHistory.at(-1)!;
      expect(pin).toMatchObject({
        symbol: company.symbol, corpusVersion, value: latest.amount,
        rows: [{ amount: latest.amount, year: latest.year }],
        source: {
          url: company.evidence[0].url, period: company.evidence[0].period,
          published: company.evidence[0].filed, report: company.source,
          section: company.financials!.sourceSection,
        },
      });
    }
  });

  it("returns null for missing/incomplete financials and unknown categories", () => {
    expect(buildMetricSource({ ...nvda, financials: null }, { kind: "sales" })).toBeNull();
    expect(buildMetricSource({ ...nvda, financials: { ...nvda.financials!, revenueHistory: [{ year: 2025, amount: 1 }] } }, { kind: "growth" })).toBeNull();
    expect(buildMetricSource(nvda, { kind: "share", categoryId: "unknown" })).toBeNull();
  });
});
