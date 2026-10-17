import type { FinancialSnapshot } from "./financials";
import snapshot from "./companies.json";

export type Topic = "business" | "growth" | "risk";

export interface EvidenceNote {
  id: string;
  topic: Topic;
  title: string;
  summary: string;
  question: string;
  keywords: string;
  section: string;
  period: string;
  filed: string;
  url: string;
  periodEnd: string;
  publishedAt: string;
  retrievedAt: string;
  contentKind: "curated_summary";
}

export interface ResearchCompany {
  symbol: string;
  name: string;
  monogram: string;
  sector: string;
  description: string;
  color: string;
  source: string;
  period: string;
  evidence: EvidenceNote[];
  financials?: FinancialSnapshot | null;
}

export const corpusVersion = snapshot.corpusVersion;
export const companies = snapshot.companies as ResearchCompany[];

export function findCompany(symbol: string): ResearchCompany | undefined {
  return companies.find(
    (company) => company.symbol === symbol.trim().toUpperCase(),
  );
}

const stopWords = new Set(
  "what why how is are the a an and or of to in it its this that stock shares company does do for can i you about me tell explain will be next year current today now la gi cua toi nay va ve co phieu".split(
    " ",
  ),
);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function retrieveEvidence(
  symbol: string,
  query: string,
): EvidenceNote[] {
  const company = findCompany(symbol);
  if (!company) return [];
  const normalized = normalize(query);
  const requestedYears = normalized.match(/\b20\d{2}\b/g) ?? [];
  if (requestedYears.some((year) => year !== "2025")) return [];
  if (/\b(latest|current|today)\b|hien tai|moi nhat|hom nay/.test(normalized))
    return [];
  if (
    /current.*price|price.*(today|now|next|future)|share price|price target|buy or sell|should i buy|gia.*(hien tai|hom nay|tuong lai)/.test(
      normalized,
    )
  )
    return [];
  const terms = [
    ...new Set(
      normalized.replace(/\brisks\b/g, "risk").match(/[a-z0-9]+/g) ?? [],
    ),
  ].filter(
    (word) =>
      word.length > 2 && !stopWords.has(word) && word !== symbol.toLowerCase(),
  );
  return company.evidence
    .map((evidence) => {
      const words = new Set(
        normalize(
          `${evidence.title} ${evidence.summary} ${evidence.keywords}`,
        ).match(/[a-z0-9]+/g),
      );
      return {
        evidence,
        score: terms.reduce((sum, term) => sum + (words.has(term) ? 1 : 0), 0),
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ evidence }) => evidence);
}
