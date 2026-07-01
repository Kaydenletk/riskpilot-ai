# More-Functional UI Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four user-facing capabilities to the RiskPilot AI frontend — upload-your-own-portfolio, multi-ticker compare, interactive holdings/allocation, and an opt-in dark theme — without reimplementing risk math or breaking the server-only secret topology.

**Architecture:** Next.js 15 App Router + React 19, no CSS framework (oklch token system in `globals.css`, CSS Modules per component). Risk numbers come only from the private Python engine via server-only clients; new uploads POST through a same-origin API route that holds the secret. Compare + interactivity are pure frontend over committed fixtures. Dark mode is a token override block toggled by `data-theme`.

**Tech Stack:** TypeScript (strict), React 19, Next 15.5, Vitest (new, unit), Playwright (new, E2E). No new runtime deps.

## Global Constraints

- Node `>=20`; Next `15.5.19`; React `19.0.0`. Do not bump.
- **No new runtime dependencies.** Test tooling is `devDependencies` only.
- **Single source of truth for risk math.** Never compute volatility / drawdown / risk_score / beta in TS. Concentration % and sector % are exact arithmetic and MAY be computed client-side.
- **Server-only secret.** `INTERNAL_SHARED_SECRET_FRONTEND` and `BACKEND_INTERNAL_URL` never appear in client code or `NEXT_PUBLIC_*`. New backend calls go through `lib/backend.ts` (has `import "server-only"`) called from a route handler.
- Import alias: `@/*` → `frontend/src/*`.
- Reuse the design system: tokens, `.num`, `.caption`, `.stage`/`.stage-N` entrance, `riskVar()` / `riskColorForScore()`, `RiskGauge`, `GroundedText`. No new palette hues.
- Motion: animate `transform` / `opacity` only; honor `prefers-reduced-motion`.
- **Light is the default theme.** Dark mode is opt-in.
- Run frontend commands from `frontend/`; backend commands (Task 3) from `backend/` with `pytest`. Use `npx` for vitest/playwright.
- **Universe bound:** only the 11 priced tickers in `backend/.../dataset.py _ASSETS` (excluding SPY) can be scored. Uploaded unknown tickers are rejected, not faked — the same allow-list boundary as single-ticker search.
- Copy discipline: never state or imply buy/sell advice; keep "illustrative / sample data" framing.

---

## File Structure

**New files (backend)**
- `backend/src/riskpilot/risk_engine/portfolio.py` — `compute_report(shares)` over the known universe + `UnknownHolding`.
- `backend/tests/test_portfolio.py` — engine unit tests.

**New files (frontend)**
- `frontend/vitest.config.ts` — Vitest config (jsdom, `@/` alias).
- `frontend/src/components/layout/Masthead.tsx` — shared masthead (analyze link + theme toggle) used by all routes.
- `frontend/src/lib/parse-holdings.ts` — pure CSV parser/validator.
- `frontend/src/lib/parse-holdings.test.ts` — unit tests.
- `frontend/src/lib/breakdown.ts` — exact (non-modeled) concentration/sector math for the offline panel.
- `frontend/src/lib/breakdown.test.ts` — unit tests.
- `frontend/src/lib/compare.ts` — pure compare-set helpers (add/remove/serialize URL).
- `frontend/src/lib/compare.test.ts` — unit tests.
- `frontend/src/app/analyze/page.tsx` — upload page (client).
- `frontend/src/app/analyze/analyze.module.css`
- `frontend/src/app/compare/page.tsx` — compare page (server).
- `frontend/src/components/compare/CompareGrid.tsx` + `compare.module.css`
- `frontend/src/components/dashboard/HoldingsTable.tsx` + `holdings-table.module.css`
- `frontend/src/components/theme/ThemeToggle.tsx` + `theme-toggle.module.css`
- `frontend/playwright.config.ts` + `frontend/e2e/*.spec.ts`

**Modified files**
- `frontend/package.json` — scripts + devDeps.
- `frontend/src/app/api/report/route.ts` — add `POST`.
- `frontend/src/lib/backend.ts` — add `analyzePortfolio()`.
- `frontend/src/components/dashboard/RiskGauge.tsx` + `risk-gauge.module.css` — optional `size` prop.
- `frontend/src/components/dashboard/AllocationBar.tsx` + `allocation-bar.module.css` — hover-drill + `onSelectSector`.
- `frontend/src/components/dashboard/AnalystView.tsx` — holdings table + filter wiring + tile→factor links.
- `frontend/src/components/search/SearchPalette.tsx` + `search-palette.module.css` — add-to-compare.
- `frontend/src/app/page.tsx` + `page.module.css` — masthead link to `/analyze`, compare tray, theme toggle.
- `frontend/src/app/layout.tsx` — no-flash theme script + `suppressHydrationWarning`.
- `frontend/src/app/globals.css` — `[data-theme="dark"]` token block.

---

## Task 0: Test tooling setup

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run test:watch`, `npm run e2e`. Vitest resolves `@/` to `src/`, environment `jsdom`.

- [ ] **Step 1: Install dev dependencies**

Run (from `frontend/`):
```bash
npm i -D vitest@^2 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @vitejs/plugin-react@^4 @playwright/test@^1
```
Expected: installs, `package-lock.json` updates. No runtime deps added.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

- [ ] **Step 3: Add scripts to `package.json`**

Add to the `"scripts"` block:
```json
"test": "vitest run",
"test:watch": "vitest",
"e2e": "playwright test"
```

- [ ] **Step 4: Smoke-test the runner**

Create a throwaway `src/lib/_smoke.test.ts`:
```ts
import { test, expect } from "vitest";
test("runner works", () => { expect(1 + 1).toBe(2); });
```
Run: `npm test`
Expected: 1 passed. Then delete `src/lib/_smoke.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts
git commit -m "chore: add vitest + playwright test tooling"
```

---

## Task 1: CSV holdings parser/validator

**Files:**
- Create: `frontend/src/lib/parse-holdings.ts`
- Test: `frontend/src/lib/parse-holdings.test.ts`

**Interfaces:**
- Consumes: `Holding` from `@/lib/types`.
- Produces:
  ```ts
  interface RowError { row: number; message: string }
  type ParseResult =
    | { ok: true; holdings: Holding[] }
    | { ok: false; errors: RowError[] };
  const MAX_HOLDINGS = 50;
  function parseHoldings(csv: string): ParseResult;
  ```
  Accepts an optional header row (`ticker,shares,sector,market_value` in any case). `row` is 1-based over **data** rows (header excluded).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, test, expect } from "vitest";
import { parseHoldings, MAX_HOLDINGS } from "@/lib/parse-holdings";

describe("parseHoldings", () => {
  test("parses a valid rows-only CSV", () => {
    const r = parseHoldings("NVDA,40,Technology,3615.46\nKO,30,Consumer Staples,1722.63");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.holdings).toEqual([
        { ticker: "NVDA", shares: 40, sector: "Technology", market_value: 3615.46 },
        { ticker: "KO", shares: 30, sector: "Consumer Staples", market_value: 1722.63 },
      ]);
    }
  });

  test("tolerates a header row in any case", () => {
    const r = parseHoldings("Ticker,Shares,Sector,Market_Value\nNVDA,40,Technology,3615.46");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.holdings).toHaveLength(1);
  });

  test("trims whitespace and uppercases the ticker", () => {
    const r = parseHoldings("  nvda , 40 , Technology , 3615.46 ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.holdings[0].ticker).toBe("NVDA");
  });

  test("ignores blank lines", () => {
    const r = parseHoldings("NVDA,40,Technology,3615.46\n\n\nKO,30,Consumer Staples,1722.63\n");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.holdings).toHaveLength(2);
  });

  test("reports a non-numeric market_value with the data-row number", () => {
    const r = parseHoldings("NVDA,40,Technology,abc");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0].row).toBe(1);
      expect(r.errors[0].message).toMatch(/market_value/i);
    }
  });

  test("rejects an empty ticker", () => {
    const r = parseHoldings(",40,Technology,3615.46");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/ticker/i);
  });

  test("rejects non-positive shares", () => {
    const r = parseHoldings("NVDA,0,Technology,3615.46");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/shares/i);
  });

  test("rejects a row with the wrong column count", () => {
    const r = parseHoldings("NVDA,40,Technology");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/columns|fields/i);
  });

  test("rejects empty input", () => {
    const r = parseHoldings("   \n  ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(/no holdings|empty/i);
  });

  test("enforces the MAX_HOLDINGS cap", () => {
    const line = "NVDA,40,Technology,3615.46";
    const csv = Array.from({ length: MAX_HOLDINGS + 1 }, () => line).join("\n");
    const r = parseHoldings(csv);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toMatch(new RegExp(`${MAX_HOLDINGS}`));
  });

  test("collects multiple row errors", () => {
    const r = parseHoldings(",40,Technology,3615.46\nNVDA,xx,Technology,3615.46");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/parse-holdings.test.ts`
Expected: FAIL ("Failed to resolve import" / `parseHoldings is not a function`).

- [ ] **Step 3: Implement `parse-holdings.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/parse-holdings.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/parse-holdings.ts frontend/src/lib/parse-holdings.test.ts
git commit -m "feat: CSV holdings parser/validator with row-level errors"
```

---

## Task 2: Exact breakdown helper (offline panel math)

**Files:**
- Create: `frontend/src/lib/breakdown.ts`
- Test: `frontend/src/lib/breakdown.test.ts`

