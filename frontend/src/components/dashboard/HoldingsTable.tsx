"use client";

import { useMemo, useState } from "react";

import type { Holding } from "@/lib/types";

import styles from "./holdings-table.module.css";

type SortKey = "value" | "weight";
type Dir = "asc" | "desc";

interface HoldingsTableProps {
  holdings: Holding[];
  selectedSector: string | null;
  onClearFilter: () => void;
}

export function HoldingsTable({ holdings, selectedSector, onClearFilter }: HoldingsTableProps) {
  const [key, setKey] = useState<SortKey>("value");
  const [dir, setDir] = useState<Dir>("desc");

  const total = useMemo(() => holdings.reduce((s, h) => s + h.market_value, 0) || 1, [holdings]);

  const rows = useMemo(() => {
    const filtered = selectedSector ? holdings.filter((h) => h.sector === selectedSector) : holdings;
    const sorted = [...filtered].sort((a, b) => {
      const av = key === "value" ? a.market_value : a.market_value / total;
      const bv = key === "value" ? b.market_value : b.market_value / total;
      return dir === "desc" ? bv - av : av - bv;
    });
    return sorted;
  }, [holdings, selectedSector, key, dir, total]);

  function sortOn(k: SortKey) {
    if (k === key) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setKey(k); setDir("desc"); }
  }

  const ariaSort = (k: SortKey): "ascending" | "descending" | "none" =>
    k === key ? (dir === "desc" ? "descending" : "ascending") : "none";

  return (
    <div>
      {selectedSector && (
        <div className={styles.filterRow}>
          <span className="caption">Filtered: {selectedSector}</span>
          <button className={styles.clear} onClick={onClearFilter}>clear ✕</button>
        </div>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Sector</th>
            <th className={styles.right} aria-sort={ariaSort("value")}>
              <button className={styles.sortBtn} onClick={() => sortOn("value")}>
                Value {key === "value" ? (dir === "desc" ? "↓" : "↑") : ""}
              </button>
            </th>
            <th className={styles.right} aria-sort={ariaSort("weight")}>
              <button className={styles.sortBtn} onClick={() => sortOn("weight")}>
                Weight {key === "weight" ? (dir === "desc" ? "↓" : "↑") : ""}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => {
            const w = (100 * h.market_value) / total;
            return (
              <tr key={h.ticker}>
                <td className="num">{h.ticker}</td>
                <td>{h.sector}</td>
                <td className={`num ${styles.right}`}>${h.market_value.toLocaleString()}</td>
                <td className={styles.right}>
                  <span className="num">{w.toFixed(1)}%</span>
                  <span className={styles.bar} aria-hidden>
                    <span className={styles.barFill} style={{ width: `${Math.min(100, w)}%`, display: "block" }} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
