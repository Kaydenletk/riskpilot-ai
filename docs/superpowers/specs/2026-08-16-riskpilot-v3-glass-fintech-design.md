# RiskPilot v3 — Glass Fintech Redesign Spec

Date: 2026-08-16
Status: Approved in brainstorming (all 5 sections)
Supersedes the visual layer of `2026-08-09-riskpilot-redesign-v2-design.md`
(v2's features — analyze builder, what-if, sector context — all remain; this
respec's their look and page structure).

## Why

User verdict on v2: too plain, too text-heavy, wrong vibe, structure off.
Direction chosen from three mocked worlds: **Glass Fintech** (indigo gradients,
frosted glass cards with real depth, gradient display type, chart-forward).

## Decisions (locked)

| Decision | Choice |
|---|---|
| Direction | Glass Fintech (mock B) |
| Theme | **Light-first** glass; dark kept as maintained secondary (toggle + tests stay) |
| Scope | All surfaces: home, /analyze, /ticker/[symbol], /compare |
| Execution | Token-deep reskin + targeted structural changes; tested component internals (gauge, builder, what-if, tables) preserved |
| Branch | Continue on `feature/v2-redesign` (PR #14 becomes the v3 PR) |

## 1. Design system

- **Surfaces (light):** soft indigo-tinted near-white background with a subtle
  radial wash; cards = frosted white glass — translucent fill, 1px inner-light
  border, `backdrop-filter: blur`, soft indigo-colored shadow. Real elevation
  scale (3 levels), not flat hairlines.
- **Accent:** gradient pair indigo→violet-blue for chrome/CTAs, replacing flat
  ultramarine. Risk ramp (blue/amber/red + ink variants) unchanged, data-only.
- **Type:** Space Grotesk stays the display face; hero-scale headlines get
  gradient-text treatment. Mono captions stay.
- **Dark theme:** same system on deep indigo-navy; glass gets lighter borders +
  stronger glow shadows.
- **Motion:** scroll-entrance reveals (IntersectionObserver, compositor-only
  transform/opacity), 500ms gauge sweep, card hover lift. All behind the
  existing `prefers-reduced-motion` kill-switch.
- **Radius:** cards up to ~14px — glass wants roundness.

## 2. Homepage structure (charts talk first)

1. **Split hero.** Left: gradient display headline "Know your risk before the
   market does." + one support line + 2 CTAs. Right: live glass card rendered
   from the real sample report — animated gauge, sector-exposure bar chart,
   one-line verdict. Product = hero visual.
2. **Interactive what-if strip.** Real slider wired to `/api/score` on the
   sample portfolio; live `74 → 61` rescore on drag. Replaces static teaser.
3. **How it works, visualized.** Three glass panels with mini diagrams
   (engine→numbers, numbers→prose, guardrail cross-check with rejected-number
   animation). One sentence each.
4. **Sample X-Ray** full dashboard, demoted (hero card covers the highlight;
   kept for depth + Coach/Analyst toggle).
5. **Universe:** sector treemap-style grid, chips on expand.
6. Footer.

## 3. Analyze + report

- **Builder:** two-column desktop — left: rows in one tall glass card (weight
  inputs gain inline slider-track fills); right: **live preview rail** reusing
  the `/score` hook — mini gauge + sector bar update per change once ≥3
  holdings. Example/resume chips as glass pills.
- **Report (shared with home sample):**
  - **Risk-composition bar** under the verdict: stacked horizontal bar sized by
    each signal's actual contribution to the score (concentration/volatility/
    drawdown, from the engine's documented formula). Answers "why 74?"
    visually. Segment math computed engine-side or from facts via the published
    weights — must match `score.py` exactly (unit-tested).
  - Stat tiles → glass cards with mini bars vs medians (portfolio-level medians
    computed engine-side following the sector-context pattern).
  - What-if panel: gradient slider tracks, gauge animates deltas, glass card.
- Coach/Analyst toggle unchanged.

## 4. Ticker + compare

- **Ticker:** gauge + tiles merge into one glass spec-sheet card with inline
  vs-median bars; sparkline gradient-filled in glass frame; percentile rendered
  as a position-on-distribution strip (marker on a universe band); peer chips +
  action links stay, glass-styled.
- **Compare:** glass column cards, inline bars per metric row, soft risk-tint
  on the highest-risk cell per row. Structure unchanged.

## 5. Testing + rollout

- All 38 e2e stay green; home/analyze layout specs updated behaviorally.
  Visual snapshots regenerated 320/768/1440 light+dark.
- New unit tests: score-composition segment math; preview-rail hook.
- Motion honors `prefers-reduced-motion` (existing global kill-switch).
- 4 shippable commits: ① tokens/glass system ② homepage ③ analyze/report
  ④ ticker/compare.

## Non-goals

- No feature changes: builder, what-if, sector context, guardrail flows all
  behave identically.
- No component-internal rewrites (gauge/builder/what-if logic untouched).
- No dark-only commitment; light is primary.
- Risk colors never become brand decoration.
