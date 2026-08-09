# RiskPilot v2 — Redesign + Analyze-Yours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the site (Ultramarine Swiss), restructure the homepage story-first, expand the synthetic price universe to ~100 tickers, add a weight-based portfolio builder at `/analyze`, and an in-report what-if simulator — with every risk number still computed only in Python.

**Architecture:** Existing topology unchanged: browser → Next.js (only public surface) → private FastAPI (`x-internal-secret`). Two backend additions: weight-based input (`weight_pct`) alongside shares, and a math-only `POST /score` fast path (no LLM import — enforced by import-lint). Frontend: token-level rebrand in `globals.css`, new home sections, `/analyze` rebuilt from CSV-paste to an interactive builder, `WhatIfPanel` inside the report view.

**Tech Stack:** Next.js 15 App Router + CSS Modules, FastAPI + Pydantic + numpy, pytest, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-09-riskpilot-redesign-v2-design.md`

**Conventions:** Conventional commits, no attribution. TDD: failing test first inside each task. Frontend files < 800 lines. All new UI must pass both themes.

---

## Phase 1 — Brand system + homepage (shippable alone)

### Task 1: Ultramarine token system + wordmark

**Goal:** New palette (light + dark), `RISK/PILOT` wordmark, red demoted to risk-data only.

**Files:**
- Modify: `frontend/src/app/globals.css` (`:root` + `[data-theme="dark"]` blocks)
- Create: `frontend/src/components/layout/Wordmark.tsx`
- Modify: `frontend/src/components/layout/Masthead.tsx` (use Wordmark)
- Modify: `frontend/src/app/page.module.css` (`.brand` cleanup)
- Modify: `frontend/src/app/icon.tsx`, `frontend/src/app/opengraph-image.tsx` (new colors/mark)

**Acceptance Criteria:**
- [ ] `--accent` is ultramarine in light and dark; used by links, focus ring, CTAs
- [ ] Risk ramp vars (`--risk-low/mid/high`) unchanged
- [ ] Wordmark renders `RISK/PILOT` with ultramarine slash, Space Grotesk 700
- [ ] Both themes pass existing e2e `theme.spec.ts`

**Verify:** `cd frontend && npx tsc --noEmit && npx playwright test e2e/theme.spec.ts e2e/redesign.spec.ts --reporter=line` → all pass

**Steps:**

- [ ] **Step 1: Replace chrome tokens in `globals.css`** (risk ramp untouched):

```css
:root {
  --bg: oklch(97.8% 0.003 250);
  --bg-grain: oklch(96.2% 0.003 250);
  --surface: oklch(100% 0 0);
  --surface-raised: oklch(99% 0.002 250);
  --ink: oklch(19% 0.014 268);
  --ink-soft: oklch(45% 0.014 268);
  --ink-faint: oklch(51% 0.012 268);
  --rule: oklch(90.5% 0.006 264);
  --rule-strong: oklch(82% 0.01 264);
  /* the ONE chrome accent — International-Klein-ish ultramarine */
  --accent: oklch(45% 0.26 265);
  --accent-soft: oklch(45% 0.26 265 / 0.09);
}
[data-theme="dark"] {
  --bg: oklch(21% 0.012 264);
  --bg-grain: oklch(24% 0.012 264);
  --surface: oklch(26% 0.012 264);
  --surface-raised: oklch(29% 0.012 264);
  --ink: oklch(94% 0.004 250);
  --ink-soft: oklch(78% 0.008 250);
  --ink-faint: oklch(70% 0.01 250);
  --rule: oklch(36% 0.008 264);
  --rule-strong: oklch(46% 0.01 264);
  --accent: oklch(72% 0.17 265);   /* desaturated + lifted for dark */
  --accent-soft: oklch(72% 0.17 265 / 0.16);
}
```

Also update: `a { color: var(--ink); }` stays, but `:focus-visible { outline: 2px solid var(--accent); }` (was `--risk-low`), and `.verified` chip in `page.module.css` switches `background: var(--risk-low-soft)` → `var(--accent-soft)`.

- [ ] **Step 2: Create `Wordmark.tsx`:**

```tsx
import Link from "next/link";

import styles from "./wordmark.module.css";

// Type-only brand mark: RISK/PILOT — the slash is the logo (pilot's checklist
// tick), set in the accent. Pure text: zero image bytes, themes for free.
export function Wordmark() {
  return (
    <Link href="/" className={styles.mark} aria-label="RiskPilot home">
      RISK<span className={styles.slash}>/</span>PILOT
    </Link>
  );
}
```

Create `frontend/src/components/layout/wordmark.module.css`:

```css
.mark {
  font-family: var(--font-display), ui-sans-serif, system-ui, sans-serif;
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.01em;
  text-decoration: none;
  color: var(--ink);
}
.slash {
  color: var(--accent);
  margin: 0 1px;
}
```

- [ ] **Step 3: Use it in `Masthead.tsx`** — replace the brand `<Link>` block with `<Wordmark />`; delete `.brand`/`.brandAccent` styles from `page.module.css`.

- [ ] **Step 4: Update `icon.tsx` + `opengraph-image.tsx`** — background `#101116`, mark = white "R/" with `#3b52ff` slash (ImageResponse inline styles).

