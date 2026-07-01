# RiskPilot AI — "More Functional" UI Pass

**Date:** 2026-06-30
**Status:** Approved (design)
**Scope:** Four feature wins on the existing Swiss/instrument frontend, built in order 1→2→3→4.

## Context

The frontend (Next.js 15 / React 19, no CSS framework, oklch token system in
`globals.css`) already ships a polished "financial instrument" design: a radial
`RiskGauge`, a Coach/Analyst persona toggle (`Dashboard`), a command palette
(`SearchPalette`), `GroundedText` number-verification chips, an `AllocationBar`,
and a single-ticker view with a TradingView live-context panel.

Data is **server-side fixtures** with a private Python engine as the source of
truth (`backend.ts`, `ticker-backend.ts`). The product's core promise is *"never
invents numbers — every figure verified against computed data."* No new runtime
dependencies (landing JS budget < 150KB).

This pass adds function without breaking that promise or that design language.

## Guiding constraints (non-negotiable)

- **One source of truth for risk math.** No reimplementation of volatility /
  drawdown / score in TS. Exact arithmetic (concentration %, sector %) MAY be
  shown client-side because it is not modeled.
- **Server-only secret topology preserved.** The shared secret and private
  backend URL never reach client code. New backend calls go through a server
  route, exactly like the existing `/api/report` GET.
- **Design system reuse.** Reuse `RiskGauge`, `GroundedText`, tokens, `.num`,
  `.caption`, `.stage` entrance, `riskVar`/`riskColorForScore`. No new palette.
- **Motion = transform/opacity only**, reduced-motion honored.
- **Light default.** Dark mode is opt-in, never the default.

---

## Win 1 — Upload your own portfolio

**Goal:** user scores their OWN holdings, not just the demo fixture.

### Flow
1. New route `/analyze` with a **CSV paste / file-drop** box. Expected columns:
   `ticker,shares,sector,market_value` (matches the `Holding` interface). A
   one-line example + a "load the sample" link are shown.
2. **Browser-side parse + validate** in a new `lib/parse-holdings.ts`:
   - Split lines, tolerate a header row, trim cells.
   - Validate each row: non-empty ticker, finite positive `shares` and
     `market_value`, non-empty sector. Collect per-row errors; **fail fast with
     clear messages** ("row 3: market_value 'abc' is not a number"). Never send
     malformed data downstream.
   - Returns `{ holdings: Holding[] } | { errors: RowError[] }`.
3. **New public API route** `POST /api/report` (extends the existing file, which
   currently only has `GET`):
   - Body: `{ holdings: Holding[] }`. Re-validate server-side (never trust the
     client). Cap at a sane max (e.g. 50 holdings) to bound abuse.
   - Calls a new `analyzePortfolio(holdings)` in `backend.ts` → `POST` to the
     Python `/report` endpoint with the `x-internal-secret` header.
4. **Backend-absent state (Vercel demo):** when the engine is unreachable,
   respond `503` with a typed `{ error: "engine_unavailable" }`. The `/analyze`
   page renders an honest panel — same spirit as the existing `BackendOffline`:
   *"Your file parsed and validated. Scoring needs the risk engine connected —
   here's how to run it locally."* The parsed holdings + the exact (non-modeled)
   concentration/sector breakdown ARE shown, so the upload still feels alive.
5. **Result** renders through the existing `Dashboard` (Coach/Analyst), passing
   the returned `RiskReport`. Full reuse, zero new result UI.

### Components / files
- `app/analyze/page.tsx` — client page (drop box + state machine:
  idle → parsing → errors | scoring → result | engine-unavailable).
- `lib/parse-holdings.ts` — pure parser/validator (unit-tested).
- `backend.ts` — add `analyzePortfolio(holdings)`.
- `app/api/report/route.ts` — add `POST` handler with server-side re-validation.
- A masthead link / button to `/analyze` from the landing.

### Error handling
- Parse errors: inline, per-row, before any network call.
- Network/engine errors: typed envelope, the explanatory offline panel, never
  leak backend internals (mirrors existing `/api/report` GET behavior).

---

## Win 2 — Compare / multi-ticker

**Goal:** evaluate 2+ instruments side by side.

### Flow
- `SearchPalette` gains an **"add to compare"** affordance: a second action on
  each row (e.g. a `+` button or `⇧Enter`) adds the ticker to a compare set
  instead of navigating. A small **compare tray** (chips + "Compare N →") appears
  on the landing when the set is non-empty.
- New route `/compare?t=NVDA,AMD,MSFT` (max ~4). **URL is the state** (shareable,
  per the patterns rule). Tickers resolved through the existing allow-list
  (`fetchTickerReport`); anything outside the universe is dropped silently +
  noted ("2 of 3 recognized").
- **Layout:** responsive column-per-ticker grid. Each column = compact
  `RiskGauge` + a facts list (volatility, drawdown, beta, sector). A shared
  metric-row treatment lets the eye scan one metric across all tickers (the
  highest/lowest in each row gets a subtle semantic tint).

