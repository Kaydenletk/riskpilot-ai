export interface FinancialSnapshot {
  unit: "USD_millions";
  revenueHistory: { year: number; amount: number }[];
  netIncome: number;
  revenueMix: {
    id: string;
    label: string;
    explanation: string;
    amount: number;
  }[];
  mixBasis: "end_market" | "reportable_segment" | "product_category";
  sourceSection: string;
}

export const percentOf = (value: number, total: number) =>
  (value / total) * 100;
export const formatBillions = (millions: number) =>
  `$${(millions / 1000).toFixed(1)}B`;

export function financialSummary(facts: FinancialSnapshot) {
  const latest = facts.revenueHistory.at(-1)!;
  const previous = facts.revenueHistory.at(-2)!;
  return {
    year: latest.year,
    revenue: latest.amount,
    growth: percentOf(latest.amount - previous.amount, previous.amount),
    profitPer100: percentOf(facts.netIncome, latest.amount),
    largest: facts.revenueMix.reduce((largest, item) =>
      item.amount > largest.amount ? item : largest,
    ),
  };
}
