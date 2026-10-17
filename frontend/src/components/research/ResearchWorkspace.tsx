"use client";

import { useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  companies,
  type EvidenceNote,
  type ResearchCompany,
} from "@/lib/research/corpus";
import {
  emptyNotebook,
  exportNotebook,
  snapshotNotebook,
  type Notebook,
  type RiskStance,
} from "@/lib/research/notebook";

import { assessRisk, removeRiskAssessment } from "@/lib/research/risk-memo";
import { DependencyDrawer } from "./DependencyDrawer";
import { CompanyMap } from "./CompanyMap";
import { EvidenceCollection } from "./EvidenceCollection";
import { UnderstandingEditor } from "./UnderstandingEditor";
import { ResearchJournal } from "./ResearchJournal";
import { SourceLibrary } from "./SourceLibrary";
import { EvidenceDesk } from "./EvidenceDesk";
import { ResearchSidebar } from "./ResearchSidebar";
import { useResearchNotebook } from "./useResearchNotebook";
import { Icon } from "./Icon";
import styles from "./research.module.css";

type View = "map" | "evidence" | "understanding" | "journal" | "sources";
const viewNames: Record<View, string> = {
  map: "Explore",
  evidence: "Saved sources",
  understanding: "My notes",
  journal: "History",
  sources: "All documents",
};
const empty = emptyNotebook();

