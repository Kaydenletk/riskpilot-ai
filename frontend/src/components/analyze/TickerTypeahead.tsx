"use client";

// Inline typeahead over the allow-listed universe. Same ranking ladder as the
// ⌘K SearchPalette (exact > ticker prefix > ticker substring > sector
// substring) so search behaves identically everywhere — this is just the
// non-modal shape the builder needs. Max 8 rows, full keyboard support.
import { useMemo, useRef, useState } from "react";

import type { TickerOption } from "@/lib/types";

import styles from "./portfolio-builder.module.css";

const MAX_RESULTS = 8;

interface TickerTypeaheadProps {
  universe: TickerOption[];
  /** Tickers already in the portfolio — hidden from results (no duplicates). */
  exclude: string[];
  onPick: (ticker: string) => void;
  /** True at MAX_HOLDINGS: input disabled with an explanatory hint. */
  atCapacity: boolean;
}

function rank(options: TickerOption[], query: string): TickerOption[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return options
    .map((o) => {
      const t = o.ticker.toUpperCase();
      let score = -1;
      if (t === q) score = 100;
      else if (t.startsWith(q)) score = 80;
      else if (t.includes(q)) score = 50;
      else if (o.sector.toUpperCase().includes(q)) score = 20;
      return { o, score };
    })
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score || a.o.ticker.localeCompare(b.o.ticker))
    .slice(0, MAX_RESULTS)
    .map((s) => s.o);
}

export function TickerTypeahead({ universe, exclude, onPick, atCapacity }: TickerTypeaheadProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pool = useMemo(
    () => universe.filter((o) => !exclude.includes(o.ticker)),
    [universe, exclude],
  );
  const results = useMemo(() => rank(pool, query), [pool, query]);
  const open = query.trim().length > 0;

  function pick(ticker: string) {
    onPick(ticker);
    setQuery("");
    setActive(0);
    // add → focus returns to the search box so the next ticker types straight in
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[active];
      if (hit) pick(hit.ticker);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setQuery("");
      setActive(0);
    }
  }

  return (
    <div className={styles.searchWrap}>
      <label className={`caption ${styles.searchLabel}`} htmlFor="builder-search">
        Add a holding
      </label>
      <input
        ref={inputRef}
        id="builder-search"
        className={styles.searchInput}
        value={query}
        disabled={atCapacity}
        placeholder={atCapacity ? "Portfolio is full" : "Ticker or sector — e.g. NVDA, energy"}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="builder-search-results"
        aria-activedescendant={
          open && results[active] ? `builder-opt-${results[active].ticker}` : undefined
        }
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
      />
      {atCapacity && (
        <p className={styles.hint}>Portfolio is full — remove a holding to add another.</p>
      )}
      {open && results.length > 0 && (
        <ul
          className={`glass ${styles.dropdown}`}
          id="builder-search-results"
          role="listbox"
          aria-label="Matching instruments"
        >
          {results.map((o, i) => (
            <li
              key={o.ticker}
              id={`builder-opt-${o.ticker}`}
              role="option"
              aria-selected={i === active}
              className={`${styles.option} ${i === active ? styles.optionActive : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()} /* keep focus in the input */
              onClick={() => pick(o.ticker)}
            >
              <span className={`num ${styles.optionTicker}`}>{o.ticker}</span>
              <span className={styles.optionSector}>{o.sector}</span>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && (
        <div className={`glass ${styles.noMatch}`} role="status">
          &ldquo;{query}&rdquo; isn&apos;t in the universe — search is bounded to the vetted list.
        </div>
      )}
    </div>
  );
}