**Interfaces:**
- Consumes: `Holding` from `@/lib/types`.
- Produces:
  ```ts
  interface SectorWeight { sector: string; pct: number } // pct 0..100, 1 decimal
  interface Breakdown {
    total: number;
    sectors: SectorWeight[];          // desc by pct
    concentrationTop3Pct: number;     // sum of 3 largest holdings by market_value
    largestSector: string;
    largestSectorPct: number;
  }
  function computeBreakdown(holdings: Holding[]): Breakdown;
  ```
  Only exact arithmetic over `market_value` — NOT volatility/score/beta.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, test, expect } from "vitest";
import { computeBreakdown } from "@/lib/breakdown";
import type { Holding } from "@/lib/types";

const H = (ticker: string, sector: string, mv: number): Holding => ({
  ticker, sector, shares: 1, market_value: mv,
});

describe("computeBreakdown", () => {
  test("computes total and sector weights summing to ~100", () => {
    const b = computeBreakdown([H("A", "Tech", 60), H("B", "Tech", 20), H("C", "Energy", 20)]);
    expect(b.total).toBe(100);
    expect(b.largestSector).toBe("Tech");
    expect(b.largestSectorPct).toBe(80);
    const sum = b.sectors.reduce((s, x) => s + x.pct, 0);
    expect(Math.round(sum)).toBe(100);
  });

  test("top-3 concentration uses the 3 largest holdings", () => {
    const b = computeBreakdown([
      H("A", "Tech", 50), H("B", "Tech", 30), H("C", "Energy", 15), H("D", "Energy", 5),
    ]);
    expect(b.concentrationTop3Pct).toBe(95); // (50+30+15)/100
  });

  test("handles fewer than 3 holdings", () => {
    const b = computeBreakdown([H("A", "Tech", 70), H("B", "Energy", 30)]);
    expect(b.concentrationTop3Pct).toBe(100);
  });

  test("empty input yields zeros, no divide-by-zero", () => {
    const b = computeBreakdown([]);
    expect(b.total).toBe(0);
    expect(b.concentrationTop3Pct).toBe(0);
    expect(b.sectors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/breakdown.test.ts`
Expected: FAIL (`computeBreakdown is not a function`).

- [ ] **Step 3: Implement `breakdown.ts`**

```ts
// Exact, non-modeled portfolio arithmetic for the upload offline panel.
// Concentration % and sector % are pure division — safe to compute client-side.
// Risk score / volatility / drawdown / beta are NOT here (engine-only).
import type { Holding } from "@/lib/types";

export interface SectorWeight {
  sector: string;
  pct: number; // 0..100, one decimal
}

export interface Breakdown {
  total: number;
  sectors: SectorWeight[];
  concentrationTop3Pct: number;
  largestSector: string;
  largestSectorPct: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeBreakdown(holdings: Holding[]): Breakdown {
  const total = holdings.reduce((s, h) => s + h.market_value, 0);
  if (total <= 0) {
    return { total: 0, sectors: [], concentrationTop3Pct: 0, largestSector: "", largestSectorPct: 0 };
  }

  const bySector = new Map<string, number>();
  for (const h of holdings) {
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.market_value);
  }
  const sectors: SectorWeight[] = [...bySector.entries()]
    .map(([sector, value]) => ({ sector, pct: round1((100 * value) / total) }))
    .sort((a, b) => b.pct - a.pct);

  const top3 = [...holdings]
    .sort((a, b) => b.market_value - a.market_value)
    .slice(0, 3)
    .reduce((s, h) => s + h.market_value, 0);

  return {
    total,
    sectors,
    concentrationTop3Pct: round1((100 * top3) / total),
    largestSector: sectors[0]?.sector ?? "",
    largestSectorPct: sectors[0]?.pct ?? 0,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/breakdown.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/breakdown.ts frontend/src/lib/breakdown.test.ts
git commit -m "feat: exact sector/concentration breakdown helper"
```

---

## Task 3: Python engine — `POST /report` for arbitrary holdings

> **Confirmed gap (review CRITICAL #1):** the FastAPI app currently exposes only `GET /health`, `/report/sample`, `/tickers`, `/analyze/{ticker}`. There is NO `POST /report`. The engine only has `compute_sample_report()` (zero-arg, hardcoded 5 tickers). This task builds the missing endpoint so uploaded portfolios can actually be scored. **Universe bound:** only the 11 tickers in `dataset.py _ASSETS` (excluding SPY) have price series — unknown tickers are rejected `422` listing the offending symbols (same allow-list boundary the rest of the app enforces). The uploaded `sector` field is ignored; the engine uses its own `sector_of()` so sectors always match the priced universe.

**Files:**
- Create: `backend/src/riskpilot/risk_engine/portfolio.py`
- Modify: `backend/src/riskpilot/risk_engine/__init__.py` (export `compute_report`, `UnknownHolding`)
- Modify: `backend/src/riskpilot/report.py` (add `build_report_from_holdings`)
- Modify: `backend/src/riskpilot/main.py` (add `POST /report`)
- Test: `backend/tests/test_portfolio.py`, extend `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `metrics` (`m.value_weights`, `m.top_n_concentration_pct`, `m.portfolio_volatility`, `m.portfolio_value_series`, `m.max_drawdown_pct`), `score` (`sc.composite_risk_score`, `sc.band_for_score`), `load_prices`, `sector_of`, `available_tickers` from `risk_engine`; `Holding`, `RiskFacts`, `RiskReport` from `schema`; `explain` from `llm`.
- Produces:
  ```python
  # risk_engine/portfolio.py
  class UnknownHolding(ValueError): ...   # carries .symbols: list[str]
  def compute_report(shares: dict[str, float]) -> tuple[list[Holding], RiskFacts]
  # report.py
  def build_report_from_holdings(config, shares: dict[str, float]) -> RiskReport
  ```
  Route `POST /report` (secret-guarded) body `{"holdings":[{"ticker","shares",...}]}` → `200 RiskReport` | `422 {"detail":{"error":"unknown_tickers","symbols":[...]}}` | `400` on empty/over-cap.

- [ ] **Step 1: Write the failing engine test**

Create `backend/tests/test_portfolio.py`:
```python
"""compute_report scores arbitrary holdings over the known universe."""
from __future__ import annotations

import pytest

from riskpilot.risk_engine.portfolio import UnknownHolding, compute_report


def test_known_tickers_produce_facts() -> None:
    holdings, facts = compute_report({"NVDA": 40, "KO": 30, "JNJ": 8})
    assert {h.ticker for h in holdings} == {"NVDA", "KO", "JNJ"}
    assert 0 <= facts.risk_score <= 100
    assert facts.holdings_count == 3
    assert facts.volatility_annualized_pct >= 0
    assert facts.max_drawdown_pct <= 0
    # market_value is computed from the dataset, not passed in
    assert all(h.market_value > 0 for h in holdings)


def test_unknown_ticker_raises_with_symbols() -> None:
    with pytest.raises(UnknownHolding) as ei:
        compute_report({"NVDA": 10, "DOGE": 5, "FAKE": 1})
    assert set(ei.value.symbols) == {"DOGE", "FAKE"}


def test_empty_holdings_rejected() -> None:
    with pytest.raises(ValueError):
        compute_report({})


def test_single_holding_is_maximally_concentrated() -> None:
    _, facts = compute_report({"NVDA": 10})
    assert facts.concentration_pct_top3 == 100.0
```

- [ ] **Step 2: Run it to verify it fails**

Run (from `backend/`): `pytest tests/test_portfolio.py -v`
Expected: FAIL (`ModuleNotFoundError: ...portfolio`).

- [ ] **Step 3: Implement `risk_engine/portfolio.py`**

```python
"""Score an ARBITRARY portfolio (user upload) over the known price universe.

Mirrors sample.compute_sample_report but takes a {ticker: shares} dict. Only
tickers present in the committed dataset can be scored — anything else has no
price history, so it's rejected (the same allow-list boundary as single-ticker
analysis). market_value is COMPUTED from the dataset's latest price; the upload's
own market_value/sector are not trusted here.
"""
from __future__ import annotations

from ..schema import Holding, RiskBand, RiskFacts
from . import metrics as m
from . import score as sc
from .dataset import load_prices, sector_of
from .ticker import MARKET_INDEX, available_tickers

MIN_HOLDINGS = 1


class UnknownHolding(ValueError):
    """One or more requested tickers are not in the priced universe."""

    def __init__(self, symbols: list[str]) -> None:
        self.symbols = symbols
        super().__init__(f"not in the universe: {', '.join(symbols)}")


def _allow_set() -> set[str]:
    return {o.ticker for o in available_tickers()}  # excludes SPY (the index)


def compute_report(shares: dict[str, float]) -> tuple[list[Holding], RiskFacts]:
    if not shares:
        raise ValueError("portfolio has no holdings")

    normalized = {t.strip().upper(): float(s) for t, s in shares.items()}
    allow = _allow_set()
    unknown = sorted(t for t in normalized if t not in allow)
    if unknown:
        raise UnknownHolding(unknown)
    if any(s <= 0 for s in normalized.values()):
        raise ValueError("every holding needs positive shares")

    series = load_prices()
    latest = {t: series[t][-1] for t in normalized}
    market_values = {t: normalized[t] * latest[t] for t in normalized}

    holdings = [
        Holding(ticker=t, shares=normalized[t], sector=sector_of(t), market_value=round(market_values[t], 2))
        for t in normalized
    ]

    weights = m.value_weights(market_values)
    concentration_top3 = m.top_n_concentration_pct(market_values, n=3)
    portfolio_vol = m.portfolio_volatility(series, weights)
    value_series = m.portfolio_value_series(series, normalized)
    max_dd = m.max_drawdown_pct(value_series)

    risk_score = sc.composite_risk_score(portfolio_vol, concentration_top3, max_dd)
    band = sc.band_for_score(risk_score)

    sector_totals: dict[str, float] = {}
    for t in normalized:
        sector_totals[sector_of(t)] = sector_totals.get(sector_of(t), 0.0) + market_values[t]
    total = sum(market_values.values())
    largest_sector, largest_val = max(sector_totals.items(), key=lambda kv: kv[1])

    facts = RiskFacts(
        risk_score=risk_score,
        risk_band=RiskBand(band),
        concentration_pct_top3=concentration_top3,
        volatility_annualized_pct=round(portfolio_vol * 100.0, 1),
        max_drawdown_pct=max_dd,
        largest_sector=largest_sector,
        largest_sector_pct=round(100.0 * largest_val / total, 1),
        holdings_count=len(normalized),
    )
    return holdings, facts
```

- [ ] **Step 4: Export from `risk_engine/__init__.py`**

Replace the bottom of `backend/src/riskpilot/risk_engine/__init__.py`:
```python
from .portfolio import UnknownHolding, compute_report
from .sample import compute_sample_report

__all__ = ["compute_sample_report", "compute_report", "UnknownHolding"]
```
(Also confirm `ticker.py` defines `MARKET_INDEX` at module scope — it does (`MARKET_INDEX = "SPY"`). `portfolio.py` imports it for clarity even though `available_tickers()` already excludes it.)

- [ ] **Step 5: Run the engine test to verify it passes**

Run: `pytest tests/test_portfolio.py -v`
Expected: all PASS.

- [ ] **Step 6: Add `build_report_from_holdings` to `report.py`**

Append to `backend/src/riskpilot/report.py`:
```python
def build_report_from_holdings(config: Config, shares: dict[str, float]) -> RiskReport:
    """Score an uploaded portfolio. Raises UnknownHolding / ValueError on bad input;
    the API layer maps those to 422 / 400. Reuses the same grounded explain pipeline
    as the sample report, so the number-hallucination guardrail still applies."""
    from .risk_engine import compute_report

    holdings, facts = compute_report(shares)
    explanation = explain(config, facts)
    return RiskReport(
        portfolio_name="Your portfolio",
        as_of="illustrative sample data",
        holdings=holdings,
        facts=facts,
        explanation=explanation,
    )
```

- [ ] **Step 7: Write the failing API test, then add the route**

Add to `backend/tests/test_api.py`:
```python
def test_post_report_scores_known_holdings() -> None:
    r = client.post(
        "/report",
        headers={"x-internal-secret": SECRET},
        json={"holdings": [{"ticker": "NVDA", "shares": 40, "sector": "x", "market_value": 1},
                           {"ticker": "KO", "shares": 30, "sector": "x", "market_value": 1}]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["facts"]["holdings_count"] == 2
    assert "not financial advice" in body["disclaimer"].lower()


def test_post_report_rejects_unknown_ticker() -> None:
    r = client.post(
        "/report",
        headers={"x-internal-secret": SECRET},
        json={"holdings": [{"ticker": "DOGE", "shares": 1, "sector": "x", "market_value": 1}]},
    )
    assert r.status_code == 422
    assert "DOGE" in r.json()["detail"]["symbols"]


def test_post_report_requires_secret() -> None:
    assert client.post("/report", json={"holdings": []}).status_code == 401
```
Run: `pytest tests/test_api.py -v` → the three new tests FAIL (405/404, route absent).

Then add to `backend/src/riskpilot/main.py` — imports and the route:
```python
from pydantic import BaseModel

from .report import build_report_from_holdings, build_sample_report
from .risk_engine.portfolio import UnknownHolding
from .schema import Holding

MAX_HOLDINGS = 50


class PortfolioRequest(BaseModel):
    holdings: list[Holding]


@app.post("/report", response_model=RiskReport)
def report_from_holdings(
    body: PortfolioRequest,
    _: None = Depends(require_internal_secret),
    config: Config = Depends(get_config),
) -> RiskReport:
    """Score an uploaded portfolio. Unknown tickers -> 422 (allow-list boundary)."""
    if not body.holdings:
        raise HTTPException(status_code=400, detail={"error": "empty"})
    if len(body.holdings) > MAX_HOLDINGS:
        raise HTTPException(status_code=400, detail={"error": "too_many", "max": MAX_HOLDINGS})
    shares = {h.ticker: h.shares for h in body.holdings}
    try:
        return build_report_from_holdings(config, shares)
    except UnknownHolding as e:
        raise HTTPException(status_code=422, detail={"error": "unknown_tickers", "symbols": e.symbols}) from None
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": "invalid", "message": str(e)}) from None
```
(Note: `build_sample_report` is already imported in `main.py`; add `build_report_from_holdings` to that existing import line rather than duplicating.)

- [ ] **Step 8: Run the full backend suite**

Run: `pytest -q`
Expected: all pass (existing + 4 portfolio + 3 api).

- [ ] **Step 9: Commit**

```bash
git add backend/src/riskpilot/risk_engine/portfolio.py backend/src/riskpilot/risk_engine/__init__.py backend/src/riskpilot/report.py backend/src/riskpilot/main.py backend/tests/test_portfolio.py backend/tests/test_api.py
git commit -m "feat(engine): POST /report scores arbitrary holdings over the known universe"
```

---

## Task 4: Frontend backend client + POST /api/report

**Files:**
- Modify: `frontend/src/lib/backend.ts`
- Modify: `frontend/src/app/api/report/route.ts`

**Interfaces:**
- Consumes: the route validates the already-parsed `Holding[]` shape itself (server never trusts the client). `RiskReport`, `Holding` from `@/lib/types`. `MAX_HOLDINGS` from `@/lib/parse-holdings`. Upstream Python `POST /report` (Task 3): `200` | `422 unknown_tickers` | `400`.
- Produces:
  ```ts
  // backend.ts
  type AnalyzeResult =
    | { ok: true; report: RiskReport }
    | { ok: false; reason: "engine_unavailable" };
  function analyzePortfolio(holdings: Holding[]): Promise<AnalyzeResult>;
  ```
  Route `POST /api/report` body `{ holdings: Holding[] }` → `200 RiskReport` | `400 {error:"invalid_holdings", errors:[...]}` | `503 {error:"engine_unavailable"}`.

- [ ] **Step 1: Add `analyzePortfolio` to `backend.ts`**

Append to `frontend/src/lib/backend.ts`:
```ts
import type { Holding } from "./types";

export type AnalyzeResult =
  | { ok: true; report: RiskReport }
  | { ok: false; reason: "engine_unavailable" }
  | { ok: false; reason: "unknown_tickers"; symbols: string[] };

// POSTs validated holdings to the private engine. The shared secret stays here
// (server-only). No fixture fallback: scoring arbitrary user holdings requires
// the real engine — we never fabricate numbers for a portfolio we can't compute.
// 4000ms (vs the 2500ms sample/ticker reads) because fresh scoring + the grounded
// explain pass is slower than returning the cached sample.
export async function analyzePortfolio(holdings: Holding[]): Promise<AnalyzeResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/report`, {
      method: "POST",
      headers: { "x-internal-secret": SECRET, "content-type": "application/json" },
      body: JSON.stringify({ holdings }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return { ok: true, report: (await res.json()) as RiskReport };
    }
    if (res.status === 422) {
      const body = (await res.json()) as { detail?: { symbols?: string[] } };
      return { ok: false, reason: "unknown_tickers", symbols: body.detail?.symbols ?? [] };
    }
  } catch {
    // engine absent / timed out — reported as unavailable, never faked
  }
  return { ok: false, reason: "engine_unavailable" };
}
```

- [ ] **Step 2: Add `POST` to the route**

Replace `frontend/src/app/api/report/route.ts` with:
```ts
// Public surface. Browser -> this route (same-origin, no CORS) -> private backend.
import { NextResponse } from "next/server";

import { analyzePortfolio, fetchSampleReport } from "@/lib/backend";
import { MAX_HOLDINGS } from "@/lib/parse-holdings";
import type { Holding } from "@/lib/types";

export async function GET() {
  try {
    const report = await fetchSampleReport();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json(
      { error: "report_unavailable", message: "The risk service is temporarily unavailable." },
      { status: 503 },
    );
  }
}

function validateHoldings(value: unknown): { ok: true; holdings: Holding[] } | { ok: false; errors: string[] } {
  if (!value || typeof value !== "object" || !Array.isArray((value as { holdings?: unknown }).holdings)) {
    return { ok: false, errors: ["body must be { holdings: Holding[] }"] };
  }
  const raw = (value as { holdings: unknown[] }).holdings;
  if (raw.length === 0) return { ok: false, errors: ["holdings is empty"] };
  if (raw.length > MAX_HOLDINGS) return { ok: false, errors: [`too many holdings (max ${MAX_HOLDINGS})`] };

  const errors: string[] = [];
  const holdings: Holding[] = [];
  raw.forEach((h, i) => {
    const o = h as Record<string, unknown>;
    const ticker = typeof o.ticker === "string" ? o.ticker.trim().toUpperCase() : "";
    const sector = typeof o.sector === "string" ? o.sector.trim() : "";
    const shares = Number(o.shares);
    const market_value = Number(o.market_value);
    if (!ticker || !sector || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(market_value) || market_value <= 0) {
      errors.push(`holding ${i + 1} is invalid`);
      return;
    }
    holdings.push({ ticker, sector, shares, market_value });
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, holdings };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const v = validateHoldings(body);
  if (!v.ok) {
    return NextResponse.json({ error: "invalid_holdings", errors: v.errors }, { status: 400 });
  }
  const result = await analyzePortfolio(v.holdings);
  if (result.ok) return NextResponse.json(result.report);
  if (result.reason === "unknown_tickers") {
    return NextResponse.json(
      { error: "unknown_tickers", symbols: result.symbols, message: `Not in the demo universe: ${result.symbols.join(", ")}.` },
      { status: 422 },
    );
  }
  // mirror the GET envelope shape for the engine-down case
  return NextResponse.json(
    { error: "engine_unavailable", message: "The risk service is temporarily unavailable." },
    { status: 503 },
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify the build compiles the route**

Run: `npm run build`
Expected: build succeeds; `/api/report` appears in the route list.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/backend.ts frontend/src/app/api/report/route.ts
git commit -m "feat: POST /api/report scores uploaded holdings via the private engine"
```

---

## Task 5: /analyze upload page

**Files:**
- Create: `frontend/src/app/analyze/page.tsx`
- Create: `frontend/src/app/analyze/analyze.module.css`
- Modify: `frontend/src/app/page.tsx` (masthead link)

**Interfaces:**
- Consumes: `parseHoldings`, `MAX_HOLDINGS` (Task 1); `computeBreakdown` (Task 2); `Dashboard` (`@/components/dashboard/Dashboard`); `RiskReport`, `Holding` types. POSTs to `/api/report`.
- Produces: route `/analyze`. State machine: `idle → (parse) → errors | (POST) → result | engine-unavailable`.

- [ ] **Step 1: Implement `analyze.module.css`**

```css
.wrap { max-width: 900px; margin: 0 auto; }
.intro { margin: var(--space-3) 0; color: var(--ink-soft); max-width: 60ch; }
.box {
  background: var(--surface);
  border: 1px dashed var(--rule-strong);
  border-radius: var(--radius);
  padding: var(--space-3);
}
.label { display: block; margin-bottom: var(--space-1); }
.textarea {
  width: 100%;
  min-height: 180px;
  resize: vertical;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: var(--text-sm);
  color: var(--ink);
  background: var(--bg-grain);
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
}
.row { display: flex; gap: var(--space-2); align-items: center; margin-top: var(--space-2); flex-wrap: wrap; }
.btn {
  font: inherit;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--bg);
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease-out-expo);
}
.btn:hover { opacity: 0.88; }
.linkBtn { font: inherit; background: none; border: none; color: var(--ink-soft); text-decoration: underline; cursor: pointer; padding: 0; }
.errors { margin-top: var(--space-2); border-left: 3px solid var(--risk-high); padding-left: var(--space-2); }
.errItem { color: var(--risk-high); font-size: var(--text-sm); margin: 4px 0; }
.offline {
  margin-top: var(--space-3);
  background: var(--surface-raised);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  padding: var(--space-3);
}
.code {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: var(--text-sm);
  background: var(--bg-grain);
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  overflow-x: auto;
}
.breakdown { display: grid; gap: 6px; margin: var(--space-2) 0; }
.brow { display: flex; justify-content: space-between; font-size: var(--text-sm); }
```

- [ ] **Step 2: Implement `analyze/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

import { Dashboard } from "@/components/dashboard/Dashboard";
import { computeBreakdown } from "@/lib/breakdown";
import { parseHoldings, type RowError } from "@/lib/parse-holdings";
import type { Holding, RiskReport } from "@/lib/types";

import styles from "./analyze.module.css";
import page from "../page.module.css";

const SAMPLE = `ticker,shares,sector,market_value
NVDA,40,Technology,3615.46
AMD,60,Technology,1223.75
MSFT,10,Technology,1612.28
KO,30,Consumer Staples,1722.63
JNJ,8,Healthcare,1248.13`;

type State =
  | { kind: "idle" }
  | { kind: "errors"; errors: RowError[] }
  | { kind: "scoring" }
  | { kind: "result"; report: RiskReport }
  | { kind: "offline"; holdings: Holding[] };

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onAnalyze() {
    const parsed = parseHoldings(text);
    if (!parsed.ok) {
      setState({ kind: "errors", errors: parsed.errors });
      return;
    }
    setState({ kind: "scoring" });
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ holdings: parsed.holdings }),
      });
      if (res.ok) {
        setState({ kind: "result", report: (await res.json()) as RiskReport });
        return;
      }
      // The server REJECTED the holdings — surface why, never the "validated" panel.
      if (res.status === 400 || res.status === 422) {
        const body = (await res.json()) as { errors?: string[]; symbols?: string[]; message?: string };
        const messages: string[] =
          body.symbols && body.symbols.length
            ? [`Not in the demo universe: ${body.symbols.join(", ")}. Only the vetted ticker list can be scored.`]
            : body.errors ?? [body.message ?? "The portfolio was rejected."];
        setState({ kind: "errors", errors: messages.map((message) => ({ row: 0, message })) });
        return;
      }
      // 503 / other engine-down status: the parse was valid, the engine is just absent.
    } catch {
      // network failure — same as engine-down: fall through to the offline panel
    }
    setState({ kind: "offline", holdings: parsed.holdings });
  }

  return (
    <div className={page.page}>
      <header className={`${page.masthead} stage stage-1`}>
        <Link href="/" className={page.brand} style={{ textDecoration: "none" }}>
          RiskPilot<span className={page.brandAccent}>AI</span>
        </Link>
        <div className="caption">analyze your own holdings · figures come from the engine</div>
      </header>

      <div className={`${styles.wrap} stage stage-2`}>
        <p className={styles.intro}>
          Paste your holdings as CSV — one row per position:{" "}
          <span className="num">ticker, shares, sector, market_value</span>. Nothing is stored.
          Risk numbers are computed by the engine, never invented here.
        </p>

        <div className={styles.box}>
          <label className={`caption ${styles.label}`} htmlFor="csv">
            Holdings CSV
          </label>
          <textarea
            id="csv"
            className={styles.textarea}
            value={text}
            spellCheck={false}
            placeholder={"NVDA,40,Technology,3615.46\nKO,30,Consumer Staples,1722.63"}
            onChange={(e) => setText(e.target.value)}
          />
          <div className={styles.row}>
            <button className={styles.btn} onClick={onAnalyze} disabled={state.kind === "scoring"}>
              {state.kind === "scoring" ? "Scoring…" : "Analyze portfolio"}
            </button>
            <button className={styles.linkBtn} onClick={() => setText(SAMPLE)}>
              load the sample
            </button>
          </div>

          {state.kind === "errors" && (
            <div className={styles.errors} role="alert">
              {state.errors.map((e, i) => (
                <p key={i} className={styles.errItem}>
                  {e.row > 0 ? `Row ${e.row}: ` : ""}
                  {e.message}
                </p>
              ))}
            </div>
          )}
        </div>

        {state.kind === "result" && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <Dashboard report={state.report} />
          </div>
        )}

        {state.kind === "offline" && <OfflinePanel holdings={state.holdings} />}
      </div>
    </div>
  );
}

