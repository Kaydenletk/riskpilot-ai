// Server component: crawlable links to every ticker page, styled as 44px-tall
// chips (real touch targets, obviously clickable — no hover required).
import Link from "next/link";

import type { TickerOption } from "@/lib/types";

import styles from "./instrument-index.module.css";

export function InstrumentIndex({ universe }: { universe: TickerOption[] }) {
  if (universe.length === 0) return null;
  return (
    <nav className={styles.index} aria-labelledby="instrument-index-h">
      <h2 id="instrument-index-h" className={`caption ${styles.title}`}>
        Browse the universe — {universe.length} instruments
      </h2>
      <ul className={styles.list}>
        {universe.map((t) => (
          <li key={t.ticker}>
            <Link href={`/ticker/${t.ticker}`} className={styles.chip}>
              <span className={`num ${styles.ticker}`}>{t.ticker}</span>
              <span className={styles.sector}>{t.sector}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
