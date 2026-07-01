# Condensed 2026 UI Redesign — Design Spec

**Status:** Approved design (brainstorming). Next: implementation plan (writing-plans).

**Goal:** Redesign the RiskPilot AI frontend to feel current for 2026 — attractive, minimal-text, condensed — while keeping the signature SVG risk gauge, the honest "illustrative data" framing, the risk math source-of-truth, and the server-only secret topology. This is **Spec 1 of 2**; a follow-up spec covers a Webull-style analysis surface built in this new look.

## Research basis (2026, sourced)

Cross-source consensus for premium fintech UI: balance-first / one-number-first with progressive disclosure; functional color only (semantic risk + one deliberate accent, *not* default bank-blue); tabular numerals non-negotiable; number-first cards + in-cell sparklines to cut text; variable fonts (Space Grotesk called out for fintech numerals); bento is now the *default* not the wow, so the signature element (the gauge) must carry distinctiveness; dark mode should be opt-in, not default. Full research notes: `scratchpad/research-summary.md` (session artifact).

## Decisions (locked with user)

- **Look:** evolve Swiss/instrument (spine) + editorial one-line **verdict headline** to slash text + **dark theme as opt-in** token swap. (A + C + B-as-theme.)
- **Old plan merge:** fold the unbuilt plan's **dark theme** and **interactive holdings table** into this redesign. Defer **upload-portfolio** and **multi-ticker compare** to a separate later spec.
- **Verdict is deterministic** — generated from facts in TS, never an LLM call (honest, zero-latency).
- **Accent:** one indigo/violet chrome accent (Mercury-style), distinct from the risk ramp; keep the off-white paper field for light.
- **Type:** add Space Grotesk (variable, self-hosted via next/font) for the verdict headline + the large gauge number only. Body stays the system stack. ≤ 2 families.

## Non-goals / constraints

- No framework, no component template, no new runtime deps (test tooling = devDeps only).
- Do not touch risk math (volatility / drawdown / risk_score / beta come only from the Python engine). Concentration % and sector % may be computed client-side (exact arithmetic).
- Server-only secret (`INTERNAL_SHARED_SECRET_FRONTEND`, `BACKEND_INTERNAL_URL`) never reaches client code.
- Keep the SVG gauge as-is (signature element).
- Motion: `transform`/`opacity` only; honor `prefers-reduced-motion`.
- Light theme remains the default; dark is opt-in.

## Architecture — three additive layers

Everything lands on the existing oklch token system + CSS Modules. No rewrite.

### 1. Token layer (`globals.css`)
- Add one **chrome accent** hue (indigo/violet): `--accent` + soft variant, used for focus, links, active rows, routing bar, theme toggle — separate from the semantic risk ramp (ramp = risk state only).
- Add a `[data-theme="dark"]` override block that reassigns the *values* of existing tokens (`--bg`, `--surface`, `--ink*`, `--rule*`) and adjusts risk-ramp lightness for a dark field. Token **names** are unchanged, so no component needs edits to support dark.
- Keep the text-safe `-ink` ramp variants and darkened `--ink-faint` from the prior a11y pass (light theme); define dark-theme equivalents.

### 2. Type layer
- Self-host **Space Grotesk** (variable) via `next/font/local` or `next/font/google`; expose as a `--font-display` token.
- Apply `--font-display` only to the verdict headline and the gauge's large number. Everything else keeps the system stack. Tabular numerals (`.num`) unchanged.

### 3. Component layer
- **`VerdictHeadline`** (new, pure) — one editorial sentence from facts (band + top-2 drivers), Space Grotesk, on Coach + Analyst. Long prose demoted below / into progressive disclosure.
- **`NumberCard`** (new, pure) — large tabular figure headline, small-caps label beneath, optional in-cell sparkline (reuse `Sparkline`). Replaces text-block metrics.
- **`HoldingsTable`** (new, from old plan) — sortable, hover-drill, click-sector → filter allocation. Exact concentration/sector math client-side; risk math stays from engine.
- **`ThemeToggle`** (new, from old plan) — masthead sun/moon, persists to localStorage; no-flash inline script in `layout.tsx` reads it before paint (`suppressHydrationWarning`).
- Condense views: **Coach** → verdict + 3 number-cards + 1 discipline prompt. **Analyst** → verdict + number-card grid + holdings table + explanation (collapsed by default).

## Components / units (each independently testable)

| Unit | Type | Does | Depends on |
|---|---|---|---|
| `lib/verdict.ts` | pure fn | facts → one editorial sentence (+ fallback) | types only |
| `lib/breakdown.ts` | pure fn | holdings → concentration/sector rows (exact) | types only |
| `VerdictHeadline` | presentational | render verdict string, display font | `verdict.ts` output via props |
| `NumberCard` | presentational | figure + label + optional sparkline | `Sparkline` |
| `HoldingsTable` | interactive | sort/hover/select rows, emit `onSelectSector` | `breakdown.ts` output via props |
| `ThemeToggle` | client state | toggle `data-theme`, persist localStorage | none |
| token/type layers | CSS/config | accent, dark block, display font | none |

## Data flow

No new data source. `VerdictHeadline`, `NumberCard`, `HoldingsTable` read the already-fetched `RiskReport` / `TickerReport` (server-only clients unchanged). `verdict.ts` and `breakdown.ts` are pure (facts/holdings in → string/rows out). Theme is client-only state via `data-theme` + localStorage; no server involvement.

## Error handling

- `verdict.ts` falls back to a generic `"Risk is {band}."` when a driver is missing.
- `breakdown.ts` validates input immutably; handles edge cases (single holding, ties).
- Theme script wraps localStorage access in try/catch (may be blocked).
- All new motion honors `prefers-reduced-motion`.

## Testing (TDD, ≥80%)

Pure functions first (RED → GREEN):
- `verdict.test.ts` — every band × driver combination + fallback.
- `breakdown.test.ts` — concentration/sector math, edges (1 holding, ties, empty).
- Components: Playwright visual regression at 320 / 768 / 1440, **light + dark**.
- Tooling: Vitest (jsdom, `@/` alias) + Playwright, added as devDeps (old-plan Task 0).

## Out of scope (future specs)

- Spec 2: Webull-style analysis surface (technical-rating gauge from synthetic prices + mock-labeled fundamentals/analyst/news) built in this new look.
- Later: upload-your-own-portfolio, multi-ticker compare (deferred from the old ui-functional-pass plan).
