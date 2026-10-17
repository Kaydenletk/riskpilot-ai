import { z } from "zod";
import {
  corpusVersion,
  retrieveEvidence,
  type ResearchCompany,
} from "./corpus";

const serviceResult = z.object({
  engine: z.literal("python"),
  symbol: z.string(),
  corpusVersion: z.string(),
  retrievalVersion: z.string(),
  strategy: z.enum(["lexical", "hybrid", "lexical_fallback"]),
  evidenceIds: z.array(z.string()).max(3),
  abstentionReason: z.string().nullable(),
  fallbackReason: z.string().nullable(),
});

export async function searchResearch(
  company: ResearchCompany,
  query: string,
  semantic: boolean,
) {
  let fallbackReason = "service_disabled";
  if (process.env.RESEARCH_BACKEND_ENABLED !== "0") {
    try {
      const response = await fetch(
        `${process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000"}/research/search`,
        {
          method: "POST",
          cache: "no-store",
          signal: AbortSignal.timeout(semantic ? 10_000 : 1200),
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret":
              process.env.INTERNAL_SHARED_SECRET_FRONTEND ||
              "dev-local-secret-change-me",
          },
          body: JSON.stringify({ symbol: company.symbol, query, semantic }),
        },
      );
      if (!response.ok) throw new Error("service_unavailable");
      const result = serviceResult.parse(await response.json());
      if (result.corpusVersion !== corpusVersion)
        throw new Error("catalogue_mismatch");
      const allowed = new Set(company.evidence.map((note) => note.id));
      if (
        result.symbol !== company.symbol ||
        result.evidenceIds.some((id) => !allowed.has(id)) ||
        new Set(result.evidenceIds).size !== result.evidenceIds.length ||
        (result.abstentionReason && result.evidenceIds.length)
      )
        throw new Error("invalid_service_references");
      return result;
    } catch (error) {
      fallbackReason =
        error instanceof Error &&
        ["catalogue_mismatch", "invalid_service_references"].includes(
          error.message,
        )
          ? error.message
          : "service_unavailable";
    }
  }
  const evidenceIds = retrieveEvidence(company.symbol, query).map(
    (note) => note.id,
  );
  return {
    engine: "offline" as const,
    symbol: company.symbol,
    corpusVersion,
    retrievalVersion: "offline-lexical-v1",
    strategy: "lexical" as const,
    evidenceIds,
    abstentionReason: evidenceIds.length ? null : "no_matching_notes",
    fallbackReason,
  };
}
