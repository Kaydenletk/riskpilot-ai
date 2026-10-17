"use client";

// Segmented "what's this portfolio for?" control. Pure UI — the chosen goal
// travels to the engine, which computes goal-fit facts; nothing is decided here.
import { GOAL_DESCRIPTIONS, GOAL_LABELS } from "@/lib/goal-fit";
import type { PortfolioGoal } from "@/lib/types";

import styles from "./goal-picker.module.css";

const GOALS: PortfolioGoal[] = ["growth", "balanced", "income"];

interface GoalPickerProps {
  goal: PortfolioGoal;
  onGoalChange: (goal: PortfolioGoal) => void;
}

export function GoalPicker({ goal, onGoalChange }: GoalPickerProps) {
  return (
    <fieldset className={styles.picker}>
      <legend id="goal-picker-legend" className={`caption ${styles.legend}`}>
        What&apos;s this portfolio for?
      </legend>
      {/* radiogroup named by the visible legend — one label, not two */}
      <div className={styles.options} role="radiogroup" aria-labelledby="goal-picker-legend">
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={goal === g}
            className={`${styles.option} ${goal === g ? styles.active : ""}`}
            onClick={() => onGoalChange(g)}
          >
            <span className={styles.optionLabel}>{GOAL_LABELS[g]}</span>
            <span className={`caption ${styles.optionHint}`}>{GOAL_DESCRIPTIONS[g]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
