"use client";

import { useState } from "react";

import type { RiskReport } from "@/lib/types";

import { AnalystView } from "./AnalystView";
import { CoachView } from "./CoachView";
import styles from "./dashboard.module.css";

type View = "coach" | "analyst";

// Two views for two users (UX research: the recruiter and the overtrader have
// opposite jobs-to-be-done). Default = Coach (the product user); a recruiter
// flips to Analyst in one click — and the toggle itself signals the design
// considered two audiences.
export function Dashboard({ report }: { report: RiskReport }) {
  const [view, setView] = useState<View>("coach");

  return (
    <>
      <div
        className={`${styles.toggle} stage stage-1`}
        role="tablist"
        aria-label="Choose a view"
      >
        <button
          role="tab"
          aria-selected={view === "coach"}
          className={`${styles.tab} ${view === "coach" ? styles.active : ""}`}
          onClick={() => setView("coach")}
        >
          Coach
          <span className={styles.tabHint}>plain-language</span>
        </button>
        <button
          role="tab"
          aria-selected={view === "analyst"}
          className={`${styles.tab} ${view === "analyst" ? styles.active : ""}`}
          onClick={() => setView("analyst")}
        >
          Analyst
          <span className={styles.tabHint}>the numbers</span>
        </button>
        <span
          className={styles.thumb}
          style={{ transform: view === "coach" ? "translateX(0)" : "translateX(100%)" }}
          aria-hidden
        />
      </div>

      {view === "coach" ? <CoachView report={report} /> : <AnalystView report={report} />}
    </>
  );
}
