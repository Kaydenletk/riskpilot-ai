import type { RiskAssessment, RiskStance } from "@/lib/research/notebook";
import { stanceLabels } from "@/lib/research/risk-memo";
import styles from "./decision.module.css";

export function RiskActions({
  assessment,
  onAssess,
  onRemove,
}: {
  assessment?: RiskAssessment;
  onAssess: (stance: RiskStance) => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.riskActions}>
      <p className={styles.muted}>
        How does this affect your thesis? Your judgment, not an AI rating.
      </p>
      <div
        className={styles.choices}
        role="group"
        aria-label="Classify this risk"
      >
        {(["dealbreaker", "manageable", "blindspot"] as const).map((stance) => (
          <button
            key={stance}
            aria-pressed={assessment?.stance === stance}
            onClick={() => onAssess(stance)}
          >
            {stance === "blindspot"
              ? "Flag as Blindspot"
              : `Add as ${stanceLabels[stance]}`}
          </button>
        ))}
      </div>
      <div className={styles.actionState} aria-live="polite">
        {assessment && (
          <>
            <span>Saved to My notes · {stanceLabels[assessment.stance]}</span>
            <button onClick={onRemove}>Remove classification</button>
          </>
        )}
      </div>
    </div>
  );
}
