import { useEffect, useId, useRef } from "react";
import type { EvidenceNote, ResearchCompany } from "@/lib/research/corpus";
import type { Notebook, RiskStance } from "@/lib/research/notebook";
import { dependencyContext } from "@/lib/research/dependencies";
import {
  financialSummary,
  formatBillions,
  percentOf,
} from "@/lib/research/financials";
import { RiskActions } from "./RiskActions";
import { Icon } from "./Icon";
import styles from "./decision.module.css";

export function DependencyDrawer({
  company,
  categoryId,
  notebook,
  onClose,
  onInspect,
  onAssess,
  onRemove,
  onNotes,
}: {
  company: ResearchCompany;
  categoryId: string;
  notebook: Notebook;
  onClose: () => void;
  onInspect: (note: EvidenceNote) => void;
  onAssess: (note: EvidenceNote, stance: RiskStance) => void;
  onRemove: (id: string) => void;
  onNotes: () => void;
}) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const context = dependencyContext(company, categoryId);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const classifiedCount = Object.keys(notebook.riskAssessments).length;
  const total = company.financials
    ? financialSummary(company.financials).revenue
    : 0;
  return (
    <dialog
      ref={dialog}
      className={styles.drawer}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.drawerContent}>
        <header className={styles.drawerHeader}>
          <span className={styles.eyebrow}>DEPENDENCIES TO INVESTIGATE</span>
          <button aria-label="Close dependencies" onClick={onClose}>
            <Icon name="close" />
            Close
          </button>
        </header>
        <h2 id={titleId}>
          {context?.category.label ?? "No reviewed mapping yet"}
        </h2>
        {!context ? (
          <p>
            This library has not linked this revenue category to disclosures.
            That does not establish an absence of risk.
          </p>
        ) : (
          <>
            <div className={styles.revenuePill}>
              <strong>{formatBillions(context.category.amount)}</strong>
              <span>
                {percentOf(context.category.amount, total).toFixed(1)}% of
                FY2025 sales
              </span>
            </div>
            <div className={styles.dependencyPath} aria-label="Research path">
              <span>Revenue</span>
              <Icon name="arrow" size={15} />
              <span>Drivers</span>
              <Icon name="arrow" size={15} />
              <span>Risks</span>
              <Icon name="arrow" size={15} />
              <span>My memo</span>
            </div>
            <p className={styles.muted}>{context.scope}</p>
            <section
              className={styles.drawerSection}
              aria-label="Supporting drivers"
            >
              <h3>What supports this business?</h3>
              {context.drivers.length ? (
                context.drivers.map((note) => (
                  <article key={note.id} className={styles.driver}>
                    <strong>{note.title}</strong>
                    <p>{note.summary}</p>
                    <button onClick={() => onInspect(note)}>
                      Read disclosure <Icon name="arrow" size={14} />
                    </button>
                  </article>
                ))
              ) : (
                <p className={styles.muted}>
                  No category-specific growth driver is covered by these
                  selected notes.
                </p>
              )}
            </section>
            <section
              className={styles.drawerSection}
              aria-label="Linked disclosures"
            >
              <h3>What could challenge it?</h3>
              <p className={styles.muted}>
                Selected disclosures to investigate. Not an exhaustive list or a
                prediction.
              </p>
              {context.risks.map((note) => (
                <article key={note.id} className={styles.riskCard}>
                  <div className={styles.riskTitle}>
                    <Icon name="shield" size={18} />
                    <h4>{note.title}</h4>
                  </div>
                  <p>{note.summary}</p>
                  <small>
                    {note.period} · {note.section}
                  </small>
                  <button
                    className={styles.sourceButton}
                    onClick={() => onInspect(note)}
                  >
                    Read disclosure <Icon name="external" size={14} />
                  </button>
                  <RiskActions
                    assessment={notebook.riskAssessments[note.id]}
                    onAssess={(stance) => onAssess(note, stance)}
                    onRemove={() => onRemove(note.id)}
                  />
                </article>
              ))}
            </section>
            <div className={styles.drawerFooter}>
              <span>
                {classifiedCount} {classifiedCount === 1 ? "risk" : "risks"}{" "}
                classified for {company.name}
              </span>
              <button onClick={onNotes}>
                View my risk memo <Icon name="arrow" size={16} />
              </button>
            </div>
            <p className={styles.footnote}>
              These links were reviewed manually. They organize disclosures;
              they do not quantify causal impact or establish single points of
              failure.
            </p>
          </>
        )}
      </div>
    </dialog>
  );
}
