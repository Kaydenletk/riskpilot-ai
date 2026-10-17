import type { RefObject } from "react";
import type { ResearchCompany, EvidenceNote } from "@/lib/research/corpus";
import type { Notebook, RiskStance } from "@/lib/research/notebook";
import { RiskActions } from "./RiskActions";
import { Icon } from "./Icon";
import styles from "./research.module.css";

export function EvidenceDesk({
  company,
  notebook,
  selected,
  explore,
  toggleEvidence,
  onUnderstand,
  deskRef,
  onClose,
  onAssess,
  onRemoveAssessment,
}: {
  company: ResearchCompany;
  notebook: Notebook;
  selected: EvidenceNote;
  explore: (note: EvidenceNote) => void;
  toggleEvidence: (note: EvidenceNote) => void;
  onUnderstand: () => void;
  deskRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onAssess: (note: EvidenceNote, stance: RiskStance) => void;
  onRemoveAssessment: (id: string) => void;
}) {
  return (
    <aside
      className={styles.evidenceDesk}
      aria-label="Evidence desk"
      ref={deskRef}
      tabIndex={-1}
    >
      <button className={styles.closeSource} onClick={onClose}>
        <Icon name="close" size={15} /> Close source
      </button>
      <div className={styles.deskHeader}>
        <span className={styles.deskIcon}>
          <Icon name="book" size={19} />
        </span>
        <div>
          <h2>Source details</h2>
          <p>{selected.title}</p>
        </div>
      </div>
      <div className={styles.sourceNote}>
        <span className={styles.sourceType}>
          <span />
          PRIMARY DOCUMENT
        </span>
        <h3>{company.source}</h3>
        <p>{selected.period}</p>
        <div className={styles.sourceSection}>
          <Icon name="layers" size={14} />
          {selected.section}
        </div>
        <div className={styles.sourceSummary}>
          <span>CURATED SOURCE SUMMARY</span>
          <p>{selected.summary}</p>
        </div>
        <p className={styles.summaryNote}>
          Paraphrased research note, not a verbatim excerpt. Open the original
          to check its full context.
        </p>
        <a
          className={styles.sourceLink}
          href={selected.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read original source
          <Icon name="external" size={14} />
        </a>
        <button
          className={`${styles.evidenceSave} ${notebook.evidenceIds.includes(selected.id) ? styles.evidenceSaved : ""}`}
          onClick={() => toggleEvidence(selected)}
        >
          <Icon
            name={
              notebook.evidenceIds.includes(selected.id) ? "check" : "bookmark"
            }
            size={16}
          />
          {notebook.evidenceIds.includes(selected.id)
            ? "Saved · click to remove"
            : "Save source"}
        </button>
      </div>
      {selected.topic === "risk" && (
        <RiskActions
          assessment={notebook.riskAssessments[selected.id]}
          onAssess={(stance) => onAssess(selected, stance)}
          onRemove={() => onRemoveAssessment(selected.id)}
        />
      )}
      <div className={styles.reflectCard}>
        <span className={styles.eyebrow}>
          <Icon name="spark" size={14} />A QUESTION WORTH ASKING
        </span>
        <p>{selected.question}</p>
        <button className={styles.textButton} onClick={onUnderstand}>
          Write my notes
          <Icon name="arrow" size={14} />
        </button>
      </div>
    </aside>
  );
}