export function ResearchWorkspace({
  liveAiAvailable,
}: {
  liveAiAvailable: boolean;
}) {
  const [symbol, setSymbol] = useState("NVDA");
  const [view, setView] = useState<View>("map");
  const {
    notebooks,
    loaded,
    storageAvailable,
    recoveryRaw,
    update,
    remove,
    resetUnreadableStorage,
  } = useResearchNotebook();
  const [resetRequested, setResetRequested] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState("nvda-business");
  const [deleteRequested, setDeleteRequested] = useState(false);
  const desk = useRef<HTMLElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [deskOpen, setDeskOpen] = useState(false);
  const [dependencyCategory, setDependencyCategory] = useState<string | null>(
    null,
  );
  const dependencyOpener = useRef<HTMLElement | null>(null);
  const showDesk = deskOpen && view !== "sources" && view !== "understanding";
  const company = companies.find((item) => item.symbol === symbol)!;
  const notebook = notebooks[symbol] ?? empty;
  const selected =
    company.evidence.find((item) => item.id === selectedId) ??
    company.evidence[0];
  const savedEvidence = company.evidence.filter((item) =>
    notebook.evidenceIds.includes(item.id),
  );

  function updateNotebook(mutate: (current: Notebook) => Notebook) {
    update(symbol, mutate);
    setDeleteRequested(false);
  }

  function selectCompany(next: ResearchCompany) {
    setDependencyCategory(null);
    setDeskOpen(false);
    setSymbol(next.symbol);
    setSelectedId(next.evidence[0].id);
    setNotice("");
    setView("map");
    setDeleteRequested(false);
  }

  function explore(note: EvidenceNote, opener?: HTMLElement | null) {
    returnFocus.current =
      opener ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    setDeskOpen(true);
    setSelectedId(note.id);
    updateNotebook((current) => ({
      ...current,
      exploredIds: [...new Set([...current.exploredIds, note.id])],
    }));
    requestAnimationFrame(() => {
      desk.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 1100px)").matches)
        desk.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openNotes() {
    setNotice("");
    setDependencyCategory(null);
    setView("understanding");
    requestAnimationFrame(() =>
      document.getElementById("notes-heading")?.focus(),
    );
  }

  function openDependencies(categoryId: string) {
    dependencyOpener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDependencyCategory(categoryId);
  }

  function closeDependencies() {
    setDependencyCategory(null);
    requestAnimationFrame(() => dependencyOpener.current?.focus());
  }

  function classifyRisk(note: EvidenceNote, stance: RiskStance) {
    updateNotebook((current) => assessRisk(current, symbol, note, stance));
    setNotice("");
  }

  function removeAssessment(id: string) {
    updateNotebook((current) => removeRiskAssessment(current, id));
    setNotice("Classification removed. Your saved source stays available.");
  }

  function openOverview() {
    setView("map");
    requestAnimationFrame(() =>
      document.getElementById("company-heading")?.focus(),
    );
  }

  function toggleEvidence(note: EvidenceNote) {
    const exists = notebook.evidenceIds.includes(note.id);
    updateNotebook((current) => ({
      ...current,
      evidenceIds: exists
        ? current.evidenceIds.filter((id) => id !== note.id)
        : [...current.evidenceIds, note.id],
    }));
    setNotice(
      exists ? "Source removed" : "Source saved. Find it in Saved sources.",
    );
  }

  function saveResearch() {
    if (
      ![
        notebook.business,
        notebook.opportunity,
        notebook.risk,
        notebook.unknowns,
        notebook.changeMind,
        notebook.horizon,
      ].some((value) => value.trim()) &&
      Object.keys(notebook.riskAssessments).length === 0
    ) {
      openNotes();
      setNotice("Add a note first, then save a copy to history.");
      return;
    }
    updateNotebook((current) =>
      snapshotNotebook(current, new Date().toISOString(), crypto.randomUUID()),
    );
    setNotice("Saved to history. Your earlier notes stay unchanged.");
  }

  function downloadResearch() {
    const blob = new Blob([exportNotebook(symbol, notebook)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `riskpilot-${symbol.toLowerCase()}-research.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Research exported with your notes and snapshot history.");
  }

  return (
    <div className={styles.workspace}>
      <a href="#research-content" className={styles.skip}>
        Skip to research
      </a>
      <ResearchSidebar
        view={view}
        symbol={symbol}
        notebooks={notebooks}
        selectCompany={selectCompany}
        setView={setView}
      />

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            Workspace <Icon name="chevron" size={13} />
            <span>{viewNames[view]}</span>
          </div>
          <div className={styles.topActions}>
            <span className={styles.saveState}>
              <span
                className={
                  storageAvailable ? styles.statusDot : styles.warningDot
                }
              />
              {!loaded
                ? "Opening notebook…"
                : storageAvailable
                  ? "Saved on this browser"
                  : "Session only · export to keep"}
            </span>
            <ThemeToggle />
            <button
              className={styles.iconButton}
              aria-label="Export research"
              title="Export research"
              onClick={downloadResearch}
            >
              <Icon name="download" />
            </button>
          </div>
        </header>

        <div
          className={`${styles.bodyGrid} ${!showDesk ? styles.singleColumn : ""}`}
        >
          <div className={styles.content} id="research-content">
            {recoveryRaw !== null && (
              <div className={styles.recoveryBanner} role="alert">
                <strong>Your saved notebook needs recovery.</strong>
                <p>
                  The original data has been preserved. New edits stay in this
                  session until you reset storage. Export the original before
                  resetting.
                </p>
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([recoveryRaw], { type: "application/json" }),
                    );
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "riskpilot-recovery.json";
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Export recovery backup
                </button>
                <button
                  onClick={() => {
                    if (!resetRequested) {
                      setResetRequested(true);
                      return;
                    }
                    resetUnreadableStorage();
                    setResetRequested(false);
                  }}
                >
                  {resetRequested
                    ? "Confirm reset saved data"
                    : "Reset unreadable storage"}
                </button>
              </div>
            )}

            {view !== "map" && (
              <div className={styles.intro}>
                <h1>{viewNames[view]}</h1>
                <p>Keep sources and your own notes together.</p>
              </div>
            )}

            <section
              className={styles.companyHeader}
              aria-label={`${company.name} research`}
            >
              <div className={styles.companyIdentity}>
                <span
                  className={styles.largeMonogram}
                  style={{ color: company.color }}
                >
                  {company.monogram}
                </span>
                <div>
                  <div className={styles.companyTitle}>
                    {view === "map" ? (
                      <h1 id="company-heading" tabIndex={-1}>
                        {company.name}
                      </h1>
                    ) : (
                      <h2>{company.name}</h2>
                    )}
                    <span>{company.symbol}</span>
                  </div>
                  <p>
                    {company.sector} <span>·</span> {company.period} research
                    snapshot
                  </p>
                </div>
              </div>
              <span className={styles.curatedBadge}>
                <Icon name="layers" size={13} />
                FY2025 sources
              </span>
            </section>
            <div
              className={styles.tabs}
              role="group"
              aria-label="Research views"
            >
              {(["map", "understanding", "evidence"] as const).map((tab) => (
                <button
                  key={tab}
                  aria-pressed={view === tab}
                  className={view === tab ? styles.tabActive : ""}
                  onClick={() => setView(tab)}
                >
                  {tab === "map"
                    ? "1. Explore"
                    : tab === "understanding"
                      ? "2. My notes"
                      : viewNames[tab]}
                  {tab === "evidence" && <span>{savedEvidence.length}</span>}
                </button>
              ))}
            </div>

            {view === "map" && (
              <CompanyMap
                company={company}
                notebook={notebook}
                explore={explore}
                liveAiAvailable={liveAiAvailable}
                onUnderstand={openNotes}
                onDependency={openDependencies}
              />
            )}

            {view === "evidence" && (
              <EvidenceCollection
                company={company}
                savedEvidence={savedEvidence}
                explore={explore}
                toggleEvidence={toggleEvidence}
                onMap={() => setView("map")}
              />
            )}

            {view === "understanding" && (
              <UnderstandingEditor
                company={company}
                notebook={notebook}
                updateNotebook={updateNotebook}
                saveResearch={saveResearch}
                onExplore={openOverview}
              />
            )}

            {view === "journal" && (
              <ResearchJournal
                company={company}
                notebook={notebook}
                explore={explore}
                onUnderstand={openNotes}
              />
            )}

            {view === "sources" && <SourceLibrary />}

            <footer className={styles.footer}>
              <span>
                <Icon name="shield" size={14} />
                Evidence informs. You decide.
              </span>
              <p>
                Educational research, not a buy/sell recommendation. Historical
                source notes; no live market feed.
              </p>
              <button
                className={styles.deleteButton}
                onClick={() => {
                  if (!deleteRequested) {
                    setDeleteRequested(true);
                    return;
                  }
                  remove(symbol);
                  setDeleteRequested(false);
                  setNotice(`Local ${symbol} notebook deleted.`);
                }}
              >
                {deleteRequested
                  ? `Confirm delete ${symbol} notebook`
                  : "Delete this local notebook"}
              </button>
            </footer>
          </div>

          {showDesk && (
            <EvidenceDesk
              company={company}
              notebook={notebook}
              selected={selected}
              explore={explore}
              toggleEvidence={toggleEvidence}
              onUnderstand={openNotes}
              deskRef={desk}
              onAssess={classifyRisk}
              onRemoveAssessment={removeAssessment}
              onClose={() => {
                setDeskOpen(false);
                returnFocus.current?.focus();
              }}
            />
          )}
        </div>
        {dependencyCategory !== null && (
          <DependencyDrawer
            company={company}
            categoryId={dependencyCategory}
            notebook={notebook}
            onClose={closeDependencies}
            onInspect={(note) => {
              setDependencyCategory(null);
              explore(note, dependencyOpener.current);
            }}
            onAssess={classifyRisk}
            onRemove={removeAssessment}
            onNotes={openNotes}
          />
        )}
        <div
          role="status"
          aria-live="polite"
          className={notice ? styles.toast : styles.srOnly}
        >
          {notice}
          {notice && !storageAvailable
            ? " Browser storage is unavailable; export your research to keep it."
            : ""}
          {notice && (
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