- [ ] **Step 5: Verify + commit**

Run: `cd frontend && npx tsc --noEmit && npm run build && npx playwright test e2e/theme.spec.ts e2e/redesign.spec.ts --reporter=line`
Expected: build + specs pass.

```bash
git add frontend/src/app/globals.css frontend/src/components/layout/ frontend/src/app/page.module.css frontend/src/app/icon.tsx frontend/src/app/opengraph-image.tsx
git commit -m "feat(brand): ultramarine token system + RISK/PILOT wordmark"
```

---

### Task 2: Story-first homepage

**Goal:** Hero with thesis + CTAs; sample X-Ray demoted with kicker; what-if teaser strip; universe index gets sector grouping + filter; how-it-works restyled by tokens automatically.

**Files:**
- Create: `frontend/src/components/home/Hero.tsx`, `hero.module.css`
- Create: `frontend/src/components/home/WhatIfTeaser.tsx`, `what-if-teaser.module.css`
- Modify: `frontend/src/app/page.tsx` (section order)
- Modify: `frontend/src/components/home/InstrumentIndex.tsx` (sector groups + filter input)
- Modify: `frontend/e2e/redesign.spec.ts` (h1 = hero headline now)

**Acceptance Criteria:**
- [ ] Above the fold: headline, support line, 2 CTAs — no dashboard
- [ ] Sample dashboard below, kicker "SAMPLE PORTFOLIO — LIVE FROM THE ENGINE"
- [ ] Teaser shows `74 → 61` style delta linking to `/analyze`
- [ ] Exactly one `<h1>` (the hero headline); sample verdict becomes `<h2>`

**Verify:** `npx playwright test e2e/redesign.spec.ts --reporter=line` + visual snapshot refresh

**Steps:**

- [ ] **Step 1: `Hero.tsx`:**

```tsx
import Link from "next/link";

import styles from "./hero.module.css";

export function Hero() {
  return (
    <section className={`${styles.hero} stage stage-1`} aria-labelledby="hero-h">
      <h1 id="hero-h" className={styles.headline}>
        Think twice before your next trade.
      </h1>
      <p className={styles.support}>
        Deterministic risk math, explained by an AI that{" "}
        <strong>cannot invent numbers</strong>.
      </p>
      <div className={styles.ctas}>
        <Link href="/analyze" className={styles.primary}>
          Analyze my portfolio →
        </Link>
        <a href="#sample" className={styles.secondary}>
          See a sample X-Ray
        </a>
      </div>
    </section>
  );
}
```

`hero.module.css` — display headline `clamp(2.6rem, 1.6rem + 4.5vw, 4.6rem)` in `--font-display`, `max-width: 16ch`, `text-wrap: balance`; `.primary` = accent bg, white text, 44px min-height; `.secondary` = 1px ink outline. Both `border-radius: var(--radius-sm)`.

- [ ] **Step 2: `WhatIfTeaser.tsx`** — static strip (no fetch):

```tsx
import Link from "next/link";

import styles from "./what-if-teaser.module.css";

// Static teaser: sells the simulator in one glance. Numbers are illustrative
// and labeled as such — they are NOT engine output, so they must not imitate it.
export function WhatIfTeaser() {
  return (
    <Link href="/analyze" className={styles.strip}>
      <span className="caption">What if…</span>
      <span className={styles.example}>
        Cut NVDA 40% → 25% <span className={styles.delta}>risk 74 → 61</span>
      </span>
      <span className={styles.go}>Try it on your portfolio →</span>
    </Link>
  );
}
```

