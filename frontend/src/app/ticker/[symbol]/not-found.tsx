// The allow-list boundary, made visible. A ticker outside the vetted universe
// lands here. Rather than dwelling on why it was rejected, we point the user
// straight at symbols that DO work — the fastest path back to a real read.
import Link from "next/link";

import { fetchTickerUniverse } from "@/lib/ticker-backend";

import styles from "../../page.module.css";
import notFoundStyles from "./not-found.module.css";

export default async function TickerNotFound() {
  const universe = await fetchTickerUniverse();
  const suggestions = universe.slice(0, 8);

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
          Search is bounded to a fixed, vetted list of instruments. Try one of these:
        </p>

        {suggestions.length > 0 && (
          <ul className={notFoundStyles.suggestions} aria-label="Symbols you can analyze">
            {suggestions.map((o) => (
              <li key={o.ticker}>
                <Link href={`/ticker/${o.ticker.toLowerCase()}`} className={notFoundStyles.chip}>
                  <span className="num">{o.ticker}</span>
                  <span className={notFoundStyles.chipSector}>{o.sector}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p style={{ marginTop: "var(--space-3)" }}>
          <Link href="/">← Back to the Portfolio X-Ray</Link>
        </p>
      </section>
    </div>
  );
}
