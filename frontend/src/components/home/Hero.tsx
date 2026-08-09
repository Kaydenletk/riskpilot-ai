// Server component: the page's above-the-fold thesis + two CTAs. This is the
// ONLY <h1> on the homepage — the sample dashboard below is demoted to <h2>.
import Link from "next/link";

import styles from "./hero.module.css";

export function Hero() {
  return (
    <section className={`${styles.hero} stage stage-1`} aria-labelledby="hero-h">
      <h1 id="hero-h" className={styles.headline}>
        Think twice before your next trade.
      </h1>
      <p className={styles.support}>
        Deterministic risk math, explained by an AI that <strong>cannot invent numbers</strong>.
      </p>
      <div className={styles.ctas}>
        <Link href="/analyze" className={styles.primary}>
          Analyze my portfolio →
        </Link>
        <a href="#sample" className={styles.secondary}>
          See a sample X-Ray
        </a>
      </div>
    </section>
  );
}
