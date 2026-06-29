# RiskPilot AI — Plan

> Greenfield project. This file is the plan under review by /autoplan.
> Codex outside voice: UNAVAILABLE this run (CLI v0.120.0 too old for account
> model gpt-5.5; gpt-5/gpt-5-codex blocked on ChatGPT account). Single-model
> review (Claude subagents). Fix: `npm i -g @openai/codex@latest`.

---

# ===== /autoplan CEO PHASE (Phase 1) =====

## Mode: SELECTIVE EXPANSION (autoplan default)

## Step 0A — Premise Challenge

Premises this plan rests on, and the verdict:

| # | Stated premise | Verdict |
|---|----------------|---------|
| P1 | "Risk coach (not stock-picker) is a strong hiring wedge" | **PARTLY WRONG** — the *domain* is saturated. The *engineering* (verifiable LLM, hallucination guardrails) is the real signal, currently buried. |
| P2 | "Separating deterministic math from LLM explanation is differentiating" | **TABLE STAKES, not a moat** — sane default in 2026. Necessary to show, not sufficient to impress. The differentiator is a *measured* hallucination-enforcement layer + eval harness. |
| P3 | "Building the full 5-feature vision makes the project impressive" | **WRONG for a solo junior** — finish risk. 5 features ≈ 3-6 months solo → likely 2.5 half-built, abandoned ~70%. A half-finished repo is a *negative* hiring signal. |
| P4 | "Recruiters/hiring managers will run or read the project" | **MOSTLY WRONG** — 30-90s on a public link, rarely run code, often skip the video. The live deployed URL + top-of-README diagram is ~60% of the value. |
| P5 | "This is just a portfolio project, so compliance doesn't matter" | **WRONG both ways** — scoring a real portfolio's risk + 'review diversification' sits near investment-advice framing (SEC/FINRA). It's a landmine if it drifts to real users, AND a maturity *signal* if you engineer around it visibly. |
| P6 | "Live/real financial data is assumed available" | **UNRESOLVED RISK** — no data source named. Wrong prices/volatility = garbage-in = the whole 'reliable math' thesis collapses on contact. |

Real problem to solve (reframed): **"Prove you can ship a deployed, full-stack app
with a reliable, hallucination-resistant LLM layer — measured, tested, and compliance-aware."**
Finance is the demo substrate, not the identity.

## Step 0B — Existing Code Leverage (greenfield)

Nothing exists yet. The leverage question becomes "what to NOT hand-roll":
- Risk math: use real historical data + Pandas/NumPy. Do NOT hand-roll a market-data
  pipeline — bake a small curated sourced dataset into the repo for v1.
- LLM reliability: OpenAI Structured Outputs (Pydantic schema) does the JSON contract.
  The hand-built piece worth building = a *validator that rejects any number the LLM
  emits that's not in the deterministic input* (the headline artifact).
- RAG: defer entirely for v1 (pgvector/embeddings only exist to serve it).

## Step 0C — Dream State

```
CURRENT (empty dir)  -->  THIS PLAN (v1 reframed)  -->  12-MONTH IDEAL
                          deployed full-stack app       a verifiable-LLM
                          + measured LLM-reliability     reliability pattern
                          layer + compliance writeup,    reused across domains;
                          ONE feature done to polish.    finance is one demo.
```

## Step 0C-bis — Implementation Alternatives

