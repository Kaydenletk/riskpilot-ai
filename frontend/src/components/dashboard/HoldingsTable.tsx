"use client";

import { useMemo, useState } from "react";

import { holdingRows } from "@/lib/breakdown";
import type { Holding } from "@/lib/types";

import styles from "./holdings-table.module.css";

type SortKey = "weight" | "ticker";

interface HoldingsTableProps {
  holdings: Holding[];
  onSelectSector?: (sector: string | null) => void;
}

// Sortable spec-sheet of holdings. Weights are exact client-side arithmetic
// (holdingRows); no risk math here. Selecting a row toggles its sector for the
// caller (e.g. to filter allocation).
export function HoldingsTable({ holdings, onSelectSector }: HoldingsTableProps) {
  const [sort, setSort] = useState<SortKey>("weight");
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(() => {
    const base = holdingRows(holdings);
    return sort === "ticker"
      ? [...base].sort((a, b) => a.ticker.localeCompare(b.ticker))
      : base;
  }, [holdings, sort]);

  function selectSector(sector: string) {
    const next = selected === sector ? null : sector;
    setSelected(next);
    onSelectSector?.(next);
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>
            <button className={styles.sortBtn} onClick={() => setSort("ticker")}>
              Ticker
            </button>
          </th>
          <th>Sector</th>
          <th className={styles.right}>
            <button className={styles.sortBtn} onClick={() => setSort("weight")}>
              Weight
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.ticker}
            className={selected === r.sector ? styles.rowSelected : ""}
            onClick={() => selectSector(r.sector)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectSector(r.sector);
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={selected === r.sector}
            aria-label={`Filter allocation by ${r.sector}`}
          >
            <td className={`num ${styles.ticker}`}>{r.ticker}</td>
            <td className={styles.sector}>{r.sector}</td>
            <td className={`num ${styles.right}`}>{r.weightPct.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
