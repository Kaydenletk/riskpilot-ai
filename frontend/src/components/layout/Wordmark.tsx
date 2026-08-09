import Link from "next/link";

import styles from "./wordmark.module.css";

// Type-only brand mark: RISK/PILOT — the slash is the logo (pilot's checklist
// tick), set in the accent. Pure text: zero image bytes, themes for free.
export function Wordmark() {
  return (
    <Link href="/" className={styles.mark} aria-label="RiskPilot home">
      RISK<span className={styles.slash}>/</span>PILOT
    </Link>
  );
}
