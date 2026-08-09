import Link from "next/link";

import styles from "./what-if-teaser.module.css";

// Static teaser: sells the simulator in one glance. Numbers are illustrative
// and labeled as such — they are NOT engine output, so they must not imitate it.
export function WhatIfTeaser() {
  return (
    <Link href="/analyze" className={styles.strip}>
      <span className="caption">What if…</span>
      <span className={styles.example}>
        Cut NVDA 40% → 25% <span className={`num ${styles.delta}`}>risk 74 → 61</span>
      </span>
      <span className={styles.go}>Try it on your portfolio →</span>
    </Link>
  );
}
