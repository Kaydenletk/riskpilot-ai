"use client";

import { useState } from "react";
import Link from "next/link";

import { serializeCompare, toggleCompare, MAX_COMPARE } from "@/lib/compare";
import type { TickerOption } from "@/lib/types";

import { SearchPalette } from "./SearchPalette";
import styles from "./search-palette.module.css";

export function SearchWithCompare({ universe }: { universe: TickerOption[] }) {
  const [compareSet, setCompareSet] = useState<string[]>([]);
  return (
    <>
      <SearchPalette
        universe={universe}
        compareSet={compareSet}
        onToggleCompare={(t) => setCompareSet((s) => toggleCompare(s, t))}
      />
      {compareSet.length > 0 && (
        <div className={styles.tray} role="status">
          <span className="caption">Compare ({compareSet.length}/{MAX_COMPARE})</span>
          {compareSet.map((t) => (
            <button
              key={t}
              className={styles.chip}
              onClick={() => setCompareSet((s) => toggleCompare(s, t))}
              title="Remove"
            >
              <span className="num">{t}</span> ✕
            </button>
          ))}
          <Link className={styles.trayGo} href={`/compare?t=${serializeCompare(compareSet)}`}>
            Compare →
          </Link>
        </div>
      )}
    </>
  );
}
