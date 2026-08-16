"use client";
// Crawlable links to every ticker page, styled as 44px-tall chips (real touch
// targets, obviously clickable — no hover required). Grouped by sector inside
// collapsible <details> sections, with a client-side filter that matches
// ticker or sector. Links stay real <Link>s (server-rendered anchors) so
// crawlers see the full universe regardless of open/closed or filter state —
// <details> only hides content visually, it stays in the DOM.
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

  // each sector's share of the whole (unfiltered) universe — stays stable
  // while the user filters, so the bar always reflects real composition.
  const sectorSharePct = useMemo(() => {
    const total = universe.length;
    const shares = new Map<string, number>();
    if (total === 0) return shares;
    for (const [sector, tickers] of groupBySector(universe)) {
      shares.set(sector, (tickers.length / total) * 100);
    }
    return shares;
  }, [universe]);

  const filtering = filter.trim() !== "";

  const groups = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const filtered =
      query === ""
        ? universe
        : universe.filter(
            (t) =>
              t.ticker.toLowerCase().includes(query) || t.sector.toLowerCase().includes(query)
          );
    return groupBySector(filtered);
  }, [universe, filter]);

  if (universe.length === 0) return null;

  return (
    <nav className={`glass ${styles.index}`} aria-labelledby="instrument-index-h">
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
        Array.from(groups.entries()).map(([sector, tickers], index) => {
          const pct = sectorSharePct.get(sector) ?? 0;
          // uncontrolled `open`, forced via a key that only changes at the
          // filtering on/off transition — this lets the browser own toggle
          // state during normal use, while filter-matches always render
          // open and the first sector opens by default when unfiltered.
          const open = filtering ? true : index === 0 ? true : undefined;
          return (
            <details
              key={`${sector}-${filtering ? "filtered" : "all"}`}
              className={styles.group}
              open={open}
            >
              <summary className={styles.summary}>
                <span className={styles.summaryMain}>
                  <span className={styles.indicator} aria-hidden="true" />
                  <span className={`caption ${styles.groupLabel}`}>{sector}</span>
                  <span className={`num ${styles.count}`}>{tickers.length}</span>
                </span>
                <span className={styles.track} aria-hidden="true">
                  <span className={styles.fill} style={{ width: `${pct}%` }} />
                </span>
              </summary>
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
            </details>
          );
        })
      )}
    </nav>
  );
}
