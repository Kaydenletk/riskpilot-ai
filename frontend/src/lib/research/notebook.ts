import { z } from "zod";

import { findCompany } from "./corpus";

export const NOTEBOOK_KEY = "riskpilot-research-v1";

const text = z.string().max(12000);
export const riskStanceSchema = z.enum([
  "dealbreaker",
  "manageable",
  "blindspot",
]);
const riskAssessmentSchema = z.object({
  stance: riskStanceSchema,
  reason: z.string().max(5000).default(""),
  corpusVersion: z.string().max(100),
  source: z.object({
    id: z.string().max(100),
    title: z.string().max(200),
    summary: text,
    section: z.string().max(250),
    period: z.string().max(100),
    url: z.url().refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        ["www.sec.gov", "www.microsoft.com"].includes(url.hostname) &&
        !url.username &&
        !url.password &&
        !url.port
      );
    }),
  }),
});
export type RiskStance = z.infer<typeof riskStanceSchema>;
export type RiskAssessment = z.infer<typeof riskAssessmentSchema>;
const fieldsSchema = z.object({
  riskAssessments: z
    .record(z.string(), riskAssessmentSchema)
    .refine((value) => Object.keys(value).length <= 30)
    .default({}),
  business: text,
  opportunity: text,
  risk: text,
  unknowns: text,
  changeMind: text,
  horizon: text,
  decision: z.enum(["researching", "watching", "paused"]),
  evidenceIds: z.array(z.string()).max(30),
  exploredIds: z.array(z.string()).max(30),
});
const snapshotSchema = fieldsSchema.extend({
  id: z.string(),
  createdAt: z.string().datetime(),
});
const notebookSchema = fieldsSchema.extend({
  snapshots: z.array(snapshotSchema),
});
export type ResearchSnapshot = z.infer<typeof snapshotSchema>;
export type Notebook = z.infer<typeof notebookSchema>;
export type Notebooks = Record<string, Notebook>;

export function emptyNotebook(): Notebook {
  return {
    riskAssessments: {},
    business: "",
    opportunity: "",
    risk: "",
    unknowns: "",
    changeMind: "",
    horizon: "",
    decision: "researching",
    evidenceIds: [],
    exploredIds: [],
    snapshots: [],
  };
}

export function inspectNotebooks(raw: string | null): {
  ok: boolean;
  notebooks: Notebooks;
} {
  if (raw === null) return { ok: true, notebooks: {} };
  try {
    const parsed = z
      .object({
        version: z.literal(1),
        notebooks: z.record(z.string(), notebookSchema),
      })
      .safeParse(JSON.parse(raw));
    if (!parsed.success) return { ok: false, notebooks: {} };
    const result: Notebooks = {};
    for (const [symbol, notebook] of Object.entries(parsed.data.notebooks)) {
      const company = findCompany(symbol);
      if (!company || symbol !== company.symbol) continue;
      const validIds = new Set(company.evidence.map((note) => note.id));
      const cleanIds = (ids: string[]) => [
        ...new Set(ids.filter((id) => validIds.has(id))),
      ];
      const cleanAssessments = (
        assessments: Notebook["riskAssessments"],
        historical = false,
      ) =>
        Object.fromEntries(
          Object.entries(assessments).filter(
            ([id, item]) =>
              id === item.source.id &&
              id.startsWith(symbol.toLowerCase() + "-") &&
              (historical ||
                !company.evidence.some((note) => note.id === id) ||
                company.evidence.some(
                  (note) => note.id === id && note.topic === "risk",
                )),
          ),
        );
      result[symbol] = {
        ...notebook,
        riskAssessments: cleanAssessments(notebook.riskAssessments),
        evidenceIds: cleanIds(notebook.evidenceIds),
        exploredIds: cleanIds(notebook.exploredIds),
        snapshots: notebook.snapshots.map((snapshot) => ({
          ...snapshot,
          riskAssessments: cleanAssessments(snapshot.riskAssessments, true),
          evidenceIds: cleanIds(snapshot.evidenceIds),
          exploredIds: cleanIds(snapshot.exploredIds),
        })),
      };
    }
    return { ok: true, notebooks: result };
  } catch {
    return { ok: false, notebooks: {} };
  }
}

export function parseNotebooks(raw: string | null): Notebooks {
  return inspectNotebooks(raw).notebooks;
}

export function snapshotNotebook(
  notebook: Notebook,
  createdAt: string,
  id: string,
): Notebook {
  const { snapshots, ...fields } = notebook;
  const snapshot = {
    ...fields,
    riskAssessments: Object.fromEntries(
      Object.entries(fields.riskAssessments).map(([id, item]) => [
        id,
        { ...item, source: { ...item.source } },
      ]),
    ),
    evidenceIds: [...fields.evidenceIds],
    exploredIds: [...fields.exploredIds],
    createdAt,
    id,
  };
  return {
    ...notebook,
    snapshots: [snapshot, ...snapshots.filter((item) => item.id !== id)],
  };
}

export function exportNotebook(symbol: string, notebook: Notebook): string {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), symbol, version: 1, notebook },
    null,
    2,
  );
}
