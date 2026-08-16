// Pure, immutable state logic for the /analyze portfolio builder and
// what-if weight sliders: add/remove holdings, weight setting with
// proportional rebalance + locks, and URL serialize/parse.
//
// UI state only — every function here returns brand-new arrays/objects and
// never mutates its inputs. The backend engine independently re-validates
// any portfolio it receives (see portfolio-schema.ts); nothing here is a
// correctness or security boundary by itself.
//
// Invariant: after any mutation that leaves >=1 row, weights sum to exactly
// 100 (+/- 1e-9). Every weight is kept on a 0.1 step (roundTo01) and any
// leftover rounding drift is absorbed into the largest UNLOCKED row (or the
// largest row overall in the rare case nothing is unlocked) via absorbDrift.

import type { Holding } from "./types";

export interface PortfolioRow {
  ticker: string;
  weightPct: number;
  locked: boolean;
}

const MIN_ROW_WEIGHT = 0.5;

function sum(nums: readonly number[]): number {
  return nums.reduce((total, n) => total + n, 0);
}

/** Round to the nearest 0.1 step, normalizing -0 to 0. */
function roundTo01(n: number): number {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? 0 : r;
}

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

// Forces the row set back onto the sum-to-100 invariant after independent
// per-row rounding may have left a small drift. Picks the largest unlocked
// row to eat the drift (first-seen wins ties); if every row is locked, the
// largest row overall eats it instead — the only other spot besides
// addHolding's all-locked branch where a locked row's weight can move.
function absorbDrift(rows: PortfolioRow[]): PortfolioRow[] {
  if (rows.length === 0) return rows;
  const drift = roundTo01(100 - sum(rows.map((r) => r.weightPct)));
  if (drift === 0) return rows;

  const unlockedIdx = rows.reduce<number[]>((acc, r, i) => {
    if (!r.locked) acc.push(i);
    return acc;
  }, []);
  const pool = unlockedIdx.length > 0 ? unlockedIdx : rows.map((_, i) => i);

  let targetIdx = pool[0];
  for (const i of pool) {
    if (rows[i].weightPct > rows[targetIdx].weightPct) targetIdx = i;
  }

  return rows.map((r, i) =>
    i === targetIdx ? { ...r, weightPct: roundTo01(r.weightPct + drift) } : r,
  );
}

export function addHolding(rows: readonly PortfolioRow[], ticker: string): PortfolioRow[] {
  const t = normalizeTicker(ticker);
  if (!t || rows.some((r) => r.ticker === t)) return rows as PortfolioRow[];
  if (rows.length === 0) return [{ ticker: t, weightPct: 100, locked: false }];

  const lockedRows = rows.filter((r) => r.locked);
  const unlockedRows = rows.filter((r) => !r.locked);
  const lockedSum = sum(lockedRows.map((r) => r.weightPct));

  if (unlockedRows.length === 0) {
    // No unlocked space at all: add at the floor weight and shrink every
    // (locked) row proportionally. The only other case locks move.
    const shrink = (100 - MIN_ROW_WEIGHT) / lockedSum;
    const shrunk = rows.map((r) => ({ ...r, weightPct: roundTo01(r.weightPct * shrink) }));
    return absorbDrift([...shrunk, { ticker: t, weightPct: MIN_ROW_WEIGHT, locked: false }]);
  }

  // Equal share of the UNLOCKED pool only (not literal 100/(n+1)) so locked
  // rows are left untouched and the invariant holds even when locked rows
  // already claim part of the 100. Reduces to 100/(n+1) when nothing's locked.
  const unlockedPool = 100 - lockedSum;
  const unlockedSumBefore = sum(unlockedRows.map((r) => r.weightPct));
  const desired = unlockedPool / (unlockedRows.length + 1);
  const newWeight = Math.max(MIN_ROW_WEIGHT, desired);
  const remainingForOthers = unlockedPool - newWeight;

  const updated = rows.map((r) => {
    if (r.locked) return { ...r };
    const share =
      unlockedSumBefore > 0 ? r.weightPct / unlockedSumBefore : 1 / unlockedRows.length;
    return { ...r, weightPct: roundTo01(remainingForOthers * share) };
  });

  return absorbDrift([...updated, { ticker: t, weightPct: roundTo01(newWeight), locked: false }]);
}