function OfflinePanel({ holdings }: { holdings: Holding[] }) {
  const b = computeBreakdown(holdings);
  return (
    <section className={styles.offline}>
      <div className="caption">File validated · engine not connected</div>
      <p className={styles.intro}>
        Your {holdings.length} holdings parsed cleanly. Scoring (volatility, drawdown, risk score)
        needs the private risk engine connected — these exact allocation figures are computed
        here; the modeled risk numbers are not faked. Run the engine locally to see the full read:
      </p>
      <pre className={styles.code}>{`cp .env.example .env   # no OpenAI key needed
make install && make dev`}</pre>
      <div className="caption" style={{ marginBottom: 4 }}>Exact allocation (computed here, not modeled)</div>
      <div className={styles.breakdown}>
        <div className={styles.brow}>
          <span>Top-3 holdings weight</span>
          <span className="num">{b.concentrationTop3Pct}%</span>
        </div>
        <div className={styles.brow}>
          <span>Largest sector ({b.largestSector})</span>
          <span className="num">{b.largestSectorPct}%</span>
        </div>
        {b.sectors.map((s) => (
          <div key={s.sector} className={styles.brow} style={{ color: "var(--ink-soft)" }}>
            <span>{s.sector}</span>
            <span className="num">{s.pct}%</span>
          </div>
        ))}
      </div>
      <p className="disclaimer">
        Educational risk coaching, not financial advice. No buy/sell recommendations.
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Add a link to `/analyze` from the landing masthead**

In `frontend/src/app/page.tsx`, change the `Masthead` caption block to include the link. Replace:
```tsx
      <div className="caption">risk coaching · explains the math · never invents numbers</div>
```
with:
```tsx
      <div className={styles.mastheadRight}>
        <a href="/analyze" className="caption">Analyze your portfolio →</a>
      </div>
```
And add to `page.module.css`:
```css
.mastheadRight { display: flex; align-items: baseline; gap: var(--space-2); }
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: succeeds; `/analyze` appears in the route list.

- [ ] **Step 5: Manual smoke (dev)**

Run: `npm run dev`, open `/analyze`, click "load the sample" then "Analyze portfolio".
Expected (no backend): the offline panel shows with Top-3 concentration ≈ 73.8% region and sector rows. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/analyze frontend/src/app/page.tsx frontend/src/app/page.module.css
git commit -m "feat: /analyze upload page with engine scoring + honest offline panel"
```

---

## Task 6: RiskGauge size prop

**Files:**
- Modify: `frontend/src/components/dashboard/RiskGauge.tsx`
- Modify: `frontend/src/components/dashboard/risk-gauge.module.css`

**Interfaces:**
- Produces: `RiskGauge` accepts an optional `size?: number` (default 260). Center score font scales with size. Existing call sites (no `size`) are unchanged.

- [ ] **Step 1: Replace the WHOLE component so no module-level const references the removed `SIZE`/`STROKE`**

**Delete all six module-level geometry consts** (`SIZE`, `STROKE`, `RADIUS`, `CIRC`, `SWEEP`-derived `ARC_LEN`/`GAP_LEN`). Keep only `STROKE_RATIO` and `SWEEP` at module scope; declare the rest INSIDE the component from the `size` prop. Replace the file body from the `interface RiskGaugeProps` line through the closing `}` of the component with:
```tsx
interface RiskGaugeProps {
  score: number; // 0-100
  band: RiskBand;
  size?: number; // px, default 260
}

const STROKE_RATIO = 18 / 260; // keep the original 18px stroke at size 260
const SWEEP = 0.75; // 270° arc (quarter gap at the bottom)

export function RiskGauge({ score, band, size = 260 }: RiskGaugeProps) {
  // animate from 0 to the real value on mount (compositor-friendly: stroke offset)
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(score);
      return;
    }
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const SIZE = size;
  const STROKE = Math.round(SIZE * STROKE_RATIO);
  const RADIUS = (SIZE - STROKE) / 2 - 8;
  const CIRC = 2 * Math.PI * RADIUS;
  const ARC_LEN = CIRC * SWEEP;
  const GAP_LEN = CIRC * (1 - SWEEP);

  const pct = Math.max(0, Math.min(100, shown)) / 100;
  const filled = ARC_LEN * pct;
  const offset = ARC_LEN - filled;
  const rotation = 135; // gap at the bottom, fill starts bottom-left

  return (
    <div
      className={styles.wrap}
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`Risk score ${score} of 100, ${band}`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.svg}>
        <g transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
            stroke="var(--rule-strong)" strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
          />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
            stroke={riskColorForScore(score)} strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${CIRC}`} strokeDashoffset={offset}
            className={styles.valueArc}
          />
        </g>
      </svg>

      <div className={styles.center}>
        <div className={`num ${styles.score}`} style={{ color: riskVar(band), fontSize: `${SIZE / 61}px` }}>
          {Math.round(shown)}
        </div>
        <div className={`caption ${styles.band}`} style={{ color: riskVar(band) }}>
          {band}
        </div>
        <div className="caption" style={{ marginTop: 2, opacity: 0.7 }}>
          risk score / 100
        </div>
      </div>
    </div>
  );
}
```
(`riskColorForScore` is already imported in the file — keep that import. 260/61 ≈ the original 4.25rem center score in px; small sizes scale down proportionally. This also satisfies review #13: the value arc stroke uses `riskColorForScore(score)`, so two same-band tickers still get distinct gauge colors in `/compare`.)

- [ ] **Step 2: Make the CSS width/height a fallback only**

In `risk-gauge.module.css`, the `.wrap` `width`/`height: 260px` now act as a fallback (inline style wins). Leave them; remove the fixed `.score` font-size so the inline size controls it:
```css
.score {
  font-weight: 700;
  line-height: 0.9;
}
```

- [ ] **Step 3: Typecheck + visual check existing pages**

Run: `npx tsc --noEmit && npm run build`
Expected: succeeds. Existing gauges (landing, ticker) render identically (default 260).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dashboard/RiskGauge.tsx frontend/src/components/dashboard/risk-gauge.module.css
git commit -m "feat: RiskGauge optional size prop for compact contexts"
```

