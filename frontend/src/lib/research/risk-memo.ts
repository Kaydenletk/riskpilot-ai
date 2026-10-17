import {
  corpusVersion,
  findCompany,
  type EvidenceNote,
  type ResearchCompany,
} from "./corpus";
import type { Notebook, RiskStance, RiskAssessment } from "./notebook";

export const stanceLabels: Record<RiskStance, string> = {
  dealbreaker: "Dealbreaker",
  manageable: "Manageable risk",
  blindspot: "Blindspot",
};
export const stanceHelp: Record<RiskStance, string> = {
  dealbreaker: "This could invalidate my thesis.",
  manageable: "I believe I can accept this risk; explain why.",
  blindspot: "I need more evidence before judging it.",
};

export function assessRisk(
  notebook: Notebook,
  symbol: string,
  note: EvidenceNote,
  stance: RiskStance,
): Notebook {
  const known = findCompany(symbol)?.evidence.find(
    (item) => item.id === note.id && item.topic === "risk",
  );
  if (!known)
    throw new Error(
      "Only a disclosed risk from the selected company can be assessed",
    );
  const existing = notebook.riskAssessments[note.id];
  const assessment: RiskAssessment = existing
    ? { ...existing, stance, source: { ...existing.source } }
    : {
        stance,
        reason: "",
        corpusVersion,
        source: {
          id: known.id,
          title: known.title,
          summary: known.summary,
          section: known.section,
          period: known.period,
          url: known.url,
        },
      };
  return {
    ...notebook,
    evidenceIds: [...new Set([...notebook.evidenceIds, known.id])],
    riskAssessments: { ...notebook.riskAssessments, [known.id]: assessment },
  };
}

export function removeRiskAssessment(notebook: Notebook, id: string): Notebook {
  const next = { ...notebook.riskAssessments };
  delete next[id];
  return { ...notebook, riskAssessments: next };
}

const escape = (text: string) => text.replace(/[\\`*_{}\[\]<>#|]/g, "\\$&");

export function exportRiskMemo(
  company: ResearchCompany,
  notebook: Notebook,
): string {
  const lines = [
    `# ${company.name} (${company.symbol}) — My risk memo`,
    "",
    "Personal research judgments, not investment recommendations or measured risk probabilities.",
    "",
    `Research status: ${notebook.decision}`,
    "",
  ];
  for (const [label, value] of [
    ["Business", notebook.business],
    ["Opportunity", notebook.opportunity],
    ["Risks", notebook.risk],
    ["Open questions", notebook.unknowns],
    ["What could change my mind", notebook.changeMind],
    ["Personal context", notebook.horizon],
  ]) {
    if (value.trim()) lines.push(`## ${label}`, escape(value), "");
  }
  for (const assessment of Object.values(notebook.riskAssessments)) {
    lines.push(
      `## ${escape(assessment.source.title)}`,
      `My classification: ${stanceLabels[assessment.stance]}`,
      "",
      `My reason: ${assessment.reason.trim() ? escape(assessment.reason) : "Not recorded yet — this label still needs my reasoning."}`,
      "",
      `Captured source summary: ${escape(assessment.source.summary)}`,
      "",
      `Source period: ${escape(assessment.source.period)}`,
      `Source section: ${escape(assessment.source.section)}`,
      `Original report: <${assessment.source.url}>`,
      `Catalogue version: ${assessment.corpusVersion}`,
      "",
    );
  }
  if (!Object.keys(notebook.riskAssessments).length)
    lines.push("No risks classified yet.", "");
  lines.push(
    "Selected historical disclosures are incomplete. A missing risk here does not establish its absence.",
    "",
  );
  return lines.join("\n");
}