### Components / files
- `app/compare/page.tsx` — server component, reads `searchParams.t`, fetches each
  report, renders the grid.
- `components/compare/CompareGrid.tsx` + `compare.module.css`.
- `components/compare/CompareTray.tsx` (client) + a small shared store for the
  compare set — keep it minimal: lift state into `SearchPalette`'s parent on the
  landing, or a tiny client context. No Zustand/Jotai for this size (YAGNI).
- `SearchPalette` — add the second action + keep keyboard model intact
  (Enter = open, ⇧Enter or `+` = add to compare).

### Notes
- Pure frontend on existing fixtures — ships clean on the demo deploy.
- Reuse `RiskGauge` at a smaller size (it already accepts score/band; add an
  optional `size` prop rather than hardcoding 260).

---

## Win 3 — Interactive controls (on current data)

**Goal:** turn static readouts into things you can interrogate.

### AllocationBar (Analyst)
- Hover/focus a segment → that segment lifts (transform/opacity), shows its
  `sector %`, and the others dim. Keyboard-focusable segments with `aria`.
- Click a segment → sets a `selectedSector` filter that drives the new holdings
  table below.

### Holdings table (new, Analyst view)
- There is currently **no holdings table** — the data exists (`report.holdings`)
  but isn't shown per-row. Add a compact, sortable table: ticker · sector ·
  market value · weight %. Sort by value or weight (click header, `aria-sort`).
- Honors the `selectedSector` filter from the allocation bar; a visible "clear
  filter" chip when active.

### Analyst metric tiles
- Each tile becomes a button that scrolls to / highlights the matching risk
  factor in the explanation (anchor links). Small, cheap, high signal.

### Components / files
- `components/dashboard/HoldingsTable.tsx` + `holdings-table.module.css`.
- `AllocationBar.tsx` — add interaction + `onSelectSector` callback + a11y.
- `AnalystView.tsx` — wire allocation ↔ table filter state (lift to a small
  `useState`), render the table, make tiles link to factors.

### Constraints
- All interaction state is local React state derived from existing data — no new
  fetches, no duplicated server state.

---

## Win 4 — Visual polish

**Goal:** finish the new surfaces and add a dark theme, intentionally.

### Dark mode (opt-in)
- Add a `[data-theme="dark"]` token block in `globals.css` overriding the
  surface/ink/rule variables (oklch makes this a clean inversion; the risk ramp
  hues stay — they read on both). Respect `prefers-color-scheme` for the initial
  value, but **light is the default** when no preference/cookie.
- A small theme toggle in the masthead (sun/moon). Persist choice (localStorage)
  with a tiny inline pre-paint script to avoid a flash.
- Verify the risk ramp + `riskColorForScore` mixes still read on dark surfaces;
  nudge `--risk-*` soft tints if needed via the theme block (not the base).

### Responsive + micro-interactions
- Audit 320 / 375 / 768 / 1024 / 1440. Risk spots: `CompareGrid` (column count),
  `HoldingsTable` (horizontal scroll vs. stack), the `/analyze` drop box.
- Micro-interactions only on the new interactive elements (compare add, segment
  hover, table sort), compositor-friendly, reduced-motion honored.

---

## Testing

Per the web testing rules (visual regression > brittle markup):

- **Unit:** `lib/parse-holdings.ts` (valid CSV, header row, bad number, empty
  ticker, negative shares, row cap) — AAA, descriptive names. This is the one
  piece with real branching logic and a security boundary; it gets thorough
  coverage.
- **Component/light unit:** `rank()` already pure; add cases for compare-set add.
- **E2E (Playwright):** (a) landing → palette → add two → `/compare` shows two
  gauges; (b) `/analyze` paste valid CSV → renders dashboard OR the
  engine-unavailable panel deterministically; (c) theme toggle flips
  `data-theme` and persists across reload.
- **Visual regression:** screenshot landing, analyst (with table + filter),
  compare, analyze, at the breakpoints above, **both themes**.
- **A11y:** keyboard path through palette+compare, table sort headers
  `aria-sort`, allocation segments focusable, contrast in both themes.

## Build order

1. **Win 1 — Upload** (`parse-holdings` + tests → `POST /api/report` →
   `/analyze` page → engine-unavailable state → wire to `Dashboard`).
2. **Win 2 — Compare** (`RiskGauge` size prop → `/compare` page + grid →
   palette add affordance + tray).
3. **Win 3 — Interactivity** (`HoldingsTable` → allocation interaction →
   tiles-to-factors).
4. **Win 4 — Polish** (dark theme tokens + toggle + no-flash script → responsive
   audit → micro-interactions → visual-regression + a11y sweep).

Each win is independently shippable and leaves the app green.

## Out of scope (YAGNI)

- Reimplementing risk math in TS.
- Persisting uploaded portfolios server-side / accounts.
- Real-time price feeds beyond the existing TradingView context panel.
- A state-management library (local state + URL state suffice at this size).
