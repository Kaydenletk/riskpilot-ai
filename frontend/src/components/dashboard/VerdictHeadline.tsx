import { riskInkVar } from "@/lib/risk-color";
import type { RiskFacts } from "@/lib/types";
import { buildVerdict } from "@/lib/verdict";

import styles from "./verdict-headline.module.css";

// The one-line editorial verdict — replaces paragraphs of prose. Deterministic
// (buildVerdict), band-colored, set in the display face. Rendered as an h2: the
// section headline of the Coach view (the sample dashboard) — the page's h1
// belongs to the Hero above the fold.
export function VerdictHeadline({ facts }: { facts: RiskFacts }) {
  return (
    <h2 className={styles.verdict} style={{ color: riskInkVar(facts.risk_band) }}>
      {buildVerdict(facts)}
    </h2>
  );
}
