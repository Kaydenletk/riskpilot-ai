import type { ResearchCompany, EvidenceNote } from "@/lib/research/corpus";
import { Icon } from "./Icon";
import styles from "./research.module.css";
import { EmptyState } from "./EmptyState";

export function EvidenceCollection({
  company,
  savedEvidence,
  explore,
  toggleEvidence,
  onMap,
}: {
  company: ResearchCompany;
  savedEvidence: EvidenceNote[];
  explore: (note: EvidenceNote) => void;
  toggleEvidence: (note: EvidenceNote) => void;
  onMap: () => void;
}) {
  return (
    <section className={styles.viewSection}>
      <span className={styles.eyebrow}>SAVED SOURCES</span>
      <h3>Sources saved for {company.name}</h3>
      <p>
        Source notes you saved for {company.name}. A saved source is a starting
        point for verification, not a guarantee.
      </p>
      {savedEvidence.length ? (
        <div className={styles.evidenceList}>
          {savedEvidence.map((note) => (
            <article key={note.id}>
              <span className={styles.topicTag}>{note.topic}</span>
              <h4>{note.title}</h4>
              <p>{note.summary}</p>
              <div>
                <button
                  className={styles.textButton}
                  onClick={() => explore(note)}
                >
                  Inspect source
                  <Icon name="arrow" size={15} />
                </button>
                <button
                  className={styles.mutedButton}
                  onClick={() => toggleEvidence(note)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No saved sources yet."
          description="Open a topic in Explore, then choose Save source."
          action="Explore topics"
          onClick={() => onMap()}
        />
      )}
    </section>
  );
}