---

## Task 7: Compare-set helpers

**Files:**
- Create: `frontend/src/lib/compare.ts`
- Test: `frontend/src/lib/compare.test.ts`

**Interfaces:**
- Produces:
  ```ts
  const MAX_COMPARE = 4;
  function toggleCompare(set: string[], ticker: string): string[]; // add if absent (cap), remove if present
  function serializeCompare(set: string[]): string;   // "NVDA,AMD"
  function parseCompare(param: string | null): string[]; // dedupe, uppercase, cap
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, test, expect } from "vitest";
import { toggleCompare, serializeCompare, parseCompare, MAX_COMPARE } from "@/lib/compare";

describe("compare helpers", () => {
  test("toggle adds a new ticker", () => {
    expect(toggleCompare(["NVDA"], "AMD")).toEqual(["NVDA", "AMD"]);
  });
  test("toggle removes an existing ticker", () => {
    expect(toggleCompare(["NVDA", "AMD"], "NVDA")).toEqual(["AMD"]);
  });
  test("toggle is case-insensitive on identity", () => {
    expect(toggleCompare(["NVDA"], "nvda")).toEqual([]);
  });
  test("toggle respects the cap", () => {
    const full = ["A", "B", "C", "D"];
    expect(toggleCompare(full, "E")).toEqual(full); // unchanged at cap
    expect(full.length).toBe(MAX_COMPARE);
  });
  test("serialize joins with commas", () => {
    expect(serializeCompare(["NVDA", "AMD"])).toBe("NVDA,AMD");
  });
  test("parse dedupes, uppercases, and caps", () => {
    expect(parseCompare("nvda,NVDA,amd,msft,tsla,jpm")).toEqual(["NVDA", "AMD", "MSFT", "TSLA"]);
  });
  test("parse handles null/empty", () => {
    expect(parseCompare(null)).toEqual([]);
    expect(parseCompare("")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/compare.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `compare.ts`**

```ts
// Pure helpers for the multi-ticker compare set. URL is the source of truth;
// these keep the set deduped, uppercased, and capped.
export const MAX_COMPARE = 4;

