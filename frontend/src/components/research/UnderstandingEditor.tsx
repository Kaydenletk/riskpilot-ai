import type { ResearchCompany } from "@/lib/research/corpus";
import type { Notebook } from "@/lib/research/notebook";
import { RiskMemo } from "./RiskMemo";
import { removeRiskAssessment } from "@/lib/research/risk-memo";
import { Icon } from "./Icon";
import styles from "./research.module.css";

export function UnderstandingEditor({
  company,
  notebook,
  updateNotebook,
  saveResearch,
  onExplore,
}: {
  company: ResearchCompany;
  notebook: Notebook;
  updateNotebook: (update: (current: Notebook) => Notebook) => void;
  saveResearch: () => void;
  onExplore: () => void;
}) {
  const savedEvidence = notebook.evidenceIds;
  return (
    <section className={styles.viewSection}>
      <span className={styles.eyebrow}>YOUR NOTES</span>
      <h3 id="notes-heading" tabIndex={-1}>
        What I learned about {company.name}
      </h3>
      <p>
        Write in your own words. Skip anything you do not know yet. Your draft
        saves automatically on this browser. Save a copy to history when you
        want to keep this version.
      </p>
      <RiskMemo
        company={company}
        notebook={notebook}
        assessments={notebook.riskAssessments}
        onExplore={onExplore}
        onChange={(id, patch) =>
          updateNotebook((current) => {
            const existing = current.riskAssessments[id];
            if (!existing) return current;
            return {
              ...current,
              riskAssessments: {
                ...current.riskAssessments,
                [id]: { ...existing, ...patch },
              },
            };
          })
        }
        onRemove={(id) =>
          updateNotebook((current) => removeRiskAssessment(current, id))
        }
      />
      <div className={styles.editorFields}>
        {[
          [
            "business",
            "How does this business make money?",
            "Explain it as if you were telling a friend.",
          ],
          [
            "opportunity",
            "What makes the opportunity interesting?",
            "Separate what the company reports from what you expect.",
          ],
          [
            "risk",
            "What could go wrong?",
            "Describe a risk and how it could affect the business.",
          ],
          [
            "unknowns",
            "What do I still not know?",
            "Questions, missing evidence, assumptions to check…",
          ],
          [
            "changeMind",
            "What could change my mind?",
            "Which new evidence would challenge your current view?",
          ],
          [
            "horizon",
            "How does this connect to my situation?",
            "Optional: when might you need this money? What have you not considered?",
          ],
        ].map(([field, label, placeholder]) => (
          <label key={field}>
            {label}
            <textarea
              maxLength={12000}
              rows={3}
              value={
                notebook[
                  field as keyof Pick<
                    Notebook,
                    | "business"
                    | "opportunity"
                    | "risk"
                    | "unknowns"
                    | "changeMind"
                    | "horizon"
                  >
                ]
              }
              placeholder={placeholder}
              onChange={(event) =>
                updateNotebook((current) => ({
                  ...current,
                  [field]: event.target.value,
                }))
              }
            />
          </label>
        ))}
      </div>
      <label className={styles.decisionLabel}>
        Where am I in my research?
        <select
          value={notebook.decision}
          onChange={(event) =>
            updateNotebook((current) => ({
              ...current,
              decision: event.target.value as Notebook["decision"],
            }))
          }
        >
          <option value="researching">Still researching</option>
          <option value="watching">Following the evidence</option>
          <option value="paused">Paused for now</option>
        </select>
      </label>
      <div className={styles.editorFooter}>
        <button className={styles.primaryButton} onClick={saveResearch}>
          <Icon name="bookmark" size={16} />
          Save to history
        </button>
        <span>{savedEvidence.length} saved sources attached</span>
      </div>
    </section>
  );
}
