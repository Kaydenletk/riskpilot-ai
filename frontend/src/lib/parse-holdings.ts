// Pure CSV → Holding[] parser/validator. No risk math — just exact field
// validation at the upload boundary. Never trusts external text.
import type { Holding } from "@/lib/types";

export interface RowError {
  row: number; // 1-based over data rows (header excluded)
  message: string;
}

export type ParseResult =
  | { ok: true; holdings: Holding[] }
  | { ok: false; errors: RowError[] };

export const MAX_HOLDINGS = 50;

const HEADER_FIRST_CELL = "ticker";

function isHeaderRow(cells: string[]): boolean {
  return cells[0]?.trim().toLowerCase() === HEADER_FIRST_CELL;
}

export function parseHoldings(csv: string): ParseResult {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { ok: false, errors: [{ row: 0, message: "No holdings found — the input is empty." }] };
  }

  let dataLines = lines;
  if (isHeaderRow(lines[0].split(","))) {
    dataLines = lines.slice(1);
  }

  if (dataLines.length === 0) {
    return { ok: false, errors: [{ row: 0, message: "No holdings found after the header." }] };
  }

  if (dataLines.length > MAX_HOLDINGS) {
    return {
      ok: false,
      errors: [{ row: 0, message: `Too many holdings: max is ${MAX_HOLDINGS}, got ${dataLines.length}.` }],
    };
  }

  const holdings: Holding[] = [];
  const errors: RowError[] = [];

  dataLines.forEach((line, i) => {
    const row = i + 1;
    const cells = line.split(",").map((c) => c.trim());
    if (cells.length !== 4) {
      errors.push({ row, message: `Expected 4 columns (ticker, shares, sector, market_value), got ${cells.length}.` });
      return;
    }
    const [tickerRaw, sharesRaw, sectorRaw, mvRaw] = cells;
    const ticker = tickerRaw.toUpperCase();
    if (!ticker) {
      errors.push({ row, message: "ticker is required." });
      return;
    }
    const shares = Number(sharesRaw);
    if (!Number.isFinite(shares) || shares <= 0) {
      errors.push({ row, message: `shares "${sharesRaw}" must be a positive number.` });
      return;
    }
    if (!sectorRaw) {
      errors.push({ row, message: "sector is required." });
      return;
    }
    const market_value = Number(mvRaw);
    if (!Number.isFinite(market_value) || market_value <= 0) {
      errors.push({ row, message: `market_value "${mvRaw}" must be a positive number.` });
      return;
    }
    holdings.push({ ticker, shares, sector: sectorRaw, market_value });
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, holdings };
}