export function toggleCompare(set: string[], ticker: string): string[] {
  const t = ticker.trim().toUpperCase();
  if (!t) return set;
  if (set.includes(t)) return set.filter((x) => x !== t);
  if (set.length >= MAX_COMPARE) return set;
  return [...set, t];
}

export function serializeCompare(set: string[]): string {
  return set.join(",");
}

export function parseCompare(param: string | null): string[] {
  if (!param) return [];
  const out: string[] = [];
  for (const raw of param.split(",")) {
    const t = raw.trim().toUpperCase();
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= MAX_COMPARE) break;
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/compare.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/compare.ts frontend/src/lib/compare.test.ts
git commit -m "feat: compare-set helpers (toggle, serialize, parse, cap)"
```

---

## Task 8: /compare page + grid

**Files:**
- Create: `frontend/src/app/compare/page.tsx`
- Create: `frontend/src/components/compare/CompareGrid.tsx`
- Create: `frontend/src/components/compare/compare.module.css`

**Interfaces:**
- Consumes: `parseCompare` (Task 7); `fetchTickerReport` (`@/lib/ticker-backend`); `RiskGauge` with `size` (Task 6); `riskVar` (`@/lib/risk-color`); `TickerReport` type.
- Produces: route `/compare?t=NVDA,AMD`. Server component resolves each ticker (drops unknowns), renders `CompareGrid`.

- [ ] **Step 1: Implement `compare.module.css`**

```css
.wrap { max-width: 1100px; margin: 0 auto; }
.head { display: flex; justify-content: space-between; align-items: baseline; margin: var(--space-3) 0; flex-wrap: wrap; gap: var(--space-2); }
.grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
  gap: 1px;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  overflow: hidden;
}
.col { background: var(--surface); padding: var(--space-3); display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.ticker { font-size: var(--text-xl); font-weight: 700; letter-spacing: -0.02em; }
.facts { width: 100%; list-style: none; margin: 0; padding: 0; }
.fact { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--rule); font-size: var(--text-sm); }
.factLabel { color: var(--ink-soft); }
.empty { margin: var(--space-4) 0; color: var(--ink-soft); }
@media (max-width: 760px) { .grid { --cols: 1; } }
```

- [ ] **Step 2: Implement `CompareGrid.tsx`**

```tsx
// Side-by-side instrument comparison. Pure presentation over resolved reports.
// Each metric row tints the WORST value warm and the BEST cool so the eye can
// scan one metric across all tickers. "Worse" direction per metric:
//   volatility — higher is worse;  drawdown — more negative (smaller) is worse;
//   beta — higher absolute beta is worse (more market-amplified).
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { riskVar } from "@/lib/risk-color";
import type { TickerReport } from "@/lib/types";

import styles from "./compare.module.css";

type MetricKey = "vol" | "dd" | "beta";

// Returns the "worse" score for a metric value — higher = worse, for tinting.
function worseScore(key: MetricKey, r: TickerReport): number {
  if (key === "vol") return r.facts.volatility_annualized_pct;
  if (key === "dd") return -r.facts.max_drawdown_pct; // dd is <=0; deeper = larger positive
  return Math.abs(r.facts.beta);
}

// Tint class for a cell: warm if it's the worst across reports, cool if best.
// Only tints when there's a real spread (>1 report and max !== min).
function tintStyle(key: MetricKey, r: TickerReport, reports: TickerReport[]): React.CSSProperties {
  if (reports.length < 2) return {};
  const scores = reports.map((x) => worseScore(key, x));
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  if (max === min) return {};
  const me = worseScore(key, r);
  if (me === max) return { background: "var(--risk-high-soft)" };
  if (me === min) return { background: "var(--risk-low-soft)" };
  return {};
}

