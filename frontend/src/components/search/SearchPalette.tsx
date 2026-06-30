"use client";

// A hand-rolled command palette (no cmdk) — keeps the landing bundle inside the
// 150KB budget and the keyboard handling explicit. Searches the allow-listed
// universe only; selecting a ticker routes to its risk read. ⌘K / Ctrl-K opens,
// Esc closes, ↑/↓ move, Enter selects.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import type { TickerOption } from "@/lib/types";

import styles from "./search-palette.module.css";

interface SearchPaletteProps {
  universe: TickerOption[];
}

// rank: exact ticker prefix first, then ticker substring, then sector match
function rank(options: TickerOption[], query: string): TickerOption[] {
  const q = query.trim().toUpperCase();
  if (!q) return options;
  const scored = options
    .map((o) => {
      const t = o.ticker.toUpperCase();
      const sec = o.sector.toUpperCase();
      let score = -1;
      if (t === q) score = 100;
      else if (t.startsWith(q)) score = 80;
      else if (t.includes(q)) score = 50;
      else if (sec.includes(q)) score = 20;
      return { o, score };
    })
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score || a.o.ticker.localeCompare(b.o.ticker));
  return scored.map((s) => s.o);
}

export function SearchPalette({ universe }: SearchPaletteProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => rank(universe, query), [universe, query]);

  // Portal target only exists client-side; flip after first paint.
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const go = useCallback(
    (ticker: string) => {
      close();
      router.push(`/ticker/${ticker.toLowerCase()}`);
    },
    [close, router],
  );

  // global ⌘K / Ctrl-K to open, "/" as a secondary shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (k === "/" && !open && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      // focus after the panel paints
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // keep the active row clamped + scrolled into view as results change
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
  }, [results.length]);

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active];
      if (pick) go(pick.ticker);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  return (
    <>
      <button className={styles.trigger} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <SearchIcon />
        <span className={styles.triggerLabel}>Analyze a stock or ETF…</span>
        <kbd className={styles.kbd}>⌘K</kbd>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div className={styles.overlay} onClick={close} role="presentation">
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Search the risk universe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.searchRow}>
              <SearchIcon />
              <input
                ref={inputRef}
                className={styles.input}
                value={query}
                placeholder="Ticker or sector — e.g. NVDA, AAPL, energy"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                role="combobox"
                aria-expanded
                aria-controls="search-results"
                aria-activedescendant={results[active] ? `opt-${results[active].ticker}` : undefined}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className={styles.kbd}>esc</kbd>
            </div>

            {results.length === 0 ? (
              <div className={styles.empty}>
                <p>
                  <span className="num">&ldquo;{query}&rdquo;</span> isn&apos;t in the demo universe.
                </p>
                <p className={styles.emptyHint}>
                  Search is bounded to a fixed, vetted list — which is also the
                  prompt-injection boundary. Try a name below.
                </p>
              </div>
            ) : (
              <ul className={styles.results} id="search-results" role="listbox" ref={listRef}>
                {results.map((o, i) => (
                  <li
                    key={o.ticker}
                    id={`opt-${o.ticker}`}
                    role="option"
                    aria-selected={i === active}
                    className={`${styles.option} ${i === active ? styles.optionActive : ""}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(o.ticker)}
                  >
                    <span className={`num ${styles.optTicker}`}>{o.ticker}</span>
                    <span className={styles.optSector}>{o.sector}</span>
                    <span className={styles.optGo} aria-hidden>
                      ↵
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.footer}>
              <span className="caption">{results.length} instruments</span>
              <span className="caption">↑↓ navigate · ↵ open · esc close</span>
            </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || t.isContentEditable;
}

function SearchIcon() {
  return (
    <svg
      className={styles.icon}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