```
APPROACH A: "Reframe to rigor, ship 1 feature deployed" (RECOMMENDED)
  Summary: Cut to Portfolio X-Ray + AI Risk Explanation. Deploy week 1 (empty
           full stack). Headline = hallucination-enforcement validator + eval
           harness + compliance writeup. Real sourced sample data, no auth,
           recruiter demo button.
  Effort:  M (human ~2-3 wk / CC ~2-4 days)
  Risk:    Low — small surface, finishable, deployed early.
  Pros:    Finishable; deployed; differentiates on rigor not concept; broad
           hiring surface; low legal/data risk.
  Cons:    Less visually feature-rich; "only" one feature on day one.
  Reuses:  Structured Outputs, Pandas, Vercel+Render.

APPROACH B: "Build the full 5-feature vision as written" (user's stated plan)
  Summary: X-Ray + AI Explanation + FOMO Journal + Scenario Sim + RAG, auth,
           CSV upload, daily history, pgvector.
  Effort:  XL (human ~3-6 mo / CC ~3-5 wk if nothing slips)
  Risk:    High — finish risk, data-source risk, RAG-abandonment risk.
  Pros:    If finished, broad feature surface; FOMO journal is personal/distinct.
  Cons:    Most likely abandoned ~70%; saturated framing; legal surface grows
           with every real-data feature.
  Reuses:  Everything in the stack (which is the problem — large surface).

APPROACH C: "Reliability-primitive-first, finance as demo app"
  Summary: Headline the repo as a reusable verifiable-structured-output LLM
           pipeline + eval harness; risk-coach is the showcase app on top.
  Effort:  M-L (human ~3-4 wk / CC ~1 wk)
  Risk:    Med — slightly more abstraction; needs a clean library/app split.
  Pros:    Hireable across ANY LLM team, not just fintech; lowest data/legal risk;
           dodges saturation hardest.
  Cons:    Two artifacts to keep clean; finance demo can feel thinner.
```

RECOMMENDATION: **A** — finishable + deployed + differentiated, mapped to
"explicit over clever" and "completeness is cheap but finish risk is real for a
solo junior." C is the strongest *positioning* and is mostly A with a README/repo
framing tweak — treat C's framing as a layer on top of A.

## Step 0E — Temporal Interrogation

```
HOUR 1  (foundations): Deploy target decided NOW? (Vercel + Render/Fly + Postgres).
                       Pydantic risk-report schema shape locked before any LLM call.
HOUR 2-3 (core):       Where do the numbers come from? (sourced sample dataset).
                       Validator: how do we assert the LLM used ONLY backend numbers?
HOUR 4-5 (integrate):  Recruiter demo path with no signup; rate-limit + cache the
                       live LLM call so a public demo doesn't burn the API key.
HOUR 6+ (polish):      Eval harness numbers in README; compliance/safety writeup.
```
With CC+gstack the 6 human hours compress to ~30-60 min of wall-clock per loop.

## Step 0F — Mode + Scope DECISION (user-confirmed at gate)

**DECISION: v1 = Approach A. Two features only.** Portfolio X-Ray + AI Risk
Explanation. Deploy week 1. Headline = hallucination-enforcement validator +
eval harness + compliance writeup. Real sourced sample data, no auth, recruiter
demo button. FOMO Journal / Scenario Simulator / RAG deferred to dated milestones.

## CEO DUAL VOICES — CONSENSUS TABLE

```
  Dimension                            Claude   Codex   Consensus
  ──────────────────────────────────── ──────── ─────── ──────────
  1. Premises valid?                   NO        N/A     Claude: 4 of 6 premises wrong/weak
  2. Right problem to solve?           REFRAME   N/A     Lead with rigor, not "finance coach"
  3. Scope calibration correct?        NO (cut)  N/A     User confirmed cut to 2 features
  4. Alternatives explored?            YES       N/A     A/B/C produced; A chosen
  5. Competitive/market risks covered? NO        N/A     Saturated category; rigor = the hook
  6. 6-month trajectory sound?         RISK      N/A     Was finish-risk; cut + deploy-first fixes it
```
Codex N/A this run (CLI version-incompatible — single-model review).
Single critical finding standing regardless: **deploy week 1 or the project dies
in localhost.**

## What already exists (greenfield)

Nothing in repo. Reuse-not-build map: market data → curated sourced sample dataset
(not a pipeline); JSON contract → OpenAI Structured Outputs + Pydantic; risk math →
Pandas/NumPy; deploy → Vercel + Render/Fly + managed Postgres. Hand-build ONLY the
number-hallucination validator (the headline artifact).

## NOT in scope (v1, deferred with rationale)

- **FOMO / Trade Journal Coach** — strong personal-story feature, but not the
  hireability headline; deferred to M3.
- **Scenario Simulator** — nice demo, multiplies math + UI surface; M4.
- **RAG Research Assistant** — multi-week ingestion, top abandonment risk; M5,
  and only over a tiny fixed committed corpus, never a live pipeline.