export function CompareGrid({ reports }: { reports: TickerReport[] }) {
  const cols = Math.max(1, reports.length);
  return (
    <div className={styles.grid} style={{ ["--cols" as string]: cols }}>
      {reports.map((r) => (
        <div key={r.ticker} className={styles.col}>
          <div className={`num ${styles.ticker}`} style={{ color: riskVar(r.facts.risk_band) }}>
            {r.ticker}
          </div>
          <RiskGauge score={r.facts.risk_score} band={r.facts.risk_band} size={170} />
          <ul className={styles.facts}>
            <li className={styles.fact} style={tintStyle("vol", r, reports)}>
              <span className={styles.factLabel}>Volatility</span>
              <span className="num">{r.facts.volatility_annualized_pct}%</span>
            </li>
            <li className={styles.fact} style={tintStyle("dd", r, reports)}>
              <span className={styles.factLabel}>Worst drawdown</span>
              <span className="num">{r.facts.max_drawdown_pct}%</span>
            </li>
            <li className={styles.fact} style={tintStyle("beta", r, reports)}>
              <span className={styles.factLabel}>Beta</span>
              <span className="num">{r.facts.beta.toFixed(2)}</span>
            </li>
            <li className={styles.fact}>
              <span className={styles.factLabel}>Sector</span>
              <span>{r.facts.sector}</span>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}
```
(The `--risk-*-soft` tints have dark-theme overrides in Task 11's token block, so they read in both themes — verified in Task 13 Step 3.)

- [ ] **Step 3: Implement `compare/page.tsx`**

```tsx
// Server component: reads ?t=, resolves each ticker through the allow-list
// (unknowns dropped), renders the comparison.
import Link from "next/link";

import { CompareGrid } from "@/components/compare/CompareGrid";
import { parseCompare } from "@/lib/compare";
import { fetchTickerReport } from "@/lib/ticker-backend";
import type { TickerReport } from "@/lib/types";

import styles from "@/components/compare/compare.module.css";
import page from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const requested = parseCompare(t ?? null);
  const resolved = await Promise.all(requested.map((tk) => fetchTickerReport(tk)));
  const reports = resolved.filter((r): r is TickerReport => r !== null);

  return (
    <div className={page.page}>
      <header className={`${page.masthead} stage stage-1`}>
        <Link href="/" className={page.brand} style={{ textDecoration: "none" }}>
          RiskPilot<span className={page.brandAccent}>AI</span>
        </Link>
        <div className="caption">side-by-side risk comparison · illustrative data</div>
      </header>

      <div className={`${styles.wrap} stage stage-2`}>
        <div className={styles.head}>
          <div className="caption">
            Comparing {reports.length} of {requested.length} requested
          </div>
          <Link href="/" className="caption">← back to portfolio</Link>
        </div>

        {reports.length === 0 ? (
          <p className={styles.empty}>
            No recognized tickers to compare. Add some from the search palette on the home page.
          </p>
        ) : (
          <CompareGrid reports={reports} />
        )}

        <p className="disclaimer" style={{ marginTop: "var(--space-3)" }}>
          Educational risk coaching, not financial advice. No buy/sell recommendations.
          Illustrative sample data.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build + smoke**

Run: `npx tsc --noEmit && npm run build`
Expected: succeeds; `/compare` in route list.
Then `npm run dev`, open `/compare?t=NVDA,AMD,MSFT`.
Expected: three columns, three compact gauges. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/compare frontend/src/components/compare
git commit -m "feat: /compare side-by-side multi-ticker risk view"
```

---

## Task 9: Add-to-compare in the search palette + compare tray

**Files:**
- Modify: `frontend/src/components/search/SearchPalette.tsx`
- Modify: `frontend/src/components/search/search-palette.module.css`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/page.module.css`

**Interfaces:**
- Consumes: `toggleCompare`, `serializeCompare`, `MAX_COMPARE` (Task 7).
- Produces: `SearchPalette` gains props `compareSet: string[]` and `onToggleCompare: (ticker: string) => void`. A `+`/`✓` action per row (and `⇧Enter` on the active row) toggles compare membership without navigating. Landing renders a `CompareTray` linking to `/compare`.

- [ ] **Step 1: Extend `SearchPalette` props + row action**

In `SearchPalette.tsx`:
- Update the props interface:
```tsx
interface SearchPaletteProps {
  universe: TickerOption[];
  compareSet: string[];
  onToggleCompare: (ticker: string) => void;
}
export function SearchPalette({ universe, compareSet, onToggleCompare }: SearchPaletteProps) {
```
- In `onInputKey`, handle Shift+Enter to toggle the active row instead of navigating:
```tsx
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active];
      if (!pick) return;
      if (e.shiftKey) onToggleCompare(pick.ticker);
      else go(pick.ticker);
    }
```
- In each rendered `<li>`, add a toggle button before the `↵`:
```tsx
                    <button
                      type="button"
                      className={styles.cmpBtn}
                      aria-pressed={compareSet.includes(o.ticker)}
                      title={compareSet.includes(o.ticker) ? "Remove from compare" : "Add to compare"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCompare(o.ticker);
                      }}
                    >
                      {compareSet.includes(o.ticker) ? "✓" : "+"}
                    </button>
```
- Update the footer hint to mention compare:
```tsx
              <span className="caption">↑↓ navigate · ↵ open · ⇧↵ compare · esc close</span>
```

- [ ] **Step 2: Style the compare button**

Add to `search-palette.module.css`:
```css
.cmpBtn {
  font: inherit;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--rule-strong);
  background: var(--surface);
  color: var(--ink-soft);
  cursor: pointer;
  margin-right: 8px;
  transition: transform var(--dur-fast) var(--ease-out-expo), color var(--dur-fast);
}
.cmpBtn:hover { transform: scale(1.08); color: var(--ink); }
.cmpBtn[aria-pressed="true"] { background: var(--risk-low-soft); color: var(--risk-low); border-color: var(--risk-low); }
```

- [ ] **Step 3: Lift compare state into the landing + render the tray**

The landing page (`page.tsx`) is a server component but `SearchPalette` is a client component holding interaction. Create a thin client wrapper so compare state lives client-side. Add a new file `frontend/src/components/search/SearchWithCompare.tsx`:
```tsx
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
```
Add tray styles to `search-palette.module.css`:
```css
.tray { display: flex; align-items: center; gap: var(--space-1); flex-wrap: wrap; margin-top: var(--space-2); }
.chip {
  font: inherit;
  font-size: var(--text-xs);
  padding: 4px 8px;
  border-radius: 100px;
  border: 1px solid var(--rule-strong);
  background: var(--surface);
  color: var(--ink-soft);
  cursor: pointer;
}
.chip:hover { color: var(--risk-high); border-color: var(--risk-high); }
.trayGo { font-weight: 600; margin-left: var(--space-1); }
```

- [ ] **Step 4: Use the wrapper on the landing**

In `frontend/src/app/page.tsx`, replace the import and usage:
```tsx
import { SearchWithCompare } from "@/components/search/SearchWithCompare";
```
and in the `searchRow`:
```tsx
        <SearchWithCompare universe={universe} />
```
(Remove the now-unused direct `SearchPalette` import.)

- [ ] **Step 5: Typecheck + build + smoke**

Run: `npx tsc --noEmit && npm run build`
Expected: succeeds.
`npm run dev`: open palette (⌘K), `+` two rows, tray shows, "Compare →" routes to `/compare?t=…`. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/search frontend/src/app/page.tsx frontend/src/app/page.module.css
git commit -m "feat: add-to-compare in palette with a landing compare tray"
```

---

## Task 10: Sortable holdings table + allocation filter (Analyst)

**Files:**
- Create: `frontend/src/components/dashboard/HoldingsTable.tsx`
- Create: `frontend/src/components/dashboard/holdings-table.module.css`
- Modify: `frontend/src/components/dashboard/AllocationBar.tsx`
- Modify: `frontend/src/components/dashboard/allocation-bar.module.css`
- Modify: `frontend/src/components/dashboard/AnalystView.tsx`

**Interfaces:**
- Consumes: `Holding` type; `AllocationBar` gains `selectedSector: string | null` + `onSelectSector: (s: string | null) => void`.
- Produces: `HoldingsTable({ holdings, selectedSector, onClearFilter })` — sortable by `value`/`weight`, filtered by sector.

- [ ] **Step 1: Implement `holdings-table.module.css`**

```css
.table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.table th, .table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--rule); }
.table th { color: var(--ink-faint); font-weight: 600; }
.sortBtn {
  font: inherit; font-weight: 600; color: var(--ink-faint);
  background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; gap: 4px; align-items: center;
}
th[aria-sort="descending"] .sortBtn, th[aria-sort="ascending"] .sortBtn { color: var(--ink); }
.right { text-align: right; }
.bar { height: 6px; border-radius: 3px; background: var(--risk-low-soft); overflow: hidden; }
.barFill { height: 100%; background: var(--risk-low); }
.filterRow { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }
.clear {
  font: inherit; font-size: var(--text-xs); padding: 3px 10px; border-radius: 100px;
  border: 1px solid var(--rule-strong); background: var(--surface); color: var(--ink-soft); cursor: pointer;
}
.clear:hover { color: var(--ink); }
```

- [ ] **Step 2: Implement `HoldingsTable.tsx`**

```tsx
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
```

- [ ] **Step 3: Make `AllocationBar` interactive**

In `AllocationBar.tsx`, add `"use client";` as the FIRST line (it now has event handlers — make the boundary explicit, don't rely on transitive inclusion from `AnalystView`). Then extend props + add hover/click + a11y. Change the signature and segment rendering:
```tsx
"use client";
// ...existing imports unchanged...

interface AllocationBarProps {
  holdings: Holding[];
  selectedSector?: string | null;
  onSelectSector?: (sector: string | null) => void;
}

export function AllocationBar({ holdings, selectedSector = null, onSelectSector }: AllocationBarProps) {
  const segments = sectorSegments(holdings);
  // ...
```
Replace each segment `<div>` with a focusable, clickable element that dims when another is selected:
```tsx
        {segments.map((seg, i) => {
          const dimmed = selectedSector !== null && selectedSector !== seg.sector;
          return (
            <button
              key={seg.sector}
              type="button"
              className={styles.seg}
              aria-pressed={selectedSector === seg.sector}
              style={{
                width: `${seg.pct}%`,
                background: segColor(i, segments.length),
                opacity: dimmed ? 0.35 : 1,
              }}
              title={`${seg.sector} ${seg.pct}%`}
              onClick={() => onSelectSector?.(selectedSector === seg.sector ? null : seg.sector)}
            />
          );
        })}
```
Add to `allocation-bar.module.css` (or adjust `.seg`) so the button has no default chrome and transitions opacity:
```css
.seg {
  border: none;
  padding: 0;
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease-out-expo);
}
```

- [ ] **Step 4: Wire the table + filter into `AnalystView`**

`AnalystView` is currently a server-safe component but now needs state — convert it to a client component. At the top add `"use client";` and `import { useState } from "react";`, then:
```tsx
export function AnalystView({ report }: { report: RiskReport }) {
  const { facts, explanation, holdings, disclaimer, portfolio_name, as_of } = report;
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
```
Pass props to `AllocationBar`:
```tsx
        <AllocationBar
          holdings={holdings}
          selectedSector={selectedSector}
          onSelectSector={setSelectedSector}
        />
```
Add the table in a new section after the allocation section:
```tsx
      <section className={`${styles.allocation} stage stage-3`}>
        <div className="caption" style={{ marginBottom: 8 }}>Holdings</div>
        <HoldingsTable
          holdings={holdings}
          selectedSector={selectedSector}
          onClearFilter={() => setSelectedSector(null)}
        />
      </section>
```
Import it: `import { HoldingsTable } from "./HoldingsTable";`

- [ ] **Step 5: Metric tiles link to their matching risk factor (Win 3 — anchor + highlight)**

Spec Win 3 requires each Analyst metric tile to jump to the matching `top_risk_factors` item and highlight it. The mapping from a tile to a free-text factor is **explicit by keyword** (do NOT leave it to the implementer):

```tsx
// metric tile label -> the keyword that identifies its risk-factor <li>.
const TILE_FACTOR_KEYWORD: Record<string, string> = {
  "Top-3 concentration": "concentration",
  "Annualized volatility": "volatility",
  "Worst drawdown": "drawdown",
  "Holdings": "diversification",
};

// resolve a tile label to a factor index, or null if none matches.
function factorIndexFor(label: string, factors: string[]): number | null {
  const kw = TILE_FACTOR_KEYWORD[label];
  if (!kw) return null;
  const i = factors.findIndex((f) => f.toLowerCase().includes(kw));
  return i >= 0 ? i : null;
}
```

In `AnalystView`, give each top-risk-factor `<li>` a stable id and a `data-flash` hook, and make each `Metric` a button that scrolls+flashes its target. Add this state + handler inside the component:
```tsx
  const [flashed, setFlashed] = useState<number | null>(null);

  function jumpToFactor(label: string) {
    const i = factorIndexFor(label, explanation.top_risk_factors);
    if (i === null) return;
    const el = document.getElementById(`risk-factor-${i}`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    setFlashed(i);
    window.setTimeout(() => setFlashed((cur) => (cur === i ? null : cur)), 1200);
  }
```
Add ids + the flash class to the factor list rendering:
```tsx
              {explanation.top_risk_factors.map((f, i) => (
                <li key={f} id={`risk-factor-${i}`} className={flashed === i ? styles.factorFlash : undefined}>
                  <GroundedText text={f} />
                </li>
              ))}
```
Change the `Metric` component + call sites to be buttons (note: `AnalystView` is now a client component, so the handler closure is fine):
```tsx
function Metric({ label, value, onJump }: { label: string; value: string; onJump?: () => void }) {
  if (!onJump) {
    return (
      <div className={styles.tile}>
        <div className="caption">{label}</div>
        <div className={`num ${styles.tileValue}`}>{value}</div>
      </div>
    );
  }
  return (
    <button type="button" className={`${styles.tile} ${styles.tileButton}`} onClick={onJump} title="Jump to the related risk factor">
      <div className="caption">{label}</div>
      <div className={`num ${styles.tileValue}`}>{value}</div>
    </button>
  );
}
```
And pass `onJump` from the four metric call sites, e.g.:
```tsx
        <Metric label="Top-3 concentration" value={`${facts.concentration_pct_top3}%`} onJump={() => jumpToFactor("Top-3 concentration")} />
        <Metric label="Annualized volatility" value={`${facts.volatility_annualized_pct}%`} onJump={() => jumpToFactor("Annualized volatility")} />
        <Metric label="Worst drawdown" value={`${facts.max_drawdown_pct}%`} onJump={() => jumpToFactor("Worst drawdown")} />
        <Metric label="Holdings" value={`${facts.holdings_count}`} onJump={() => jumpToFactor("Holdings")} />
```
Add the styles to `frontend/src/app/page.module.css` (where `.tile`/`.tileValue` already live):
```css
.tileButton {
  width: 100%;
  text-align: left;
  font: inherit;
  border: none;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out-expo);
}
.tileButton:hover { background: var(--surface-raised); }
.factorFlash {
  animation: factorFlash 1.2s var(--ease-out-expo);
}
@keyframes factorFlash {
  0% { background: var(--risk-low-soft); }
  100% { background: transparent; }
}
```
(`factorFlash` animates `background` only on a brief one-shot; reduced-motion users still get the scroll + the global motion reset shortens the flash to ~0ms, so nothing is lost.)

- [ ] **Step 6: Typecheck + build + smoke**

Run: `npx tsc --noEmit && npm run build`
Expected: succeeds.
`npm run dev`: landing → Analyst tab. Click a sector segment → others dim, table filters, clear chip appears. Click "Value"/"Weight" headers → sort flips. Click the "Top-3 concentration" tile → page scrolls to the concentration risk factor and it flashes. Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/dashboard frontend/src/app/page.module.css
git commit -m "feat: interactive allocation filter, sortable holdings table, metric-to-factor jumps"
```

---

## Task 11: Dark theme tokens + no-flash toggle

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/src/components/theme/ThemeToggle.tsx`
- Create: `frontend/src/components/theme/theme-toggle.module.css`
- Modify: `frontend/src/app/page.tsx` (place the toggle)

**Interfaces:**
- Produces: `<html data-theme="light|dark">`; a `ThemeToggle` client button persisting to `localStorage["rp-theme"]`; an inline pre-paint script setting the attribute before first paint (no flash). Light default when no stored/OS preference.

- [ ] **Step 1: Add the dark token block to `globals.css`**

After the `:root { ... }` block, add:
```css
/* Opt-in dark theme — surfaces/ink invert; the risk ramp hues stay (they read
   on both). Light remains the default (no [data-theme] / [data-theme=light]). */
[data-theme="dark"] {
  --bg: oklch(20% 0.012 264);
  --bg-grain: oklch(23% 0.012 264);
  --surface: oklch(25% 0.012 264);
  --surface-raised: oklch(28% 0.012 264);
  --ink: oklch(94% 0.004 250);
  --ink-soft: oklch(78% 0.008 250);
  --ink-faint: oklch(62% 0.01 250);
  --rule: oklch(36% 0.008 264);
  --rule-strong: oklch(46% 0.01 264);
  --risk-low-soft: oklch(64% 0.13 232 / 0.20);
  --risk-high-soft: oklch(60% 0.20 25 / 0.20);
  --accent: oklch(80% 0.02 264);
}
```
Also update the top-anchored wash so it reads on dark — change the `body` background-image line to use the surface token (already does). No further change needed; verify visually in Task 12.

- [ ] **Step 2: Add the no-flash script + html attribute in `layout.tsx`**

Replace `layout.tsx` body/html with:
```tsx
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "RiskPilot AI — Portfolio Risk Coach",
  description:
    "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
};

// No stored choice -> honor OS preference for the INITIAL theme; light is the
// final fallback (no stored value AND no OS dark preference). Stored value always wins.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('rp-theme');if(t!=='dark'&&t!=='light'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
```
(Light is the explicit default; the script only overrides if the user previously chose dark.)

- [ ] **Step 3: Implement the toggle component**

`theme-toggle.module.css`:
```css
.btn {
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 100px;
  border: 1px solid var(--rule-strong);
  background: var(--surface);
  color: var(--ink-soft);
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast);
}
.btn:hover { color: var(--ink); border-color: var(--ink-soft); }
```
`ThemeToggle.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";

import styles from "./theme-toggle.module.css";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // The pre-paint script already set data-theme (stored value, else OS preference,
    // else light). Mirror whatever it chose so the button label matches the page.
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") setTheme(attr);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("rp-theme", next); } catch {}
  }

  return (
    <button
      className={styles.btn}
      onClick={() => apply(theme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? "☀︎ Light" : "☾ Dark"}
    </button>
  );
}
```

- [ ] **Step 4: Extract a shared `Masthead` so the toggle appears on ALL routes**

The landing, `/analyze`, and `/compare` each build their own inline header today. Extract one shared component so the `ThemeToggle` (and the analyze link) appear everywhere, not just the landing. Create `frontend/src/components/layout/Masthead.tsx`:
```tsx
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

import styles from "@/app/page.module.css";

export function Masthead({ caption }: { caption: string }) {
  return (
    <header className={`${styles.masthead} stage stage-1`}>
      <Link href="/" className={styles.brand} style={{ textDecoration: "none" }}>
        RiskPilot<span className={styles.brandAccent}>AI</span>
      </Link>
      <div className={styles.mastheadRight}>
        <Link href="/analyze" className="caption">Analyze your portfolio →</Link>
        <span className="caption">{caption}</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
```
Then replace each route's inline header with `<Masthead caption="..." />`:
- `frontend/src/app/page.tsx` — remove the local `Masthead()` function and its usage in both `Home` and `BackendOffline`; import and use `<Masthead caption="risk coaching · explains the math · never invents numbers" />`. Remove the now-unused `styles.mastheadRight` block ONLY if nothing else uses it (it stays — `Masthead.tsx` references it via the shared `page.module.css`).
- `frontend/src/app/analyze/page.tsx` — replace the inline `<header>` (added in Task 5 Step 2) with `<Masthead caption="analyze your own holdings · figures come from the engine" />`; drop the now-unused `Link`/`page.brand` bits if no longer referenced.
- `frontend/src/app/compare/page.tsx` — replace the inline `<header>` (Task 8 Step 3) with `<Masthead caption="side-by-side risk comparison · illustrative data" />`.

(`Masthead.tsx` imports `ThemeToggle` — a client component — but is itself a Server Component used in Server Component pages; that's a valid server→client boundary. `mastheadRight` flex styling from Task 5 already exists in `page.module.css`.)

- [ ] **Step 5: Typecheck + build + smoke**

Run: `npx tsc --noEmit && npm run build`
Expected: succeeds.
`npm run dev`: the toggle appears on `/`, `/analyze`, and `/compare`; it flips theme, reload preserves it, no flash of the wrong theme on load; with OS set to dark and no stored choice, the first load is dark. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/layout.tsx frontend/src/components/theme frontend/src/components/layout frontend/src/app/page.tsx frontend/src/app/analyze/page.tsx frontend/src/app/compare/page.tsx
git commit -m "feat: opt-in dark theme (OS-aware, no-flash) with a shared masthead toggle on every route"
```

---

## Task 12: E2E coverage

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/compare.spec.ts`
- Create: `frontend/e2e/analyze.spec.ts`
- Create: `frontend/e2e/theme.spec.ts`

**Interfaces:**
- Consumes: the running dev server (Playwright `webServer`).

- [ ] **Step 1: Playwright config**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```
Run once to install browsers: `npx playwright install chromium`.

- [ ] **Step 2: compare.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test("compare page renders one gauge column per recognized ticker", async ({ page }) => {
  await page.goto("/compare?t=NVDA,AMD,MSFT");
  await expect(page.getByText("Comparing 3 of 3 requested")).toBeVisible();
  await expect(page.getByText("Volatility").first()).toBeVisible();
});

test("unknown tickers are dropped", async ({ page }) => {
  await page.goto("/compare?t=NVDA,ZZZZ");
  await expect(page.getByText("Comparing 1 of 2 requested")).toBeVisible();
});
```

- [ ] **Step 3: analyze.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test("parse errors show before any scoring", async ({ page }) => {
  await page.goto("/analyze");
  await page.getByLabel("Holdings CSV").fill("NVDA,oops,Technology,100");
  await page.getByRole("button", { name: "Analyze portfolio" }).click();
  await expect(page.getByRole("alert")).toContainText(/shares/i);
});

test("valid sample renders dashboard or the offline panel", async ({ page }) => {
  await page.goto("/analyze");
  await page.getByRole("button", { name: "load the sample" }).click();
  await page.getByRole("button", { name: "Analyze portfolio" }).click();
  // Without the engine the offline panel appears; with it, the Coach/Analyst toggle.
  await expect(
    page.getByText(/engine not connected/i).or(page.getByRole("tab", { name: /Coach/ })),
  ).toBeVisible();
});
```

- [ ] **Step 4: theme.spec.ts**

```ts
import { test, expect } from "@playwright/test";

// Force light OS preference so the OS-aware initial theme is deterministic
// (the pre-paint script reads prefers-color-scheme when there's no stored value).
test.use({ colorScheme: "light" });

test("theme toggle flips and persists data-theme", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /Switch to dark theme/i }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("with OS dark preference and no stored choice, first load is dark", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await ctx.close();
});
```

- [ ] **Step 5: Visual-regression specs (both themes, key breakpoints)**

Per the project's web/testing rules, visual regression is priority #1 for visual-heavy work. Create `frontend/e2e/visual.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/analyze", "/compare?t=NVDA,AMD,MSFT,AAPL"];
const WIDTHS = [320, 768, 1440];
const THEMES = ["light", "dark"] as const;

for (const theme of THEMES) {
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      test(`snapshot ${route} @ ${width} ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => {
          try { localStorage.setItem("rp-theme", t); } catch {}
        }, theme);
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        // settle the gauge sweep + entrance animations
        await page.waitForTimeout(1100);
        await expect(page).toHaveScreenshot(
          `${route.replace(/[/?=,&]/g, "_")}-${width}-${theme}.png`,
          { fullPage: true, maxDiffPixelRatio: 0.02 },
        );
      });
    }
  }
}
```
(First run creates baselines; commit them. Subsequent runs diff against them — `maxDiffPixelRatio` absorbs sub-pixel antialiasing. The Analyst view's own screenshots are covered via `/` after toggling the Analyst tab in a follow-up if desired; the four routes/widths/themes here are the spec's required surface.)

- [ ] **Step 6: Run E2E + create visual baselines**

Run: `npx playwright install chromium && npm run e2e`
Expected: behavioral specs PASS. The first `visual.spec.ts` run writes baseline PNGs under `e2e/visual.spec.ts-snapshots/` and reports them as "created" — re-run once to confirm they now pass green.

- [ ] **Step 7: Commit**

```bash
git add frontend/playwright.config.ts frontend/e2e
git commit -m "test: e2e for compare, analyze, theme (OS-aware) + visual-regression baselines"
```

---

## Task 13: Responsive + a11y + theme sweep

**Files:**
- Modify: as needed (CSS modules touched in this pass)

**Interfaces:** none new — a verification + fix task.

- [ ] **Step 1: Run the full unit + build gate**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: unit suites PASS, no type errors, build succeeds.

- [ ] **Step 2: Responsive check**

`npm run dev`, then at widths 320 / 375 / 768 / 1024 / 1440 (devtools), visit `/`, `/analyze`, `/compare?t=NVDA,AMD,MSFT,AAPL`, and Analyst view. Verify: no horizontal overflow; compare grid collapses to 1 column ≤760px; holdings table is readable (allow horizontal scroll on the table wrapper if needed — add `overflow-x:auto` to a wrapping div around `HoldingsTable` in `AnalystView` if it overflows at 320px).

- [ ] **Step 3: Dark-theme legibility check (explicit spots the review flagged)**

Toggle dark on each page. Verify: gauge arc + score readable; allocation segments distinct; table rules visible; the `.verified` chip, `.tray` chips, and CompareGrid per-metric tints (`--risk-*-soft`) legible. Two specific checks the review called out:
- **Body radial wash:** in dark, `--surface` (L0.25) vs `--bg` (L0.20) is only Δ0.05 — the top wash is nearly invisible. Decide deliberately: either accept a flat dark field (fine — it's intentional), OR add `[data-theme="dark"] body { background-image: radial-gradient(140% 90% at 50% -20%, oklch(30% 0.012 264), transparent 60%); }` for a visible-but-subtle wash. Don't leave it accidental.
- **Holdings-table `th` contrast:** the header text uses `--ink-faint` (L0.62) on `--surface` (L0.25). Confirm it clears 4.5:1 for small text; if borderline, bump the dark `--ink-faint` to ~L0.70 in the `[data-theme="dark"]` block (this also lifts other faint captions — check they don't become too loud).

If any token reads poorly, adjust ONLY the `[data-theme="dark"]` block in `globals.css`.

- [ ] **Step 4: Keyboard + a11y pass**

Tab through: landing palette (open, add to compare via `+` and `⇧Enter`), compare tray link, Analyst allocation segments (focusable buttons), table sort headers (`aria-sort` updates). Confirm `:focus-visible` outline shows on all new interactive elements (it's global). Fix any non-focusable interactive element by ensuring it's a real `<button>`/`<a>`.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A frontend
git commit -m "fix: responsive, dark-theme, and a11y refinements across the new surfaces"
```

---

## Self-Review Notes

Reflects the adversarial review pass (16 issues applied; 6 false alarms dropped).

- **Spec coverage (every win has an implementing step, not just a comment):**
  - Win 1 (upload) → Tasks 1–5: parser (1), exact breakdown (2), **Python `POST /report`** (3, the gap the review caught), frontend client + route (4), `/analyze` page with 400/422/503 branching (5).
  - Win 2 (compare) → Tasks 6–9: gauge `size` (6), helpers (7), page + grid **with per-metric worst/best tint** (8), palette add + tray (9).
  - Win 3 (interactivity) → Task 10: allocation filter, sortable table, **and the metric-tile→risk-factor jump** (10 Step 5 — previously missing).
  - Win 4 (polish) → Tasks 11, 13: dark theme **honoring `prefers-color-scheme`** (11), responsive/a11y/contrast sweep (13).
  - Testing → unit (1/2/7), E2E (12), **visual regression across breakpoints + both themes** (12 Step 5 + 13).
- **Source-of-truth constraint:** the only TS arithmetic is `breakdown.ts` (exact concentration/sector %, labelled "computed here, not modeled"). All risk_score/volatility/drawdown/beta come from the Python engine (sample, ticker, or the new `compute_report`).
- **Secret topology:** the new POST path is browser → `/api/report` (public) → `analyzePortfolio` in `backend.ts` (`server-only`, holds the secret) → Python `POST /report` (secret-guarded). The browser never sees the secret or the backend URL.
- **Allow-list preserved:** uploaded unknown tickers are rejected `422` by the engine (Task 3) and surfaced as a clear error in the page (Task 5) — the same boundary single-ticker analysis enforces.
- **Type consistency:** `RiskGauge` `size` (Task 6) consumed by `CompareGrid` (Task 8); `parseCompare/serializeCompare/toggleCompare/MAX_COMPARE` (Task 7) consumed by Tasks 8–9; `AnalyzeResult` union (Task 4) consumed by the route (Task 4) and shapes the page branching (Task 5); `selectedSector`/`onSelectSector` consistent between `AllocationBar` and `AnalystView` (Task 10); `aria-sort` on `<th>` only with the CSS re-targeted to `th[aria-sort] .sortBtn` (Task 10).
