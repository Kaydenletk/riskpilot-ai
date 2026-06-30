// The allow-list boundary, made visible. A ticker outside the vetted universe
// lands here — framed as a deliberate security property, not an error.
import Link from "next/link";

import styles from "../../page.module.css";

export default function TickerNotFound() {
  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <Link href="/" className={styles.brand} style={{ textDecoration: "none" }}>
          RiskPilot<span className={styles.brandAccent}>AI</span>
        </Link>
        <div className="caption">single-instrument risk read</div>
      </header>

      <section className={styles.explain} style={{ marginTop: "var(--space-4)" }}>
        <p className={styles.summary}>That symbol isn&apos;t in the demo universe.</p>
        <p style={{ color: "var(--ink-soft)", maxWidth: "60ch" }}>
          Search is bounded to a fixed, vetted list of instruments. That boundary
          is also the prompt-injection defense: a symbol the system doesn&apos;t
          recognize is rejected here, before it could ever reach the language
          model. It&apos;s a feature, not a limitation.
        </p>
        <p style={{ marginTop: "var(--space-3)" }}>
          <Link href="/">← Back to the Portfolio X-Ray</Link>
        </p>
      </section>
    </div>
  );
}
