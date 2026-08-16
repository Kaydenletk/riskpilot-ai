// Server component: the page's above-the-fold thesis + two CTAs, plus an
// optional live sample card on the right. This is the ONLY <h1> on the
// homepage — the sample dashboard below is demoted to <h2>.
import Link from "next/link";

import styles from "./hero.module.css";

export function Hero({ card }: { card?: React.ReactNode }) {
  return (
    <section className={`${styles.hero} stage stage-1`} aria-labelledby="hero-h">
      <div className={styles.copy}>
        <h1 id="hero-h" className={`grad-text ${styles.headline}`}>
          Know your risk before the market does.
        </h1>
        <p className={styles.support}>
          Portfolio risk management with deterministic math — explained by an AI that{" "}
          <strong>cannot invent numbers</strong>.
        </p>
        <div className={styles.ctas}>
          <Link href="/analyze" className={styles.primary}>
            Analyze my portfolio →
          </Link>
          <a href="#sample" className={styles.secondary}>
            See a sample X-Ray
          </a>
        </div>
      </div>
      {card && <div className={styles.visual}>{card}</div>}
    </section>
  );
}
