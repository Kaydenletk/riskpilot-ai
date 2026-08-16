# RiskPilot v2 — Redesign + "Analyze Yours" Design Spec

Date: 2026-08-09
Status: Approved in brainstorming session (all 5 sections)
Author: Khanh Le + Claude

## Purpose

Turn RiskPilot from a sample-portfolio demo into a product a real retail investor
can use to think twice before a trade — while keeping the engineering thesis
(deterministic Python math, LLM explains only, guardrail rejects invented numbers)
visible and intact. Full visual rebrand included.

**Audience:** real users first; recruiters judge by how real it feels.
**Scope:** full stack (FastAPI backend + Next.js frontend).

## Decisions (locked)

| Decision | Choice |
|---|---|
| Visual direction | Swiss Editorial, sharpened (option A) |
| Brand | "Ultramarine Swiss" — `RISK/PILOT` slash wordmark, Klein-blue chrome accent, cool paper light theme, graphite dark theme. Red reserved exclusively for risk verdicts. |
| Homepage structure | Story-first hero (option C) |
| New features | Analyze YOUR portfolio + What-if simulator |
| Data universe | Expand committed snapshot to ~100 tickers (S&P-100-ish) |
| Math placement | ALL risk math stays in Python (Approach 1). Frontend never computes a risk number. |
| Accounts | None. Portfolio state in URL + localStorage only. Nothing persisted server-side. |

## 1. Brand system

- New tokens in `frontend/src/app/globals.css` (oklch):
  - Light: cool paper background (#f6f7f9-family), near-black ink, ultramarine
    accent ~`oklch(45% 0.26 265)` for chrome (links, CTAs, active states, kickers).
  - Dark: graphite inversion of the same tokens.
  - Risk ramp (blue / amber / red) unchanged, reserved for risk data only.
    Red is no longer a brand color — verdicts hit harder.
- Logo: type-only `RISK/PILOT` — Space Grotesk 700, slash in ultramarine.
  Pure CSS/text. New favicon + OG images to match.
- Typography unchanged in structure: Space Grotesk display, system sans body,
  mono all-caps captions.

## 2. Homepage (`/`)

Top→bottom:
1. Masthead — wordmark, "Analyze →" nav, theme toggle.
2. Hero — display headline "Think twice before your next trade." + one support
   line ("Deterministic risk math, explained by an AI that cannot invent
   numbers."). CTAs: primary **Analyze my portfolio →** (`/analyze`), secondary
   outline **See a sample X-Ray** (anchor). Type + whitespace only; no cards.
3. Sample X-Ray — existing dashboard (Coach/Analyst toggle) below the fold,
   kicker "SAMPLE PORTFOLIO — LIVE FROM THE ENGINE".
4. What-if teaser strip — static example ("Cut NVDA 40%→25% → risk 74→61"),
   links to `/analyze`.
5. How it works — existing 01/02/03 section restyled to new palette (03 red).
6. Universe index — ~100 ticker chips grouped by sector, client-side filter.
7. Footer — compliance, GitHub, COMPLIANCE.md.

Route stays server-rendered; sample report fetched as today (snapshot fallback).

## 3. Analyze flow (`/analyze`)

- **Builder:** search-as-you-type over universe (reuse palette logic). Rows:
  ticker · sector · weight. Weights always sum to 100 by construction
  (equal-split default; per-row lock; others rebalance proportionally).
  3–20 holdings. Unknown ticker → "not in universe yet" + nearest matches.
- **Run:** **Run the X-Ray →** fires `POST /report`. Skeleton mirrors report
  layout. Engine down → retry panel, fail-closed, never fake data.
- **Report:** SAME Dashboard components as home sample + banner
  "YOUR PORTFOLIO · computed <timestamp>". LLM prose guardrail-verified;
  fallback = deterministic template with existing "AI fell back" label.
- **State:** URL-serialized (`/analyze?p=NVDA:40,AAPL:25,...`) → shareable,
  back-button safe. localStorage "Resume last portfolio" chip.

### Backend

`POST /report` accepts `{holdings: [{ticker, weight_pct}]}` — validates against
universe (Pydantic), 4xx on bad input, rate-limited. Reuses existing engine +
LLM + guardrail unchanged.

## 4. What-if simulator

In-report panel (sample + custom reports), kicker "WHAT IF".

- One weight slider per holding + remove toggle; proportional auto-rebalance
  respecting locks; Reset restores analyzed portfolio.
- Debounced (~250ms) `POST /score` → deterministic numbers only (score, band,
  concentration, volatility, drawdown). No LLM in the loop.
- Display: delta pairs (`74 → 61`), gauge animates, old→new stats, target-band
  color. Slider optimistic; numbers shimmer while in flight — never stale
  numbers presented as current.
- **Explain this version →** button (appears after change) fires full
  `POST /report` on modified weights; prose labeled "EXPLAINING YOUR WHAT-IF".
  LLM calls always user-triggered.
- Edge: 1 holding → simulator disabled with note; engine unreachable → panel
  grays out with retry, report stays.

### Backend

`POST /score` = engine only, fast path, zero LLM imports (extend import-lint
test to cover the route module).

## 5. Testing

**Backend (pytest):**
- `/score` `/report` schema validation: bad ticker, weights ≠ 100, <3 or >20
  holdings → 4xx.
- Determinism: same input → same numbers.
- Guardrail catches injected hallucinations on custom portfolios.
- Import-lint: `/score` path imports zero LLM code.
- Snapshot integrity: every universe ticker has full history, no NaNs.

**Frontend:**
- vitest: weight normalize/lock logic, URL serialize/parse round-trip.
- Playwright e2e: build→run→report; slider→delta; re-explain; shareable URL
  cold-load; engine-down fallback.
- Visual snapshots refreshed 320/768/1440, light+dark.

## Rollout (each step shippable)

1. Brand system + homepage restyle (frontend only)
2. Universe expansion to ~100 (data + tests)
3. `POST /score` + `POST /report`
4. `/analyze` builder + report
5. What-if simulator + re-explain

## Non-goals

- Accounts, server-side persistence of user portfolios
- Live market-data fetch at request time
- Buy/sell recommendations of any kind (compliance: educational coaching only)
- Client-side risk math (thesis-breaking)