export function removeHolding(rows: readonly PortfolioRow[], ticker: string): PortfolioRow[] {
  const t = normalizeTicker(ticker);
  const idx = rows.findIndex((r) => r.ticker === t);
  if (idx === -1) return rows as PortfolioRow[];

  const removed = rows[idx];
  const remaining = rows.filter((_, i) => i !== idx).map((r) => ({ ...r }));
  if (remaining.length === 0) return [];

  const unlockedRemaining = remaining.filter((r) => !r.locked);
  const pool = unlockedRemaining.length > 0 ? unlockedRemaining : remaining;
  const poolTickers = new Set(pool.map((r) => r.ticker));
  const poolSum = sum(pool.map((r) => r.weightPct));

  const updated = remaining.map((r) => {
    if (!poolTickers.has(r.ticker)) return r;
    const share = poolSum > 0 ? r.weightPct / poolSum : 1 / pool.length;
    return { ...r, weightPct: roundTo01(r.weightPct + removed.weightPct * share) };
  });

  return absorbDrift(updated);
}

export function setWeight(
  rows: readonly PortfolioRow[],
  ticker: string,
  weightPct: number,
): PortfolioRow[] {
  const t = normalizeTicker(ticker);
  const idx = rows.findIndex((r) => r.ticker === t);
  if (idx === -1) return rows as PortfolioRow[];

  const others = rows.filter((_, i) => i !== idx);
  const lockedOthers = others.filter((r) => r.locked);
  const unlockedOthers = others.filter((r) => !r.locked);
  const lockedSum = sum(lockedOthers.map((r) => r.weightPct));

  // Leave at least MIN_ROW_WEIGHT for every unlocked other row. Locked
  // *other* rows never move; the target itself is always writable here,
  // even if it happens to be locked (dragging its own slider is allowed).
  const maxWeight = 100 - lockedSum - MIN_ROW_WEIGHT * unlockedOthers.length;
  const targetWeight = roundTo01(Math.min(Math.max(weightPct, MIN_ROW_WEIGHT), maxWeight));

  const remainder = roundTo01(100 - lockedSum - targetWeight);
  const unlockedSumBefore = sum(unlockedOthers.map((r) => r.weightPct));
  const updatedOthers = new Map(
    others.map((r) => {
      if (r.locked) return [r.ticker, { ...r }] as const;
      const share =
        unlockedSumBefore > 0 ? r.weightPct / unlockedSumBefore : 1 / unlockedOthers.length;
      return [r.ticker, { ...r, weightPct: roundTo01(remainder * share) }] as const;
    }),
  );

  const result = rows.map((r) =>
    r.ticker === t ? { ...r, weightPct: targetWeight } : updatedOthers.get(r.ticker)!,
  );
  return absorbDrift(result);
}

export function toggleLock(rows: readonly PortfolioRow[], ticker: string): PortfolioRow[] {
  const t = normalizeTicker(ticker);
  if (!rows.some((r) => r.ticker === t)) return rows as PortfolioRow[];
  return rows.map((r) => (r.ticker === t ? { ...r, locked: !r.locked } : { ...r }));
}

export function serializePortfolio(rows: readonly PortfolioRow[]): string {
  // Locked is deliberately NOT serialized — the URL stays a clean weights
  // list and locks are session-only UI state.
  return rows.map((r) => `${r.ticker}:${roundTo01(r.weightPct)}`).join(",");
}

const PARSE_SEGMENT = /^([A-Z.]{1,6}):(\d+(?:\.\d+)?)$/;

export function parsePortfolio(s: string): PortfolioRow[] {
  if (!s) return [];
  const out: PortfolioRow[] = [];
  for (const segment of s.split(",")) {
    const match = PARSE_SEGMENT.exec(segment);
    if (!match) continue;
    const weightPct = Number(match[2]);
    if (!(weightPct > 0 && weightPct <= 100)) continue;
    out.push({ ticker: match[1], weightPct, locked: false });
  }
  return out;
}

export function totalWeight(rows: readonly PortfolioRow[]): number {
  return sum(rows.map((r) => r.weightPct));
}

// Derives percent weights from a report's computed market values. Rounded to
// 0.1 — well inside the /score sum tolerance of ±0.5. Shared by the /analyze
// what-if panel and the homepage live strip so both start from an identical
// baseline for the same report.
export function rowsFromHoldings(holdings: readonly Holding[]): PortfolioRow[] {
  const total = holdings.reduce((sumVal, h) => sumVal + h.market_value, 0);
  if (total <= 0) return [];
  return holdings.map((h) => ({
    ticker: h.ticker,
    weightPct: Math.round((h.market_value / total) * 1000) / 10,
    locked: false,
  }));
}