- [ ] **Step 3: Reorder `page.tsx`:** `Masthead → Hero → searchRow → <section id="sample"> kicker + Dashboard → WhatIfTeaser → HowItWorks → InstrumentIndex`. Demote sample verdict: in `VerdictHeadline.tsx` change `<h1>` → `<h2>` (hero owns h1 now; AnalystView's `<h1 className={styles.headline}>` also → `<h2>`).

- [ ] **Step 4: InstrumentIndex sector grouping** — group `universe` by `sector` into labeled rows; add client filter input (this makes the component `"use client"`; keep chips as `<Link>`s so they stay crawlable in the RSC payload).

- [ ] **Step 5: Verify + refresh snapshots + commit**

Run: `npx playwright test e2e/redesign.spec.ts --reporter=line && npx playwright test e2e/visual.spec.ts --update-snapshots --reporter=line`

```bash
git add frontend/src frontend/e2e
git commit -m "feat(home): story-first hero, sample demoted, what-if teaser"
```

---

## Phase 2 — Universe expansion (~100 tickers)

### Task 3: Sector-block correlation + 100-asset synthetic universe

**Goal:** Replace the hand-tuned 12×12 correlation matrix with a sector-block builder that scales; expand `_ASSETS` to ~100 names; regenerate `prices.csv`; integrity tests.

**Files:**
- Modify: `backend/src/riskpilot/risk_engine/dataset.py`
- Create: `backend/src/riskpilot/risk_engine/universe.py` (asset table lives here)
- Test: `backend/tests/test_universe.py`
- Regenerate: `backend/data/prices.csv`
- Modify: `DATA_SOURCE.md` (document expansion, still synthetic)

**Acceptance Criteria:**
- [ ] ≥ 96 tickers + SPY, ≥ 8 sectors
- [ ] Correlation built per sector-block, projected PSD (reuse existing projection)
- [ ] Same seed → identical `prices.csv` (regeneration is reproducible)
- [ ] Integrity test: every ticker has `TRADING_DAYS` prices, all finite & > 0

**Verify:** `cd backend && python -m pytest tests/test_universe.py tests/ -x -q` → pass

**Steps:**

- [ ] **Step 1: Write failing tests** `backend/tests/test_universe.py`:

```python
"""Universe integrity: the committed dataset must be complete and reproducible.

These tests guard the ~100-ticker expansion: every listed asset needs a full,
finite, positive price history, and the sector-block correlation matrix must be
a valid correlation matrix BEFORE projection (sanity) and PSD after.
"""
import numpy as np
import pytest

from riskpilot.risk_engine.dataset import TRADING_DAYS, load_prices
from riskpilot.risk_engine.universe import ASSETS, SECTOR_CORR, sector_block_correlation


def test_universe_size_and_sectors():
    tickers = [t for t in ASSETS if t != "SPY"]
    assert len(tickers) >= 96
    assert len({spec.sector for spec in ASSETS.values()}) >= 8


def test_every_asset_has_full_finite_history():
    series = load_prices()
    for ticker in ASSETS:
        prices = np.asarray(series[ticker])
        assert prices.shape == (TRADING_DAYS,), ticker
        assert np.all(np.isfinite(prices)), ticker
        assert np.all(prices > 0), ticker


def test_block_correlation_is_valid():
    corr = sector_block_correlation()
    n = len(ASSETS)
    assert corr.shape == (n, n)
    assert np.allclose(np.diag(corr), 1.0)
    assert np.allclose(corr, corr.T)
    eigvals = np.linalg.eigvalsh(corr)
    assert eigvals.min() > -1e-8  # PSD after projection


def test_regeneration_is_deterministic(tmp_path):
    from riskpilot.risk_engine.dataset import generate_prices
    a = generate_prices()
    b = generate_prices()
    for t in a:
        assert np.allclose(a[t], b[t])
```

Run: `python -m pytest tests/test_universe.py -x -q` → FAIL (`universe` module missing).

- [ ] **Step 2: Create `universe.py`.** `AssetSpec = NamedTuple(drift, vol, start, sector)`. Table: full S&P-100-ish list — Technology (AAPL MSFT NVDA AMD AVGO CRM ORCL ADBE CSCO INTC QCOM TXN IBM NOW AMAT MU PANW SNPS), Communication (GOOGL META NFLX DIS TMUS VZ T CMCSA), Consumer Discretionary (AMZN TSLA HD MCD NKE SBUX LOW TJX BKNG GM F), Financials (JPM BAC WFC GS MS BLK SCHW AXP V MA C USB), Healthcare (JNJ UNH LLY PFE MRK ABBV TMO ABT DHR BMY AMGN GILD CVS MDT ISRG), Consumer Staples (KO PG PEP COST WMT MDLZ CL KMB GIS), Energy (XOM CVX COP SLB EOG OXY), Industrials (CAT BA HON UPS RTX LMT DE GE UNP FDX), Utilities/Real Estate/Materials (NEE DUK SO AMT PLD LIN SHW APD), plus SPY. Vol range 0.14 (staples) – 0.55 (TSLA); drift 0.04–0.28; start prices realistic. `SECTOR_CORR`: sector-level matrix (Tech↔Tech names 0.62 intra; Tech↔Comm 0.55; Staples↔Tech 0.25; Energy↔Tech 0.18; everything↔SPY 0.45–0.85 by beta intent). `sector_block_correlation()` expands sector matrix to per-asset matrix: `corr[i,j] = intra[sector] if same sector else SECTOR_CORR[si][sj]`, diag 1.

- [ ] **Step 3: Refactor `dataset.py`** — `_ASSETS`/matrix moves out; import from `universe.py`; extract `generate_prices()` (pure, seeded) from the existing generation path; keep PSD projection; CSV read/write unchanged. Regenerate: `python -m riskpilot.risk_engine.dataset` (add `if __name__ == "__main__": write_csv()`).

- [ ] **Step 4: Run full backend suite** — sample-portfolio tests must still pass (the original 11 tickers keep their spec rows so existing fixtures stay valid; if sample facts shift because correlations changed, regenerate `frontend/src/lib/demo-report.json` fixture via `make` target and update affected fixture assertions deliberately, in this commit).

Run: `python -m pytest tests/ -x -q`

- [ ] **Step 5: Update `DATA_SOURCE.md`** (universe list + honesty note) **+ commit**

```bash
git add backend/src/riskpilot/risk_engine/ backend/tests/test_universe.py backend/data/prices.csv DATA_SOURCE.md frontend/src/lib/demo-report.json
git commit -m "feat(engine): ~100-ticker synthetic universe with sector-block correlations"
```

---

## Phase 3 — Endpoints

### Task 4: Weight-based portfolio input in the engine

**Goal:** `compute_report_from_weights({"NVDA": 40.0, ...})` — weights in %, converted to shares via latest price so downstream math is unchanged.

**Files:**
- Modify: `backend/src/riskpilot/risk_engine/portfolio.py`
- Test: `backend/tests/test_portfolio_weights.py`

**Acceptance Criteria:**
- [ ] Weights must sum to 100 ± 0.5 → else `ValueError("weights must sum to 100")`
- [ ] 2–20 holdings enforced here (engine-level guard)
- [ ] Resulting `facts.concentration_pct_top3` matches the input weights exactly (top-3 sum)

**Verify:** `python -m pytest tests/test_portfolio_weights.py -x -q`

**Steps:**

- [ ] **Step 1: Failing tests:**

```python
import pytest

from riskpilot.risk_engine.portfolio import compute_report_from_weights


def test_weights_produce_matching_concentration():
    holdings, facts = compute_report_from_weights(
        {"NVDA": 40.0, "AAPL": 25.0, "KO": 20.0, "JNJ": 15.0}
    )
    assert facts.concentration_pct_top3 == pytest.approx(85.0, abs=0.1)


def test_weights_must_sum_to_100():
    with pytest.raises(ValueError, match="sum to 100"):
        compute_report_from_weights({"NVDA": 50.0, "AAPL": 40.0})


def test_bounds_on_holding_count():
    with pytest.raises(ValueError, match="2"):
        compute_report_from_weights({"NVDA": 100.0})
```

Run → FAIL (function missing).

- [ ] **Step 2: Implement in `portfolio.py`:**

```python
MIN_WEIGHTED_HOLDINGS = 2
MAX_WEIGHTED_HOLDINGS = 20
_WEIGHT_SUM_TOLERANCE = 0.5


def compute_report_from_weights(
    weights_pct: dict[str, float],
) -> tuple[list[Holding], RiskFacts]:
    """Weight-based entry point for the /analyze builder. Converts weights to
    synthetic share counts (weight / latest price on a 100-unit book) so ALL
    downstream math is the battle-tested shares path — one source of truth."""
    normalized = {t.strip().upper(): float(w) for t, w in weights_pct.items()}
    n = len(normalized)
    if not MIN_WEIGHTED_HOLDINGS <= n <= MAX_WEIGHTED_HOLDINGS:
        raise ValueError(
            f"needs {MIN_WEIGHTED_HOLDINGS}-{MAX_WEIGHTED_HOLDINGS} holdings, got {n}"
        )
    if any(w <= 0 for w in normalized.values()):
        raise ValueError("every holding needs positive weight")
    total = sum(normalized.values())
    if abs(total - 100.0) > _WEIGHT_SUM_TOLERANCE:
        raise ValueError(f"weights must sum to 100, got {total:.2f}")

    allow = _allow_set()
    unknown = sorted(t for t in normalized if t not in allow)
    if unknown:
        raise UnknownHolding(unknown)

    series = load_prices()
    latest = {t: series[t][-1] for t in normalized}
    shares = {t: w / latest[t] for t, w in normalized.items()}
    return compute_report(shares)
```

- [ ] **Step 3: Run tests → PASS; commit**

```bash
git add backend/src/riskpilot/risk_engine/portfolio.py backend/tests/test_portfolio_weights.py
git commit -m "feat(engine): weight-based portfolio input (compute_report_from_weights)"
```

---

### Task 5: `POST /score` — math-only fast path

**Goal:** Deterministic facts without LLM, for the simulator loop. Route module provably imports zero LLM code.

**Files:**
- Create: `backend/src/riskpilot/score_api.py` (facts-only builder, no llm imports)
- Modify: `backend/src/riskpilot/main.py` (route)
- Modify: `backend/src/riskpilot/schema.py` (add `WeightedHolding`, `ScoreResponse`)
- Test: `backend/tests/test_score_endpoint.py`
- Modify: `backend/tests/test_no_llm_in_engine.py` (cover `score_api`)

**Acceptance Criteria:**
- [ ] `POST /score` `{holdings:[{ticker, weight_pct}]}` → `{facts: RiskFacts, holdings: [...]}` in < LLM path time (no explain call)
- [ ] 422 unknown tickers, 400 bad weights/count, 401 without secret
- [ ] Import-lint: `riskpilot.score_api` transitive imports contain no `riskpilot.llm`

**Verify:** `python -m pytest tests/test_score_endpoint.py tests/test_no_llm_in_engine.py -x -q`

**Steps:**

- [ ] **Step 1: Failing tests** (FastAPI `TestClient`, follow existing endpoint-test style, secret header from test config):

```python
def test_score_returns_facts_no_explanation(client, secret_headers):
    res = client.post("/score", json={"holdings": [
        {"ticker": "NVDA", "weight_pct": 60}, {"ticker": "KO", "weight_pct": 40}]},
        headers=secret_headers)
    assert res.status_code == 200
    body = res.json()
    assert "facts" in body and "explanation" not in body


def test_score_rejects_bad_sum(client, secret_headers):
    res = client.post("/score", json={"holdings": [
        {"ticker": "NVDA", "weight_pct": 60}, {"ticker": "KO", "weight_pct": 20}]},
        headers=secret_headers)
    assert res.status_code == 400


def test_score_unknown_ticker_422(client, secret_headers):
    res = client.post("/score", json={"holdings": [
        {"ticker": "ZZZZ", "weight_pct": 50}, {"ticker": "KO", "weight_pct": 50}]},
        headers=secret_headers)
    assert res.status_code == 422
```

- [ ] **Step 2: Schema additions:**

```python
class WeightedHolding(BaseModel):
    ticker: str
    weight_pct: float = Field(..., gt=0, le=100)


class ScoreResponse(BaseModel):
    holdings: list[Holding]
    facts: RiskFacts
    score_version: str
```

- [ ] **Step 3: `score_api.py`** — thin: `def score_weights(weights) -> ScoreResponse` calling `compute_report_from_weights`; import ONLY from `risk_engine` + `schema`. Route in `main.py` maps `ValueError` → 400, `UnknownHolding` → 422, same `require_internal_secret` dependency.

- [ ] **Step 4: Extend import-lint test** — existing `test_no_llm_in_engine.py` walks module imports; add `riskpilot.score_api` to the guarded roots.

- [ ] **Step 5: Run, commit**

```bash
git add backend/src/riskpilot/score_api.py backend/src/riskpilot/main.py backend/src/riskpilot/schema.py backend/tests/
git commit -m "feat(api): POST /score math-only fast path with LLM import lint"
```

---

### Task 6: Weights on `POST /report` + guardrail coverage

**Goal:** Full pipeline (math → LLM → guardrail) accepts weight input.

**Files:**
- Modify: `backend/src/riskpilot/main.py` (`PortfolioRequest` accepts `weighted: list[WeightedHolding] | None`), `backend/src/riskpilot/report.py` (`build_report_from_weights`)
- Test: `backend/tests/test_report_weights.py`

**Acceptance Criteria:**
- [ ] `POST /report` with `{weighted:[...]}` returns full `RiskReport` (explanation included, source stamped)
- [ ] Existing shares-based requests unchanged (backward compatible)
- [ ] Guardrail test: injected hallucination in DEMO fixture on a weighted portfolio → fail-closed template fallback (reuse existing guardrail test harness pattern)

**Verify:** `python -m pytest tests/test_report_weights.py tests/test_number_guardrail.py -x -q`

**Steps:**

- [ ] **Step 1: Failing test** — weighted request → 200, `explanation.source` in known set; shares request still 200.
- [ ] **Step 2:** `build_report_from_weights(config, weights)` mirrors `build_report_from_holdings` but calls `compute_report_from_weights`; `portfolio_name="Your portfolio"`, `as_of=f"computed {date.today().isoformat()} · synthetic illustrative data"`.
- [ ] **Step 3:** Request model: exactly one of `holdings` / `weighted` must be set, else 400:

```python
class PortfolioRequest(BaseModel):
    holdings: list[Holding] | None = None
    weighted: list[WeightedHolding] | None = None
```

- [ ] **Step 4: Run, commit** — `git commit -m "feat(api): weight-based input on POST /report"`

---

### Task 7: Next.js proxies for score + weighted report

**Goal:** Browser-callable `/api/score` and `/api/report` (weighted) with server-side secret, zod validation at the boundary.

**Files:**
- Create: `frontend/src/app/api/score/route.ts`
- Modify: `frontend/src/app/api/report/route.ts` (accept weighted body)
- Modify: `frontend/src/lib/backend.ts` (`scorePortfolio`, `analyzeWeighted`)
- Test: `frontend/src/lib/__tests__/backend-validation.test.ts` (vitest, zod schema unit tests)

**Acceptance Criteria:**
- [ ] Client body validated with zod BEFORE reaching the engine (3–20 rows, weights >0, sum 100±0.5, ticker `/^[A-Z.]{1,6}$/`)
- [ ] `/api/score` timeout 2500ms, no-store; engine down → `{ok:false, reason:"engine_unavailable"}` — never fabricated numbers
- [ ] Secret never present in any client bundle (`grep -r INTERNAL_SHARED frontend/.next/static` → empty)

**Verify:** `cd frontend && npx vitest run src/lib/__tests__/backend-validation.test.ts && npx tsc --noEmit`

**Steps:**

- [ ] **Step 1:** zod schema in `frontend/src/lib/portfolio-schema.ts`:

```ts
import { z } from "zod";

export const MIN_HOLDINGS = 3;
export const MAX_HOLDINGS = 20;
export const WEIGHT_SUM_TOLERANCE = 0.5;

export const weightedHolding = z.object({
  ticker: z.string().regex(/^[A-Z.]{1,6}$/),
  weight_pct: z.number().gt(0).lte(100),
});

export const weightedPortfolio = z
  .array(weightedHolding)
  .min(MIN_HOLDINGS)
  .max(MAX_HOLDINGS)
  .refine(
    (rows) => Math.abs(rows.reduce((s, r) => s + r.weight_pct, 0) - 100) <= WEIGHT_SUM_TOLERANCE,
    { message: "weights must sum to 100" },
  );
```

(vitest first: valid passes, 2 rows fails, sum 99 fails, lowercase ticker fails.)

- [ ] **Step 2:** `scorePortfolio` in `backend.ts` (server-only, mirrors `analyzePortfolio`, POSTs `/score`, 2500ms). Route handlers parse with zod → 400 on fail → forward.
- [ ] **Step 3:** Run vitest, `npm run build`, grep bundle for secret. Commit: `git commit -m "feat(web): /api/score proxy + weighted report with zod boundary validation"`

---

## Phase 4 — `/analyze` builder

### Task 8: Portfolio state library (TDD)

**Goal:** Pure TS state logic: add/remove holdings, weight normalize with locks, URL serialize/parse.

**Files:**
- Create: `frontend/src/lib/portfolio-state.ts`
- Test: `frontend/src/lib/__tests__/portfolio-state.test.ts`

**Acceptance Criteria:**
- [ ] `addHolding` equal-splits unlocked weight; `setWeight(t, w)` rebalances OTHER unlocked rows proportionally; locked rows never move
- [ ] Sum always exactly 100 (± float epsilon) after every operation
- [ ] `serialize`/`parse` round-trip: `"NVDA:40,AAPL:25.5"` ↔ rows (invalid segments dropped, not thrown)
- [ ] All operations immutable (return new arrays)

**Verify:** `npx vitest run src/lib/__tests__/portfolio-state.test.ts`

**Steps:**

- [ ] **Step 1: Failing tests** (core cases):

```ts
import { describe, expect, test } from "vitest";

import { addHolding, parsePortfolio, serializePortfolio, setWeight, toggleLock } from "../portfolio-state";

test("addHolding equal-splits among unlocked", () => {
  let rows = addHolding([], "NVDA");
  rows = addHolding(rows, "AAPL");
  expect(rows.map((r) => r.weightPct)).toEqual([50, 50]);
});

test("setWeight rebalances only unlocked others", () => {
  let rows = [
    { ticker: "NVDA", weightPct: 40, locked: false },
    { ticker: "AAPL", weightPct: 30, locked: true },
    { ticker: "KO", weightPct: 30, locked: false },
  ];
  rows = setWeight(rows, "NVDA", 60);
  expect(rows.find((r) => r.ticker === "AAPL")!.weightPct).toBe(30);
  expect(rows.find((r) => r.ticker === "KO")!.weightPct).toBeCloseTo(10);
  expect(rows.reduce((s, r) => s + r.weightPct, 0)).toBeCloseTo(100);
});

test("URL round-trip", () => {
  const rows = parsePortfolio("NVDA:40,AAPL:25.5,KO:34.5");
  expect(serializePortfolio(rows)).toBe("NVDA:40,AAPL:25.5,KO:34.5");
});

test("parse drops garbage segments", () => {
  expect(parsePortfolio("NVDA:40,???,AAPL:-5")).toHaveLength(1);
});
```

- [ ] **Step 2: Implement** — `Row = {ticker, weightPct, locked}`; `setWeight` clamps target to `[0.5, 100 - Σlocked - 0.5·(unlockedOthers)]`, distributes remainder proportionally to current unlocked weights (equal if all zero); round to 0.1 at the end, absorb rounding drift into the largest unlocked row.
- [ ] **Step 3: PASS + commit** — `git commit -m "feat(web): portfolio state lib (normalize, locks, URL serialization)"`

---

### Task 9: `/analyze` page rebuild — builder + run + report

**Goal:** Replace CSV-paste UI with the builder; run → same Dashboard; URL + localStorage state.

**Files:**
- Rewrite: `frontend/src/app/analyze/page.tsx`, `analyze.module.css`
- Create: `frontend/src/components/analyze/PortfolioBuilder.tsx`, `portfolio-builder.module.css`
- Reuse: `SearchPalette` universe search for the add-holding input
- Delete: `frontend/src/lib/parse-holdings.ts` + its tests IF nothing else imports them (check `grep -r parse-holdings frontend/src`); otherwise leave

**Acceptance Criteria:**
- [ ] Add via search (universe-bounded), row = ticker · sector · weight number-input · lock · remove
- [ ] Run fires `/api/report` weighted; skeleton mirrors report; 422/400/offline each get distinct visible states
- [ ] Report renders with banner "YOUR PORTFOLIO · computed <as_of>" above the standard Dashboard
- [ ] URL updates on every builder change (`router.replace`, no history spam); cold-load of a portfolio URL restores builder; localStorage offers "Resume last portfolio"
- [ ] Weight inputs + all controls ≥ 44px touch targets, keyboard operable, both themes

**Verify:** `npx tsc --noEmit && npm run build`; manual: `npm run dev` + walk the flow (full e2e lands in Task 12)

**Steps:**

- [ ] **Step 1:** `PortfolioBuilder` (client): rows from `portfolio-state`, search input opens bounded palette list, weight `<input type="number" step="0.5">` + slider-free (sliders live in the simulator); footer bar: total (always 100), holding count, **Run the X-Ray →** disabled below 3 with reason text.
- [ ] **Step 2:** Page state machine mirrors today's (`idle | scoring | result | errors | offline`) but source of truth = builder rows; on result, render `<Dashboard report={...}/>` under the banner; "Edit portfolio" returns to builder keeping rows.
- [ ] **Step 3:** URL sync: `useSearchParams` read on mount → `parsePortfolio(p)`; write via `router.replace(\`/analyze?p=${serializePortfolio(rows)}\`)` in an effect debounced 300ms. localStorage `rp-last-portfolio` written on successful run.
- [ ] **Step 4: Commit** — `git commit -m "feat(analyze): interactive weighted portfolio builder"`

---

## Phase 5 — What-if simulator

### Task 10: `WhatIfPanel`

**Goal:** In-report sliders → debounced `/api/score` → delta display. No LLM per keystroke.

**Files:**
- Create: `frontend/src/components/whatif/WhatIfPanel.tsx`, `what-if-panel.module.css`
- Create: `frontend/src/hooks/useDebouncedScore.ts`
- Modify: `frontend/src/components/dashboard/CoachView.tsx` + `AnalystView.tsx` (render panel under stats when `onScore` context available)
- Modify: `frontend/src/components/dashboard/RiskGauge.tsx` (accept animated `targetScore` prop if not already animatable)

**Acceptance Criteria:**
- [ ] Slider per holding (range 0.5–95, step 0.5) + remove toggle + Reset; locks shared with builder semantics
- [ ] Debounced 250ms `/api/score`; in-flight → shimmer on numbers; response → `74 → 61` delta pair, gauge animates, changed stats old→new
- [ ] Band color of the TARGET score colors the delta
- [ ] 1 remaining holding → panel disabled with note; `/api/score` failure → panel grays with retry, report intact
- [ ] Stale responses discarded (request id guard) — never show numbers that don't match current slider state

**Verify:** `npx vitest run src/hooks/__tests__/useDebouncedScore.test.ts && npx tsc --noEmit`

**Steps:**

- [ ] **Step 1:** `useDebouncedScore` hook (vitest with fake timers first): takes rows, returns `{facts, pending, error, requestId}`; debounce 250ms; increment id per fire, ignore responses with stale id; abort in-flight via `AbortController`.
- [ ] **Step 2:** Panel UI: kicker "WHAT IF", slider rows (native `<input type="range">` styled by tokens — accent track fill, 44px hit area), delta header `num` display font.
- [ ] **Step 3:** Wire into report views: panel receives the analyzed rows (sample report → its holdings' weights derived from `market_value` shares; custom → builder rows).
- [ ] **Step 4: Commit** — `git commit -m "feat(whatif): slider simulator on /score fast path"`

---

### Task 11: Explain-this-version

**Goal:** User-triggered full re-explain of the modified weights.

**Files:**
- Modify: `frontend/src/components/whatif/WhatIfPanel.tsx` (button + state)
- Modify: report views to swap explanation blocks when a what-if explanation is active (label "EXPLAINING YOUR WHAT-IF", link "back to original read")

**Acceptance Criteria:**
- [ ] Button appears only when current sliders differ from analyzed portfolio
- [ ] Fires `/api/report` weighted; skeleton over explanation area only; guardrail source label preserved
- [ ] Failure → explanation area shows retry, original read restorable

**Verify:** `npx tsc --noEmit && npm run build`

**Steps:**

- [ ] **Step 1:** Dirty check = `serializePortfolio(current) !== serializePortfolio(analyzed)`.
- [ ] **Step 2:** On success, swap `explanation` prop passed to the active view; keep original in state for "back to original read".
- [ ] **Step 3: Commit** — `git commit -m "feat(whatif): user-triggered re-explain of modified portfolio"`

---

### Task 12: E2E + visual regression sweep

**Goal:** Whole story covered end-to-end; snapshots refreshed.

**Files:**
- Create: `frontend/e2e/analyze-flow.spec.ts`, `frontend/e2e/whatif.spec.ts`
- Modify: `frontend/e2e/visual.spec.ts` (add `/analyze` routes)
- Modify: `frontend/playwright.config.ts` only if a mock engine route is needed (prefer Next route handlers hitting real local backend; if backend absent in CI, `page.route("/api/score", …)` fixture stubs INSIDE specs)

**Acceptance Criteria:**
- [ ] Specs: build 4-holding portfolio → run → report renders verdict; slider move → delta appears; re-explain swaps prose; portfolio URL cold-load restores; `/api/score` 500 → panel retry state; engine-down `/analyze` run → offline panel
- [ ] Visual snapshots at 320/768/1440 light+dark include `/analyze` builder + report + panel
- [ ] Full suite green: `npx playwright test --reporter=line`

**Steps:**

- [ ] **Step 1:** Write specs (deterministic waits on visible text, no timeouts; stub `/api/score` + `/api/report` with `page.route` fixtures so CI needs no Python backend).
- [ ] **Step 2:** `npx playwright test --update-snapshots` for new routes; commit snapshots.
- [ ] **Step 3: Commit** — `git commit -m "test(e2e): analyze + what-if flows, visual snapshots"`

---

### Task 13: Docs + deploy checklist

**Goal:** README/PLAN reflect v2; deploy verified.

**Files:**
- Modify: `README.md` (new screenshots, analyze flow, universe honesty), `PLAN.md` (phase log), `COMPLIANCE.md` only if wording referenced red branding

**Acceptance Criteria:**
- [ ] README quickstart still accurate (`make doctor/install/dev`)
- [ ] Railway backend redeployed with new endpoints; Vercel env unchanged; smoke: `curl -s $BACKEND/health` ok, deployed `/analyze` run succeeds
- [ ] `git log` clean conventional commits; PR opened with plan-linked summary

**Steps:**

- [ ] **Step 1:** Update docs; refresh hero screenshot/GIF placeholder note.
- [ ] **Step 2:** Deploy backend (Railway) → frontend (Vercel) → smoke the live flow.
- [ ] **Step 3: Commit + PR** — `git commit -m "docs: v2 redesign + analyze-yours"`, `gh pr create` with summary + test plan.

---

## Self-review notes

- Spec §1 brand → Task 1; §2 homepage → Task 2; universe → Task 3; §3 analyze → Tasks 4,6,7,8,9; §4 simulator → Tasks 5,10,11; §5 testing → embedded per task + Task 12; rollout order preserved as phases.
- Holding-count mismatch resolved: engine allows 2–20 (Task 4); UI/zod enforces 3–20 (Task 7) — engine deliberately looser (simulator can drop to 2 via remove-toggle without a 400).
- Sample-report simulator (spec §4 "sample + custom") wired in Task 10 Step 3.
- Type names consistent: `WeightedHolding{ticker, weight_pct}` (py + proxy), `Row{ticker, weightPct, locked}` (TS state lib) — conversion at the API boundary in Task 9/10 fetch calls.
