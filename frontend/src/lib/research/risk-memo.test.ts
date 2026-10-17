import { expect, test } from "vitest";
import { companies, corpusVersion } from "./corpus";
import { emptyNotebook, parseNotebooks, snapshotNotebook } from "./notebook";
import { assessRisk, exportRiskMemo, removeRiskAssessment } from "./risk-memo";
import { dependencyContext } from "./dependencies";

const nvidia = companies[0];
const risk = nvidia.evidence.find((note) => note.id === "nvda-export")!;

test("old notebooks and snapshots migrate without losing existing text", () => {
  const old = { ...emptyNotebook(), business: "Existing reasoning" } as Record<
    string,
    unknown
  >;
  delete old.riskAssessments;
  old.snapshots = [
    {
      ...old,
      snapshots: undefined,
      id: "old",
      createdAt: "2026-10-17T12:00:00Z",
    },
  ];
  const parsed = parseNotebooks(
    JSON.stringify({ version: 1, notebooks: { NVDA: old } }),
  );
  expect(parsed.NVDA.business).toBe("Existing reasoning");
  expect(parsed.NVDA.riskAssessments).toEqual({});
  expect(parsed.NVDA.snapshots[0].riskAssessments).toEqual({});
});

test("classification pins source context, updates idempotently and preserves history", () => {
  let notebook = assessRisk(
    emptyNotebook(),
    nvidia.symbol,
    risk,
    "dealbreaker",
  );
  expect(notebook.riskAssessments[risk.id].source.summary).toBe(risk.summary);
  expect(notebook.riskAssessments[risk.id].corpusVersion).toBe(corpusVersion);
  notebook = snapshotNotebook(notebook, "2026-10-17T12:00:00Z", "saved");
  const changed = assessRisk(notebook, nvidia.symbol, risk, "manageable");
  expect(Object.keys(changed.riskAssessments)).toEqual([risk.id]);
  expect(changed.snapshots[0].riskAssessments[risk.id].stance).toBe(
    "dealbreaker",
  );
  changed.riskAssessments[risk.id].source.summary = "Edited draft source";
  expect(changed.snapshots[0].riskAssessments[risk.id].source.summary).toBe(
    risk.summary,
  );
  expect(removeRiskAssessment(changed, risk.id).riskAssessments).toEqual({});
  expect(removeRiskAssessment(changed, risk.id).snapshots).toHaveLength(1);
});

test("a risk assessment cannot be added to another company or to a growth note", () => {
  expect(() =>
    assessRisk(emptyNotebook(), "AAPL", risk, "blindspot"),
  ).toThrow();
  expect(() =>
    assessRisk(emptyNotebook(), "NVDA", nvidia.evidence[0], "blindspot"),
  ).toThrow();
});

test("Markdown distinguishes user classification from evidence and preserves pinned text", () => {
  const notebook = assessRisk(emptyNotebook(), "NVDA", risk, "blindspot");
  notebook.riskAssessments[risk.id].reason =
    "I need evidence about demand outside China.";
  const markdown = exportRiskMemo(nvidia, notebook);
  expect(markdown).toContain("My classification: Blindspot");
  expect(markdown).toContain(risk.summary);
  expect(markdown).toContain("I need evidence about demand outside China.");
  expect(markdown).toContain(corpusVersion);
  expect(markdown).toContain(risk.url);
  expect(markdown).not.toContain("readiness score");
});

test("dependency mappings contain only known same-company evidence and do not invent missing mappings", () => {
  for (const company of companies) {
    for (const category of company.financials!.revenueMix) {
      const context = dependencyContext(company, category.id);
      if (!context) continue;
      expect(context.risks.length).toBeGreaterThan(0);
      expect(
        context.risks.every(
          (note) =>
            note.topic === "risk" &&
            note.id.startsWith(company.symbol.toLowerCase() + "-"),
        ),
      ).toBe(true);
      expect(context.drivers.every((note) => note.topic === "growth")).toBe(
        true,
      );
    }
  }
  expect(
    dependencyContext(nvidia, "data-center")?.risks.map((note) => note.id),
  ).toEqual(["nvda-supply", "nvda-export"]);
  expect(dependencyContext(nvidia, "unknown")).toBeNull();
});

test("a captured draft survives a source being retired, while foreign-company labels are removed", () => {
  const notebook = assessRisk(emptyNotebook(), "NVDA", risk, "blindspot");
  const captured = notebook.riskAssessments[risk.id];
  notebook.riskAssessments = {
    "nvda-retired": {
      ...captured,
      source: { ...captured.source, id: "nvda-retired" },
    },
    "aapl-supply": {
      ...captured,
      source: { ...captured.source, id: "aapl-supply" },
    },
  };
  const parsed = parseNotebooks(
    JSON.stringify({ version: 1, notebooks: { NVDA: notebook } }),
  );
  expect(parsed.NVDA.riskAssessments["nvda-retired"].source.summary).toBe(
    risk.summary,
  );
  expect(parsed.NVDA.riskAssessments["aapl-supply"]).toBeUndefined();
});

test("reclassifying keeps the original captured source and authored reason", () => {
  const notebook = assessRisk(emptyNotebook(), "NVDA", risk, "blindspot");
  notebook.riskAssessments[risk.id].source.summary =
    "Previously captured disclosure.";
  notebook.riskAssessments[risk.id].reason = "My original question";
  const changed = assessRisk(notebook, "NVDA", risk, "dealbreaker");
  expect(changed.riskAssessments[risk.id].source.summary).toBe(
    "Previously captured disclosure.",
  );
  expect(changed.riskAssessments[risk.id].reason).toBe("My original question");
});
