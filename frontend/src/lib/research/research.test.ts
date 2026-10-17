import { describe, expect, test } from "vitest";

import { companies, findCompany, retrieveEvidence } from "./corpus";
import { emptyNotebook, parseNotebooks, snapshotNotebook } from "./notebook";

describe("research evidence boundaries", () => {
  test("only supported companies are selectable", () => {
    expect(findCompany(" nvda ")?.symbol).toBe("NVDA");
    expect(findCompany("UNKNOWN")).toBeUndefined();
    expect(companies).toHaveLength(3);
  });

  test("retrieval finds relevant notes without leaking another company's evidence", () => {
    const notes = retrieveEvidence("NVDA", "export restrictions China");
    expect(notes[0]?.id).toBe("nvda-export");
    expect(notes.every((note) => note.id.startsWith("nvda-"))).toBe(true);
  });

  test("unsupported current-price questions abstain instead of returning historical notes", () => {
    expect(
      retrieveEvidence("NVDA", "What is the current stock price?"),
    ).toEqual([]);
    expect(
      retrieveEvidence("NVDA", "What will the share price be next year?"),
    ).toEqual([]);
    expect(retrieveEvidence("NVDA", "quantum banana recipe")).toEqual([]);
  });

  test("Vietnamese risk questions retrieve the same company risk notes", () => {
    expect(
      retrieveEvidence("NVDA", "Rủi ro xuất khẩu sang Trung Quốc là gì?")[0]
        ?.id,
    ).toBe("nvda-export");
  });

  test("guided risk question works and a later reporting year cannot masquerade as the snapshot", () => {
    const notes = retrieveEvidence("NVDA", "What are the risks?");
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((note) => note.topic === "risk")).toBe(true);
    expect(retrieveEvidence("NVDA", "What was revenue in 2026?")).toEqual([]);
    expect(
      retrieveEvidence("NVDA", "What are the latest export restrictions?"),
    ).toEqual([]);
  });

  test("all notes carry original source URLs and historical periods", () => {
    for (const company of companies) {
      for (const note of company.evidence) {
        expect(note.url).toMatch(
          /^https:\/\/(www\.sec\.gov|www\.microsoft\.com)\//,
        );
        expect(note.period).toContain("2025");
        expect(note.section.length).toBeGreaterThan(3);
      }
    }
  });
});

describe("personal research memory", () => {
  test("corrupt or incompatible browser data does not become trusted state", () => {
    expect(parseNotebooks("not json")).toEqual({});
    expect(
      parseNotebooks(JSON.stringify({ version: 999, notebooks: {} })),
    ).toEqual({});
    expect(
      parseNotebooks(
        JSON.stringify({ version: 1, notebooks: { NVDA: { notes: 4 } } }),
      ),
    ).toEqual({});
  });

  test("snapshot preserves original reasoning when the draft later changes", () => {
    const draft = {
      ...emptyNotebook(),
      business: "My original understanding",
      evidenceIds: ["nvda-business"],
    };
    const saved = snapshotNotebook(
      draft,
      "2026-10-16T12:00:00.000Z",
      "snapshot-1",
    );
    expect(saved.snapshots[0].business).toBe("My original understanding");
    const edited = { ...saved, business: "Changed reasoning", evidenceIds: [] };
    expect(edited.snapshots[0].business).toBe("My original understanding");
    expect(edited.snapshots[0].evidenceIds).toEqual(["nvda-business"]);
  });

  test("browser state roundtrips and rejects unknown source IDs", () => {
    const draft = {
      ...emptyNotebook(),
      business: "A business",
      evidenceIds: ["nvda-business", "msft-business", "fake"],
    };
    const parsed = parseNotebooks(
      JSON.stringify({ version: 1, notebooks: { NVDA: draft } }),
    );
    expect(parsed.NVDA.business).toBe("A business");
    expect(parsed.NVDA.evidenceIds).toEqual(["nvda-business"]);
  });

  test("large valid notebooks remain readable and saving never silently drops old snapshots", () => {
    let notebook = {
      ...emptyNotebook(),
      business: "x".repeat(12000),
      opportunity: "x".repeat(12000),
      risk: "x".repeat(12000),
      unknowns: "x".repeat(12000),
      changeMind: "x".repeat(12000),
      horizon: "x".repeat(12000),
    };
    for (let i = 0; i < 31; i++)
      notebook = snapshotNotebook(
        notebook,
        "2026-10-16T12:00:00.000Z",
        `snapshot-${i}`,
      );
    expect(notebook.snapshots).toHaveLength(31);
    const raw = JSON.stringify({ version: 1, notebooks: { NVDA: notebook } });
    expect(raw.length).toBeGreaterThan(2_000_000);
    expect(parseNotebooks(raw).NVDA.snapshots.at(-1)?.id).toBe("snapshot-0");
  });
});
