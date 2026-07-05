import { riskInkVar } from "@/lib/risk-color";
import type { RiskFacts } from "@/lib/types";
import { buildVerdict } from "@/lib/verdict";

import styles from "./verdict-headline.module.css";

// The one-line editorial verdict — replaces paragraphs of prose. Deterministic
// (buildVerdict), band-colored, set in the display face.
export function VerdictHeadline({ facts }: { facts: RiskFacts }) {
  return (
    <p className={styles.verdict} style={{ color: riskInkVar(facts.risk_band) }}>
      {buildVerdict(facts)}
    </p>
  );
}
