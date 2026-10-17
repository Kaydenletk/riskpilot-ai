import { corpusVersion, type ResearchCompany } from "./corpus";

export type MetricTarget =
  | { kind: "sales" }
  | { kind: "growth" }
  | { kind: "profit" }
  | { kind: "share"; categoryId: string };

export interface MetricSourceRow {
  id: string;
  label: string;
  year: number;
  amount: number;
}

export interface MetricSource {
  symbol: string;
  title: string;
  basis: "reported" | "derived";
  value: number;
  display: string;
  formula: string;
  rows: MetricSourceRow[];
  corpusVersion: string;
  source: {
    url: string;
    report: string;
    period: string;
    published: string;
    section: string;
  };
}

const number = (value: number) => value.toLocaleString("en-US");
const percent = (value: number) => `${value.toFixed(1)}%`;
const revenueRow = (year: number, amount: number): MetricSourceRow => ({
  id: `revenue-${year}`,
  label: "Annual revenue",
  year,
  amount,
});

export function buildMetricSource(
  company: ResearchCompany,
  target: MetricTarget,
): MetricSource | null {
  const financials = company.financials;
  const evidence = company.evidence[0];
  if (!financials || !company.source || !evidence || !financials.sourceSection) {
    return null;
  }

  const latest = financials.revenueHistory.at(-1);
  const previous = financials.revenueHistory.at(-2);
  if (!latest || !previous) return null;

  let title: string;
  let basis: MetricSource["basis"];
  let value: number;
  let display: string;
  let formula: string;
  let rows: MetricSourceRow[];

  switch (target.kind) {
    case "sales":
      title = "Annual sales";
      basis = "reported";
      value = latest.amount;
      display = `$${(latest.amount / 1000).toFixed(1)}B`;
      formula = `${number(latest.amount)} million USD ÷ 1,000 = ${(latest.amount / 1000).toFixed(1)} billion USD (rounded)`;
      rows = [revenueRow(latest.year, latest.amount)];
      break;
    case "growth":
      title = "Sales growth";
      basis = "derived";
      value = ((latest.amount - previous.amount) / previous.amount) * 100;
      display = `${value >= 0 ? "+" : ""}${percent(value)}`;
      formula = `(${number(latest.amount)} − ${number(previous.amount)}) ÷ ${number(previous.amount)} × 100`;
      rows = [
        revenueRow(previous.year, previous.amount),
        revenueRow(latest.year, latest.amount),
      ];
      break;
    case "profit":
      title = "Profit per $100 of sales";
      basis = "derived";
      value = (financials.netIncome / latest.amount) * 100;
      display = `$${Math.abs(value).toFixed(1)} ${value < 0 ? "lost" : "kept"}`;
      formula = `${number(financials.netIncome)} ÷ ${number(latest.amount)} × 100`;
      rows = [
        { id: `net-income-${latest.year}`, label: "Net income", year: latest.year, amount: financials.netIncome },
        revenueRow(latest.year, latest.amount),
      ];
      break;
    case "share": {
      const category = financials.revenueMix.find(
        (item) => item.id === target.categoryId,
      );
      if (!category) return null;
      title = `${category.label} revenue share`;
      basis = "derived";
      value = (category.amount / latest.amount) * 100;
      display = percent(value);
      formula = `${number(category.amount)} ÷ ${number(latest.amount)} × 100`;
      rows = [
        { id: `category-${category.id}-${latest.year}`, label: category.label, year: latest.year, amount: category.amount },
        revenueRow(latest.year, latest.amount),
      ];
      break;
    }
  }

  return {
    symbol: company.symbol,
    title,
    basis,
    value,
    display,
    formula,
    rows,
    corpusVersion,
    source: {
      url: evidence.url,
      report: company.source,
      period: evidence.period,
      published: evidence.filed,
      section: financials.sourceSection,
    },
  };
}
