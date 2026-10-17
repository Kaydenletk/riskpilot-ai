import type { ResearchCompany, EvidenceNote } from "@/lib/research/corpus";
import type { Notebook } from "@/lib/research/notebook";
import { RiskMemo } from "./RiskMemo";
import { Icon } from "./Icon";
import styles from "./research.module.css";
import { EmptyState } from "./EmptyState";

export function ResearchJournal({
  company,
  notebook,
  explore,
  onUnderstand,
}: {
  company: ResearchCompany;
  notebook: Notebook;
  explore: (note: EvidenceNote) => void;
  onUnderstand: () => void;
}) {
  return (
    <section className={styles.viewSection}>
      <span className={styles.eyebrow}>SAVED HISTORY</span>
      <h3>Previous notes for {company.name}</h3>
      <p>
        Copies you saved from My notes. Editing your draft does not change these
        earlier versions.
      </p>
      {notebook.snapshots.length ? (
        <div className={styles.journal}>
          {notebook.snapshots.map((snapshot, index) => (
            <article key={snapshot.id}>
              <div className={styles.snapshotHeader}>
                <span>
                  <Icon name="clock" size={15} />
                  {new Date(snapshot.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <span>Snapshot {notebook.snapshots.length - index}</span>
              </div>
              <span className={styles.topicTag}>{snapshot.decision}</span>
              {[
                ["Business", snapshot.business],
                ["Opportunity", snapshot.opportunity],
                ["Risks", snapshot.risk],
                ["Still unknown", snapshot.unknowns],
                ["What could change my mind", snapshot.changeMind],
                ["Personal context", snapshot.horizon],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <h4>{label}</h4>
                    <p>{value}</p>
                  </div>
                ))}
              {Object.keys(snapshot.riskAssessments).length > 0 && (
                <RiskMemo
                  company={company}
                  assessments={snapshot.riskAssessments}
                />
              )}
              <div className={styles.snapshotEvidence}>
                {snapshot.evidenceIds.map((id) => {
                  const note = company.evidence.find((item) => item.id === id);
                  return (
                    note && (
                      <button key={id} onClick={() => explore(note)}>
                        <Icon name="book" size={13} />
                        {note.title}
                      </button>
                    )
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No history yet."
          description="Write in My notes, then choose Save to history to keep a copy."
          action="Write my notes"
          onClick={() => onUnderstand()}
        />
      )}
    </section>
  );
}
