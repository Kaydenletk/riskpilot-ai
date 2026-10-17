import type { ResearchCompany } from "./corpus";

// Reviewed navigation links, not a causal model or an exhaustive risk list.
const mappings: Record<
  string,
  Record<string, { drivers: string[]; risks: string[]; scope: string }>
> = {
  NVDA: {
    "data-center": {
      drivers: ["nvda-demand"],
      risks: ["nvda-supply", "nvda-export"],
      scope:
        "Data Center context plus company-wide supply and export disclosures.",
    },
    gaming: {
      drivers: [],
      risks: ["nvda-supply", "nvda-export"],
      scope:
        "Company-wide disclosures to investigate; this library does not isolate Gaming exposure.",
    },
    other: {
      drivers: [],
      risks: ["nvda-supply", "nvda-export"],
      scope:
        "Company-wide disclosures; the grouped markets have different exposures.",
    },
  },
  MSFT: {
    productivity: {
      drivers: [],
      risks: ["msft-competition", "msft-security"],
      scope:
        "Company-wide competition and security disclosures; not segment-specific loss estimates.",
    },
    cloud: {
      drivers: ["msft-demand"],
      risks: ["msft-competition", "msft-security"],
      scope:
        "Cloud growth context with company-wide competition and security disclosures.",
    },
    personal: {
      drivers: [],
      risks: ["msft-competition", "msft-security"],
      scope:
        "Company-wide disclosures; this library does not isolate Personal Computing exposure.",
    },
  },
  AAPL: {
    iphone: {
      drivers: ["aapl-demand"],
      risks: ["aapl-supply", "aapl-competition"],
      scope:
        "Product demand context with company-wide manufacturing and competition disclosures.",
    },
    services: {
      drivers: ["aapl-demand"],
      risks: ["aapl-competition"],
      scope:
        "Ecosystem and competition context; hardware manufacturing risk is not attributed directly to Services here.",
    },
    other: {
      drivers: ["aapl-demand"],
      risks: ["aapl-supply", "aapl-competition"],
      scope:
        "Product demand context and company-wide disclosures; grouped products have different exposures.",
    },
  },
};

export function dependencyContext(
  company: ResearchCompany,
  categoryId: string,
) {
  const mapping = mappings[company.symbol]?.[categoryId];
  const category = company.financials?.revenueMix.find(
    (item) => item.id === categoryId,
  );
  if (!mapping || !category) return null;
  const notes = new Map(company.evidence.map((note) => [note.id, note]));
  const drivers = mapping.drivers
    .map((id) => notes.get(id))
    .filter((note) => note?.topic === "growth");
  const risks = mapping.risks
    .map((id) => notes.get(id))
    .filter((note) => note?.topic === "risk");
  return {
    category,
    scope: mapping.scope,
    drivers: drivers.filter((note) => note !== undefined),
    risks: risks.filter((note) => note !== undefined),
  };
}