- **CSV upload, auth, daily report history** — friction for recruiter demo; v1 uses
  a no-signup pre-loaded sample portfolio. Auth + history return when there are real users.
- **pgvector / embeddings / scikit-learn / S3** — only serve deferred features; cut from v1.

## Dream state delta

v1 leaves us with a deployed, tested, compliance-aware verifiable-LLM app on real
sourced data — the load-bearing 20% of the 12-month ideal. Each deferred feature is
a dated commit showing iteration (itself a hiring signal), not a prerequisite.

## Error & Rescue Registry (v1 surface — CEO pass; eng pass refines)

```
  METHOD/CODEPATH              | WHAT CAN GO WRONG            | EXCEPTION / HANDLING
  ----------------------------|------------------------------|----------------------
  OpenAI structured-output    | API timeout / 429 / 5xx      | retry+backoff, then
   call                       |                              | cached fallback report
                              | malformed/empty JSON         | Pydantic validation
                              |                              | error → reject, retry
                              | LLM emits a number NOT in    | VALIDATOR REJECTS →
                              |  backend input               | regenerate or fail loud
                              | model refusal                | show safe default copy
  risk math engine            | empty portfolio / 1 holding  | guard: min-holdings msg
                              | NaN price / missing sector   | reject row, surface
                              |                              | which row + why
  sample-data load            | dataset file missing/corrupt | startup check, fail loud
```

## Failure Modes Registry (v1, CEO pass)

```
  CODEPATH                  | FAILURE MODE        | RESCUED? | TEST? | USER SEES?      | LOGGED?
  --------------------------|---------------------|----------|-------|-----------------|--------
  LLM number-hallucination  | LLM invents a figure| Y (valid)| MUST  | regenerated/    | Y
                            |                     |          |       | safe report     |
  OpenAI API down           | timeout/5xx         | Y        | SHOULD| "temporarily    | Y
                            |                     |          |       | unavailable"    |
  empty/1-holding portfolio | degenerate math     | Y        | MUST  | "add holdings"  | Y
  bad number in sample data | NaN propagation     | MUST     | SHOULD| which row failed| Y
```
The first row is the headline artifact — its test is non-negotiable for v1.

---

# ===== /autoplan DESIGN PHASE (Phase 2) =====

## Design completeness: 2/10 (plan as written)

