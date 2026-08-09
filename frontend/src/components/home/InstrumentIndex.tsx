"use client";
// Crawlable links to every ticker page, styled as 44px-tall chips (real touch
// targets, obviously clickable — no hover required). Grouped by sector, with a
// client-side filter that matches ticker or sector. Links stay real <Link>s
// (server-rendered anchors) so crawlers see the full universe regardless of
// filter state.
import Link from "next/link";
import { useMemo, useState } from "react";

import type { TickerOption } from "@/lib/types";

import styles from "./instrument-index.module.css";

// group tickers by sector, preserving first-seen sector order.
function groupBySector(universe: TickerOption[]): Map<string, TickerOption[]> {
  const groups = new Map<string, TickerOption[]>();
  for (const t of universe) {
    const bucket = groups.get(t.sector);
    if (bucket) {
      bucket.push(t);
    } else {
      groups.set(t.sector, [t]);
    }
  }
  return groups;
}

export function InstrumentIndex({ universe }: { universe: TickerOption[] }) {
  const [filter, setFilter] = useState("");

  if (universe.length === 0) return null;

  const query = filter.trim().toLowerCase();
  const filtered =
    query === ""
      ? universe
      : universe.filter(
          (t) => t.ticker.toLowerCase().includes(query) || t.sector.toLowerCase().includes(query)
        );
  const groups = useMemo(() => groupBySector(filtered), [filtered]);

  return (
    <nav className={styles.index} aria-labelledby="instrument-index-h">
      <h2 id="instrument-index-h" className={`caption ${styles.title}`}>
        Browse the universe — {universe.length} instruments
      </h2>
      <input
        type="text"
        className={styles.filter}
        placeholder="Filter tickers…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filter instruments"
      />
      {groups.size === 0 ? (
        <p className="caption">No matches.</p>
      ) : (
        Array.from(groups.entries()).map(([sector, tickers]) => (
          <section key={sector} className={styles.group}>
            <div className={`caption ${styles.groupLabel}`}>{sector}</div>
            <ul className={styles.list}>
              {tickers.map((t) => (
                <li key={t.ticker}>
                  <Link href={`/ticker/${t.ticker}`} className={styles.chip}>
                    <span className={`num ${styles.ticker}`}>{t.ticker}</span>
                    <span className={styles.sector}>{t.sector}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </nav>
  );
}