Root cause: the plan has **near-zero design/UX spec**. For a recruiter-skimmed
hiring artifact, the design layer (the plan's own P4 says ~60% of value) is the
single largest unaddressed risk. 4 CRITICAL, 12 HIGH findings, all from one gap.

## DESIGN DUAL VOICES — CONSENSUS TABLE

```
  Dimension                            Claude   Codex   Consensus
  ──────────────────────────────────── ──────── ─────── ──────────
  1. Information hierarchy specified?   NO        N/A     No hero, no tier order
  2. Interaction states designed?       NO        N/A     0 of 5 UI states specified
  3. Recruiter first-5-seconds designed?NO        N/A     Highest-leverage missing screen
  4. Visual direction (anti-slop)?      NO        N/A     Defaults to generic AI-finance dashboard
  5. Data-viz a designed system?        NO        N/A     No chart types, no semantic color
  6. Accessibility addressed?           NO        N/A     Absent; risk-color hue-only fails colorblind
  7. UI-placed trust/disclaimer?        NO        N/A     Compliance only in README, not the screen
```
Codex N/A (CLI version-incompatible). Single-model design review.

## Design fix (one upstream action: add a design spec)

- **Hierarchy:** ONE hero = Risk Score gauge + one-line plain-English verdict
  ("Aggressive — 62% in 3 stocks"). Tier 2 = compact bento of deterministic metric
  tiles (the receipts, shown WITH the score = trust). Tier 3 = AI prose + review
  checklist below fold. Holdings table demoted to a disclosure.
- **5 UI states:** On LLM failure, STILL render the full X-Ray (deterministic numbers
  are server-computed independent of LLM) and degrade only the explanation panel. The
  slow LLM call streams into a prose-shaped skeleton — never a full-page spinner. "Partial"
  (numbers ready, prose pending) is the normal state and must look deliberately complete.
- **Recruiter landing = ZERO clicks:** land directly on the populated X-Ray for the
  sample portfolio (pre-rendered + cached server-side), slim banner with framing + an
  optional "watch it re-generate live" button. Recruiter understands what it is and
  that it works without clicking.
- **Make the guardrail VISIBLE:** render each number in the AI prose as a chip traceable
  to its deterministic source + a "Every figure verified against computed data" line. Turns
  the invisible moat into a visible design feature — highest-ROI design move for hireability.
- **Visual direction:** Swiss/editorial "financial instrument" — disciplined grid, tabular
  numerals for all numbers, restrained palette, oversized risk gauge as the one expressive
  element, thin rules not heavy card shadows. Override shadcn/Recharts defaults via a token
  layer. (Avoid auto-dark-mode and glassmorphism — both read "demo," not "instrument.")
- **Chart vocabulary:** radial gauge (hero) + horizontal stacked allocation bar (NOT a pie)
  + sparkline for drawdown, reused consistently. Semantic risk ramp cool→warm, used identically
  everywhere; never hue-only (pair with label/letter for colorblind safety).
- **A11y v1 must-haves:** WCAG AA contrast on risk colors, chart text alternatives (aria-label
  + data table behind disclosure), keyboard-reachable controls with visible focus, ≥44px touch
  targets, `prefers-reduced-motion`. Mobile-first skim test at 375px (recruiters open on phones).
- **UI trust:** persistent quiet disclaimer ("Educational risk coaching, not financial advice")
  in footer + near the AI panel; checklist phrased as questions ("Consider reviewing concentration")
  never imperatives; show "as of [date] · illustrative sample data" on the data.

---

# ===== /autoplan ENG PHASE (Phase 3) =====

## Build-readiness: 6.5/10 (plan as written)

Concept + scope right, but it's a positioning doc wearing an eng-doc's clothes.
3 CRITICALs gate "good idea" → "build-ready": validator spec is near-hollow,
eval harness undefined, demo-caching missing (billing/abuse hole).

## ENG DUAL VOICES — CONSENSUS TABLE

```
  Dimension                            Claude   Codex   Consensus
  ──────────────────────────────────── ──────── ─────── ──────────
  1. Architecture sound?               REFRAME   N/A     2-service split adds friction; collapse origins
  2. Test coverage sufficient?         NO        N/A     Validator + eval harness underspecified
  3. Performance risks addressed?      PARTIAL   N/A     Render cold-start can sink the demo
  4. Security threats covered?         NO        N/A     Public OpenAI key + no demo cache = billing hole
  5. Error paths handled?              PARTIAL   N/A     Infinite-regen loop possible; lumps OpenAI failures
  6. Deployment risk manageable?       PARTIAL   N/A     CORS + cold start are the day-2 time sinks
```
Codex N/A (CLI version-incompatible). Single-model eng review.

## Architecture diagram (recommended topology — collapse to one public origin)

```
  Browser ──HTTPS──> Next.js (Vercel, no sleep)
                       ├─ React UI (Server Components + Recharts)
                       └─ Route Handlers /api/*   [ONLY public surface, same-origin]
                              │  server-to-server, shared secret, private URL
                              ▼
                       Python math+LLM service (Render/Fly)
                              ├─ risk engine (Pandas/NumPy)   [pure, deterministic]
                              ├─ OpenAI Structured Outputs call
                              └─ number-hallucination validator   <-- headline artifact
                              │
                              ▼
                       committed sample dataset    Postgres (optional — report cache only)
```
Property: OpenAI key + validator live in ONE place (Python); browser hits ONE origin
(Next); no public CORS; cold start hidden behind cached report on the happy path.

## Validator spec (the headline artifact — was near-hollow, now concrete)

Structured Outputs already guarantees JSON shape — so the validator's REAL job is
catching wrong numbers in **free-text prose** ("fell 23%" when 23 was never an input).
- Build a render-allow-set per fact (raw, rounded 0/1/2dp, %/$ forms, separators) PLUS
  an epsilon (~1%) numeric match to absorb the model's own rounding.
- Extract every numeric token from all prose fields; a token is grounded if it matches
  the allow-set OR is within epsilon of any fact.
- Safe-number allow-list (small counts "3 stocks", permitted constants) so it doesn't
  false-positive on benign figures.
- On violation: regenerate ONCE with a corrective message, then on 2nd violation fail
  closed to a deterministic TEMPLATE explanation (no LLM). `MAX_LLM_RETRIES=1`, never loop.
  Never silently strip (breaks sentences). Return `explanation_source: model |
  model_regenerated | template_fallback`.
- Single source of truth: compute facts once, round once, pass SAME dict to prompt AND validator.
- pytest (non-negotiable): rejects invented prose number; accepts rounded-grounded number;
  passes benign count; full pipeline falls back to template on repeated violation. Validator
  unit tests feed CANNED model outputs — they do NOT call OpenAI.

## Risk math (each formula + its solo-dev trap)

- **Volatility:** daily returns → SAMPLE stdev (ddof=1, not population) → ×√252. Portfolio
  vol needs the covariance matrix (σ=√(wᵀΣw)), NOT weighted-avg of holding vols. Adjusted close.
- **Concentration:** HHI = Σ(wᵢ²) on VALUE weights (not share counts/cost). Decide raw vs
  normalized HHI*; guard n=1 (div-by-zero). Sector concentration is the better story.
- **Drawdown:** name it — historical max drawdown (cumulative-value series, running max) OR
  hypothetical shock (needs beta). Don't conflate. value×shock without beta implies β=1 (wrong).
- **Beta:** needs a market-index return series in the dataset; inner-join dates, use returns.
- **Dividend:** trailing TTM × shares, labeled "not a forecast." **Risk score:** documented,
  deterministic, version-pinned, monotonicity-tested. **Min-history guard:** ≥~252 obs or exclude+warn.

## Data + security (the demo-caching CRITICAL)

- Ship raw adjusted daily closes + index + TTM dividends + sector; compute metrics at runtime.
  Do NOT ship precomputed risk numbers (defeats the thesis). Source: Stooq/Tiingo static export,
  commit `DATA_SOURCE.md` (license + retrieval date). ~8-15 real tickers chosen for a legible story.
- **CACHE the sample report** so live OpenAI fires ~once, not per visitor. Recruiter "Demo"
  hits cache; only a rate-limited "regenerate" hits the API. Plus a GLOBAL daily spend cap that
  flips to cached ("demo limit reached"). This is the real abuse defense — without it the public
  demo is a billing hole. OpenAI key server-only, never `NEXT_PUBLIC_*`.
- **Postgres:** unjustified for no-auth/no-history v1. Either drop it, or make it earn its place
  as the report cache (store reports keyed by portfolio hash; store NO users). Decide explicitly.

## Eval harness (proves the thesis — was undefined)

Separate from validator unit tests. Run the FULL live pipeline R≈20-50× over K portfolios.
README numbers: **post-validation hallucination rate (~0, the headline)**, validator catch
rate (%), structured-output parse-failure rate, template-fallback rate. `make eval`, commit
results JSON + timestamp, NOT CI-on-push (costs API spend). temperature=0, pin model version.

## Test pyramid + 2am test

Unit (most): every risk formula vs hand-computed fixtures; validator; degenerate-portfolio
guards (n=0, n=1); NaN guard; dataset-load validation. Integration (some): report endpoint with
STUBBED OpenAI (canned grounded + hallucinated) → proves wiring + fallback + source flag, no spend.
E2E (1-2): Playwright load demo, assert score + explanation + disclaimer render, screenshot breakpoints.
**2am test:** pull the OpenAI key → demo still renders template fallback; loop the regenerate
endpoint → hits rate limit + global cap, never infinite spend. Both pass = you can sleep.

## Deploy

Cold start is the detail most likely to silently sink it: Render free sleeps 15min → 30-50s
cold start → recruiter sees a spinner. Fix: public surface = Next on Vercel (no sleep), cold
Python hidden behind cached report; or keep-warm cron; or $7/mo Render Starter. CORS: if any
backend is public, regex must match `https://*.vercel.app` previews + prod, not `*`. Write `.env.example`,
validate required secrets at startup (fail loud on missing OPENAI_API_KEY). Realistic cost $0-7/mo.

---

# ===== /autoplan DX PHASE (Phase 3.5) =====

## DX score: 4/10. TTHW: 20-40 min (may fail) → target <5 min.

Two "developer" personas: **A = hiring manager/engineer** scanning the repo + live
demo in 30-90s (does this person get an interview?); **B = future contributor / you
in 3 months.** At plan stage every load-bearing DX artifact is absent or only wished-for.
3 CRITICALs gate Persona A — they're ~80% of the experience and decide whether the
eng rigor is ever seen.

## DX DUAL VOICES — CONSENSUS TABLE

```
  Dimension                            Claude   Codex   Consensus
  ──────────────────────────────────── ──────── ─────── ──────────
  1. Getting started < 5 min?           NO        N/A     20-40min, may fail; no compose/make/.env.example
  2. Runs without an OpenAI key?         NO        N/A     marquee feature needs a key reviewers won't paste
  3. README spec'd as the product?       NO        N/A     "clean README" is a wish, not a contract
  4. Differentiator findable/reproducible?NO       N/A     validator location + eval results not committed
  5. Compliance story discoverable?      NO        N/A     buried; needs linked COMPLIANCE.md
  6. Setup-failure ergonomics?           NO        N/A     no preflight/doctor; cryptic on missing env
```
Codex N/A (CLI version-incompatible). Single-model DX review.

## DX developer journey (Persona A, the hiring manager)

```
  STAGE              | NOW (plan implies)        | TARGET
  -------------------|---------------------------|---------------------------------
  Land on GitHub     | unspec'd README           | first screen: pitch + live URL +
                     |                           | GIF + reliability badge + diagram
  Open live demo     | cold-start spinner risk   | instant cached X-Ray, no signup
  Read the repo tree | thesis not in folder names| risk_engine/ vs llm/ + named guardrail
  Run it locally     | 2 svc + Postgres + key    | git clone && make dev, <5min, NO key
  Verify the claim   | not reproducible          | make eval reproduces the README number
  Read the test names| unspec'd                  | test names narrate the safety story
  Find the diff'tor  | buried                    | COMPLIANCE.md + RELIABILITY.md linked
```

## DX empathy narrative (first person, Persona A)

"I clone 50 of these. I do NOT paste my paid OpenAI key into a stranger's repo, so
the AI feature has to work without it or I never see it. I spend 30 seconds on the
README — if the live URL, a screenshot, and the one number that proves the claim
aren't on the first screen, I close the tab. If `make dev` isn't there, I'm not
fighting two toolchains and a Postgres container. Show me the guardrail file by name,
let me run `make eval` and watch '0 hallucinated numbers' reproduce, and I'll bring
you in to talk about it."

## DX fixes (highest-leverage three first)

- **DEMO_MODE (no key) — CRITICAL.** Default on when OPENAI_API_KEY is unset. Commit
  golden validated LLM responses as `fixtures/`. App boots + renders the full X-Ray +
  AI explanation with no key. Same fixtures feed the eval golden set AND the validator
  tests (one artifact, three jobs). README run-block line 1: "No OpenAI key needed."
- **One-command run — CRITICAL.** `docker-compose.yml` + `Makefile` (`make dev / test /
  eval / seed`) + `.env.example` per service. Acceptance: `git clone && cp .env.example
  .env && make dev` → localhost in <5 min, no paid key.
- **README as the deliverable — CRITICAL.** Authored FIRST, not last. First screen, in
  order: one-sentence pitch, live demo URL, demo GIF above the fold, reliability badge
  ("0 hallucinated numbers across N eval cases"), Mermaid architecture diagram (renders
  on GitHub) showing math-vs-LLM split + where the validator sits, 3-line run block.
- **Findability — HIGH.** Repo encodes the thesis: `backend/risk_engine/` (deterministic,
  zero OpenAI imports — enforce with an import-lint test), `backend/llm/`, the guardrail
  in an obviously-named file (`number_guardrail.py`), `backend/eval/`. README links the 3
  key files directly.
- **Reproducibility — HIGH.** Pin model snapshot string + lockfiles (uv/poetry +
  package-lock); commit eval results (`eval/results/latest.json` + a generated table the
  README embeds); eval runs key-free over fixtures so reviewers + CI reproduce the number.
- **Tests-as-proof — HIGH.** Behavior-narrating pytest names; `make test` green with NO
  key (fixtures), one command, CI badge.
- **Compliance discoverable — HIGH.** Top-level `COMPLIANCE.md` + `docs/RELIABILITY.md`,
  both linked from the README first screen — the highest-leverage 4 lines for these roles.
- **Postgres reconsidered — HIGH (echoes eng E8).** No-auth/no-history v1 has no write path.
  Drop it from v1 (sample = committed JSON), or if kept, seed inside compose with zero manual
  migrate. Decisively cutting it is itself a maturity signal.
- **Setup ergonomics — MEDIUM.** `make doctor` preflight: Python/node version, DB reachability
  (if kept), required-vs-optional env, actionable fix lines. `.python-version`/`.nvmrc` pinned.

## CROSS-PHASE THEMES (independent signal across 2+ phases)

- **Theme: make the differentiator visible AND runnable.** Design F3.4 (guardrail visible
  in the UI), Eng A30 (eval number in README), DX F1/F8 (no-key mode + findable validator/
  compliance) all independently say: the hallucination-guardrail thesis is invisible unless
  you surface it in the UI, prove it with a committed number, and make it run without a key.
  **High-confidence — this is the project's whole hiring value; treat it as P1.**
- **Theme: demo caching / no-key path.** Eng A24 (cache so OpenAI fires once, not per visitor)
  and DX F1 (DEMO_MODE default-on) are the same mechanism viewed from security and DX. One
  build: a cached/fixture report path that is both the abuse defense and the free-to-run demo.
- **Theme: Postgres is probably dead weight in v1.** Eng A15 and DX F3 independently flag it.
  Decide explicitly: drop it or make it the report cache. Don't leave it undecided in the stack.

---

# ===== /autoplan FINAL DECISIONS (user-approved) =====

Status: **APPROVED — all recommendations accepted.**

Taste calls resolved (user chose "approve all"):
- **Topology:** single public origin — Next.js on Vercel is the only public surface;
  private Python math+LLM service via shared secret. (Eng E4)
- **Postgres:** DROPPED from v1 (no write path with no-auth/no-history). Sample portfolio
  = committed JSON. Returns with the history milestone. (Eng E8 / DX X-area)
- **Visual direction:** Swiss/editorial "financial instrument" — tabular numerals, oversized
  risk gauge as the one expressive element, override shadcn/Recharts defaults. (Design D4)

Build order (milestones):
- **M1 (week 1):** deploy empty full stack publicly (Vercel + private Python svc). Decide
  deploy target NOW. `make dev` + `.env.example` + DEMO_MODE scaffold.
- **M2 (week 2-3) — THE SHIPPABLE ARTIFACT:** Portfolio X-Ray + AI Risk Explanation +
  number-hallucination validator (P1 pytests) + eval harness (committed number) + Swiss/
  instrument dashboard + README-as-product + COMPLIANCE.md. Update resume/LinkedIn here.
- **M3+ (upside, dated commits):** FOMO Journal, Scenario Simulator, RAG — each only after
  the prior milestone is deployed and in the README. Postgres returns with history.

P1 highlight (the cross-phase theme = the whole hiring value): make the guardrail
**visible** (UI chips), **runnable without a key** (DEMO_MODE + fixtures), and
**reproducible** (committed eval number). Treat as the headline.

---

# ===== ORIGINAL PLAN (user's input, preserved) =====

## North-star

AI **Portfolio Risk Coach** for retail investors. Help users understand risk,
avoid FOMO, analyze their portfolio, and make more disciplined decisions.

**Hard constraint (positioning + safety):** This is NOT a stock-picker. It does
NOT say "buy this" / "sell that". It does risk *coaching*: "Your portfolio is
aggressive because 62% sits in 3 stocks. Consider reviewing diversification."

The hireable angle: "I know how to build an AI product *and* how to control its
risk." Separation of deterministic finance math from LLM explanation, structured
outputs, audit trail, governance, RAG grounding.

## Target niche (monetization later)

Young retail investors who keep overtrading.

## Tech stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts
- **Backend:** Python + FastAPI + Pydantic + SQLAlchemy
- **Database:** PostgreSQL + pgvector
- **AI:** OpenAI API + Structured Outputs + function calling + embeddings
- **Data/finance engine:** Pandas/Polars + NumPy + light scikit-learn
- **Infra:** Docker + GitHub Actions + AWS / Render / Fly.io + S3-compatible storage
- **Quality:** pytest + API tests + logging + rate limiting + audit logs

## Features (full vision)

1. **Portfolio X-Ray** — dashboard: holdings, sector, asset type, dividend
   exposure, risk score, concentration score, volatility estimate.
2. **AI Risk Explanation** — backend computes numbers; LLM only *explains* them
   via structured JSON. LLM never invents numbers.
3. **FOMO / Trade Journal Coach** — user logs a trade idea (ticker, reason,
   entry, stop loss, risk amount, emotion). AI scores a "FOMO score" and asks
   discipline questions ("Do you have an exit plan?", "Is risk per trade >1-2%?",
   "Buying a setup or buying because you fear missing out?").
4. **Scenario Simulator** — "market crash -20%", "tech sector -30%", "rates stay
   high", "AI bubble correction", "deposit $200/mo". Shows projected outcome.
5. **RAG Research Assistant** — "Why is this stock risky?" retrieves from SEC
   filings / risk factors / earnings notes / news summaries, answers with sources.

## MVP (build first)

**AI Portfolio Risk Coach for Retail Investors**

User flow:
1. User creates account.
2. User enters holdings manually or uploads CSV (ticker, shares, avg cost,
   current value, sector, goal, time horizon).
3. Backend stores portfolio in Postgres.
4. Backend computes allocation, concentration, volatility estimate, drawdown
   scenario, dividend estimate.
5. AI generates a risk report via structured output.
6. Dashboard shows risk score, top risk factors, suggested review checklist.
7. User saves a daily report to track risk over time.

Done well, deployed, with a demo video and a clean README + architecture
diagram, this beats a generic AI chatbot project for getting hired.

## Interview pitch

"I built an AI-powered portfolio risk coach that separates deterministic
financial calculations from LLM-generated explanations, uses structured outputs
for reliability, stores portfolio and report history in Postgres, and uses RAG
to ground financial risk explanations in source documents."

## Target companies

fintech, wealthtech, banking tech, brokerage, risk/compliance software, AI SaaS,
data platform, cybersecurity-finance.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | APPROVED | 11 findings; 4/6 premises wrong/weak; v1 cut 5→2 features |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | issues_open | 37 findings, 3 CRITICAL (validator spec, eval harness, demo-cache); 6.5/10 |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | 24 findings, 4 CRITICAL; 2/10 (no design spec) |
| DX Review | `/plan-devex-review` | Developer experience | 1 | issues_open | 11 findings, 3 CRITICAL; 4/10; TTHW 20-40min → <5min |

- **CODEX:** unavailable all run — CLI v0.120.0 too old for account model `gpt-5.5`
  (`gpt-5`/`gpt-5-codex` blocked on ChatGPT accounts). Single-model review (Claude
  subagents). Fix: `npm i -g @openai/codex@latest`.
- **CROSS-MODEL:** N/A (single model). Cross-PHASE theme instead: make the
  hallucination-guardrail visible + runnable-without-a-key + reproducible — flagged
  independently in Design, Eng, and DX. High-confidence P1.
- **VERDICT:** APPROVED — v1 reframed to 2 features, deploy week 1, 31 tasks (20 P1).
  Eng review issues_open (3 CRITICALs are now scoped P1 tasks, not blockers to planning).
  Next: build M1 or run /ship when code exists.

NO UNRESOLVED DECISIONS
