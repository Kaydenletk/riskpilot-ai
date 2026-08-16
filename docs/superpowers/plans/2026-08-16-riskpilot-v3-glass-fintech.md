# RiskPilot v3 — Glass Fintech Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin all four surfaces (home, /analyze, /ticker, /compare) into the light-first Glass Fintech system with chart-forward structure, preserving every tested feature and component internal.

**Architecture:** Token-deep restyle in `globals.css` (glass surfaces, gradient accent pair, elevation, motion) + targeted structural edits per page. New pure presentational components (SectorBars, RiskComposition, DistributionStrip, Reveal) reused across surfaces. All risk math stays engine-side; the one client-side score-breakdown mirror self-validates against the engine's score and hides itself on mismatch (fail-closed).

**Tech Stack:** Next.js 15 App Router, CSS Modules + oklch tokens, Space Grotesk (`--font-display`), vitest, Playwright. No new dependencies.

## Global Constraints

- Risk ramp colors (`--risk-*`) are data-only — never brand/chrome decoration (spec §Non-goals).
- Motion: `transform`/`opacity` only; every animation dies under the existing `prefers-reduced-motion` kill-switch in `globals.css`.
- Light theme is primary; dark must stay intentional — every new token defined in BOTH `:root` and `[data-theme="dark"]`.
- Component INTERNALS untouched: RiskGauge, PortfolioBuilder logic, WhatIfPanel logic, useDebouncedScore, portfolio-state (spec §Non-goals).
- Universe/ticker links stay real `<Link>` anchors in the server-rendered DOM (crawlability).
- Touch targets ≥ 44px; body text ≥ 16px equivalents; no console.log; no `any`.
- Branch: `feature/v2-redesign`. Working tree carries user's own dirty `Makefile`/`scripts/doctor.sh` — never stage them.
- Verify baseline before every commit: `cd frontend && npx tsc --noEmit`.

---

## Phase 1 — Glass system

### Task 1: Glass token layer + utilities

**Files:**
- Modify: `frontend/src/app/globals.css` (token blocks + two utility classes)

**Interfaces:**
- Produces (all later tasks consume): CSS vars `--glass-fill`, `--glass-border`, `--glass-blur`, `--shadow-1`, `--shadow-2`, `--shadow-3`, `--grad-accent` (linear-gradient string), `--radius-card: 14px`; utility classes `.glass` (frosted card) and `.grad-text` (gradient headline text).

- [ ] **Step 1: Add tokens.** In `:root` append after the accent block:

```css
  /* ── v3 glass system ── */
  --bg: oklch(97.5% 0.008 275);              /* indigo-tinted near-white */
  --bg-grain: oklch(95.8% 0.01 275);
  --glass-fill: oklch(100% 0 0 / 0.62);
  --glass-border: oklch(100% 0 0 / 0.85);
  --glass-blur: 14px;
  --shadow-1: 0 2px 10px oklch(45% 0.12 275 / 0.08);
  --shadow-2: 0 10px 30px oklch(45% 0.12 275 / 0.12);
  --shadow-3: 0 24px 60px oklch(45% 0.12 275 / 0.16);
  --grad-accent: linear-gradient(120deg, oklch(48% 0.24 275), oklch(55% 0.22 295));
  --radius-card: 14px;
```

(Note: `--bg`/`--bg-grain` REPLACE the existing lines in the same block — hue moves 250→275 for the indigo tint. Do not duplicate.)

In `[data-theme="dark"]` append (again replacing `--bg`/`--bg-grain` values):

```css
  --bg: oklch(18% 0.03 275);
  --bg-grain: oklch(21% 0.035 275);
  --glass-fill: oklch(30% 0.04 275 / 0.45);
  --glass-border: oklch(85% 0.02 275 / 0.22);
  --shadow-1: 0 2px 10px oklch(5% 0.05 275 / 0.5);
  --shadow-2: 0 10px 30px oklch(5% 0.05 275 / 0.6);
  --shadow-3: 0 24px 60px oklch(35% 0.18 275 / 0.35);
  --grad-accent: linear-gradient(120deg, oklch(70% 0.17 275), oklch(75% 0.15 295));
```

- [ ] **Step 2: Body wash.** Replace the existing `body { background-image: ... }` rule with:

```css
body {
  background-image:
    radial-gradient(120% 70% at 15% -10%, oklch(90% 0.05 285 / 0.55), transparent 55%),
    radial-gradient(100% 60% at 100% 0%, oklch(92% 0.04 255 / 0.45), transparent 50%);
  background-attachment: fixed;
}
[data-theme="dark"] body {
  background-image:
    radial-gradient(120% 70% at 15% -10%, oklch(30% 0.08 285 / 0.6), transparent 55%),
    radial-gradient(100% 60% at 100% 0%, oklch(26% 0.07 255 / 0.5), transparent 50%);
}
```

- [ ] **Step 3: Utilities.** Append at the end of globals.css:

```css
/* ── v3 glass utilities ── */
.glass {
  background: var(--glass-fill);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-2);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}
.grad-text {
  background: var(--grad-accent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

- [ ] **Step 4: Sweep flat surfaces onto glass.** In these module files, change card containers from `background: var(--surface); border: 1px solid var(--rule); border-radius: var(--radius)` to `composes`-free manual glass (CSS Modules can't compose globals — set the same five properties using the glass vars) OR simpler: add `glass` to the component's className in TSX and DELETE the replaced background/border/shadow lines from the module:
  - `coach-view.module.css` `.takeaway`, `.stats` wrapper, `.prompt`
  - `page.module.css` `.metrics`, `.allocation`, `.explain`
  - `what-if-panel.module.css` `.panel` (add border+fill; keep its top-rule accent removed)
  - `analyze.module.css` `.panel`
  - `portfolio-builder.module.css` `.dropdown`, `.noMatch`
  Preference: className approach (`<section className={`glass ${styles.x}`}>`) — token changes stay in one place. Keep inner 1px grid separators (`gap:1px` tables) as-is.

- [ ] **Step 5: CTAs to gradient.** `hero.module.css` `.primary`, `analyze.module.css` `.panelBtn`, `portfolio-builder.module.css` `.run`, `what-if-panel.module.css` `.explainBtn`, `.retry`: `background: var(--grad-accent); color: #fff;` (hover stays `filter: brightness(0.92)`). Contrast note: gradient's darkest stop ≥ oklch 48% in light → white text ≥ 4.5:1; dark theme stops are lighter — for dark, buttons keep `color: oklch(18% 0.03 275)` (near-black text on light gradient) via `[data-theme="dark"] .primary { color: ... }` pattern in each module — copy exactly:

```css
[data-theme="dark"] :global(html) & { /* NOT this — CSS Modules can't do this cleanly */
```

Correct pattern (global attribute selector works in modules):

```css
:global([data-theme="dark"]) .primary {
  color: oklch(18% 0.03 275);
}
```

- [ ] **Step 6: Verify + commit**

Run: `cd frontend && npx tsc --noEmit && npm run build && npx playwright test e2e/theme.spec.ts e2e/redesign.spec.ts --reporter=line`
Expected: build clean, specs pass (visual.spec NOT run — snapshots refresh in Task 12).

```bash
git add frontend/src
git commit -m "feat(v3): glass token system, gradient accents, elevation"
```

---

### Task 2: Scroll-reveal hook + component

**Files:**
- Create: `frontend/src/hooks/useReveal.ts`
- Create: `frontend/src/components/ui/Reveal.tsx`
- Test: `frontend/src/hooks/useReveal.test.ts`

**Interfaces:**
- Produces: `<Reveal delay={ms}>{children}</Reveal>` — client component; children start `opacity:0 translateY(16px)`, transition in when scrolled into view (or immediately if IntersectionObserver missing). Consumed by Tasks 5, 6, 10.

- [ ] **Step 1: Failing test** (`useReveal.test.ts`, jsdom lacks IO — test the fallback):

```ts
import { renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { useReveal } from "./useReveal";

test("falls back to visible when IntersectionObserver is missing", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  const { result } = renderHook(() => useReveal<HTMLDivElement>());
  expect(result.current.visible).toBe(true);
});

test("starts hidden when IntersectionObserver exists", () => {
  const observe = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn().mockImplementation(() => ({ observe, disconnect: vi.fn() })),
  );
  const { result } = renderHook(() => useReveal<HTMLDivElement>());
  expect(result.current.visible).toBe(false);
});
```

Run: `npx vitest run src/hooks/useReveal.test.ts` → FAIL (module missing).

- [ ] **Step 2: Implement `useReveal.ts`:**

```ts
"use client";

// Scroll-entrance visibility. Compositor-only styling is the CALLER's job —
// this hook only reports visibility. No IO (old browser / jsdom) → visible
// immediately: content must never be trapped hidden.
import { useEffect, useRef, useState } from "react";

export function useReveal<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);

  return { ref, visible };
}
```

- [ ] **Step 3: `Reveal.tsx`:**

```tsx
"use client";

import { useReveal } from "@/hooks/useReveal";

import styles from "./reveal.module.css";

// Wrapper for scroll-entrance. transform/opacity only; the global
// prefers-reduced-motion kill-switch zeroes the transition.
export function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.in : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
```

Create `frontend/src/components/ui/reveal.module.css`:

```css
.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity var(--dur-slow) var(--ease-out-expo),
    transform var(--dur-slow) var(--ease-out-expo);
}
.in {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 4: GREEN + commit**

Run: `npx vitest run src/hooks/useReveal.test.ts && npx tsc --noEmit` → pass.

```bash
git add frontend/src/hooks/useReveal.ts frontend/src/hooks/useReveal.test.ts frontend/src/components/ui/
git commit -m "feat(v3): scroll-reveal hook + component"
```

---

## Phase 2 — Homepage

### Task 3: SectorBars component + split hero with live sample card

**Files:**
- Create: `frontend/src/components/charts/SectorBars.tsx` + `sector-bars.module.css`
- Test: `frontend/src/components/charts/sector-bars.test.ts` (pure helper)
- Create: `frontend/src/components/home/HeroXray.tsx` + `hero-xray.module.css`
- Modify: `frontend/src/components/home/Hero.tsx` + `hero.module.css` (split layout, gradient headline, accept child card)
- Modify: `frontend/src/app/page.tsx` (pass report into hero)

**Interfaces:**
- Consumes: `RiskReport` (existing type), `RiskGauge` (existing, props `{score, band, size?}`).
- Produces: `sectorWeights(holdings: Holding[]): { sector: string; pct: number }[]` (sorted desc, pct rounded 0.1, sums ≈100) — reused by Task 8's preview rail. `<SectorBars holdings={...} />` renders labeled horizontal bars, top sector tinted `--risk-mid-ink` when ≥50%. `<HeroXray report={...} />` = glass card with gauge (size 150), verdict one-liner (from `buildVerdict(facts)` — existing `@/lib/verdict`), SectorBars.

- [ ] **Step 1: Failing test** (`sector-bars.test.ts`):

```ts
import { expect, test } from "vitest";

import type { Holding } from "@/lib/types";

import { sectorWeights } from "./SectorBars";

const h = (ticker: string, sector: string, market_value: number): Holding => ({
  ticker,
  sector,
  shares: 1,
  market_value,
});

test("aggregates and sorts sector weights", () => {
  const rows = sectorWeights([
    h("NVDA", "Technology", 600),
    h("AAPL", "Technology", 200),
    h("KO", "Consumer Staples", 200),
  ]);
  expect(rows[0]).toEqual({ sector: "Technology", pct: 80 });
  expect(rows[1]).toEqual({ sector: "Consumer Staples", pct: 20 });
});

test("empty holdings → empty", () => {
  expect(sectorWeights([])).toEqual([]);
});
```

Run → FAIL. Implement `SectorBars.tsx`:

```tsx
import type { Holding } from "@/lib/types";

import styles from "./sector-bars.module.css";

const DOMINANT_PCT = 50;

export function sectorWeights(
  holdings: Holding[],
): { sector: string; pct: number }[] {
  const total = holdings.reduce((s, x) => s + x.market_value, 0);
  if (total <= 0) return [];
  const bySector = new Map<string, number>();
  for (const x of holdings) {
    bySector.set(x.sector, (bySector.get(x.sector) ?? 0) + x.market_value);
  }
  return [...bySector.entries()]
    .map(([sector, mv]) => ({ sector, pct: Math.round((mv / total) * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);
}

// Horizontal sector-exposure bars. The dominant sector (≥50%) wears the
// risk-mid ink — data coloring, not decoration.
export function SectorBars({ holdings }: { holdings: Holding[] }) {
  const rows = sectorWeights(holdings);
  if (rows.length === 0) return null;
  return (
    <ul className={styles.bars} aria-label="Sector exposure">
      {rows.map((r) => (
        <li key={r.sector} className={styles.row}>
          <span className={`caption ${styles.label}`}>{r.sector}</span>
          <span className={styles.track}>
            <span
              className={styles.fill}
              style={{
                width: `${r.pct}%`,
                background:
                  r.pct >= DOMINANT_PCT ? "var(--risk-mid-ink)" : "var(--accent)",
              }}
            />
          </span>
          <span className={`num ${styles.pct}`}>{r.pct}%</span>
        </li>
      ))}
    </ul>
  );
}
```

`sector-bars.module.css`:

```css
.bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.row { display: grid; grid-template-columns: minmax(90px, 40%) 1fr auto; align-items: center; gap: 8px; }
.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.track { height: 8px; background: var(--bg-grain); border-radius: 4px; overflow: hidden; }
.fill { display: block; height: 100%; border-radius: 4px; transition: width var(--dur-normal) var(--ease-out-expo); }
.pct { font-size: var(--text-sm); color: var(--ink-soft); min-width: 4.5ch; text-align: right; }
```

- [ ] **Step 2: `HeroXray.tsx`:**

```tsx
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { SectorBars } from "@/components/charts/SectorBars";
import { buildVerdict } from "@/lib/verdict";
import type { RiskReport } from "@/lib/types";

import styles from "./hero-xray.module.css";

// The product IS the hero visual: live sample report in a glass card.
export function HeroXray({ report }: { report: RiskReport }) {
  return (
    <aside className={`glass ${styles.card}`} aria-label="Live sample risk X-Ray">
      <div className="caption">Sample portfolio · live from the engine</div>
      <div className={styles.top}>
        <div className={styles.gauge}>
          <RiskGauge score={report.facts.risk_score} band={report.facts.risk_band} size={150} />
        </div>
        <p className={styles.verdict}>{buildVerdict(report.facts)}</p>
      </div>
      <SectorBars holdings={report.holdings} />
    </aside>
  );
}
```

`hero-xray.module.css`:

```css
.card { padding: var(--space-3); display: grid; gap: var(--space-2); }
.top { display: flex; align-items: center; gap: var(--space-2); }
.gauge { flex-shrink: 0; }
.verdict {
  font-family: var(--font-display), ui-sans-serif, system-ui, sans-serif;
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: 1.25;
  margin: 0;
  text-wrap: balance;
}
```

- [ ] **Step 3: Split hero.** `Hero.tsx` becomes a two-column section: existing headline/support/CTAs left; `{card}` prop rendered right. Headline gets `grad-text`:

```tsx
export function Hero({ card }: { card?: React.ReactNode }) {
  return (
    <section className={`${styles.hero} stage stage-1`} aria-labelledby="hero-h">
      <div className={styles.copy}>
        <h1 id="hero-h" className={`grad-text ${styles.headline}`}>
          Know your risk before the market does.
        </h1>
        <p className={styles.support}>
          Portfolio risk management with deterministic math — explained by an AI that{" "}
          <strong>cannot invent numbers</strong>.
        </p>
        <div className={styles.ctas}>{/* existing two CTAs unchanged */}</div>
      </div>
      {card && <div className={styles.visual}>{card}</div>}
    </section>
  );
}
```

`hero.module.css` additions: `.hero { display: flex; gap: var(--space-4); align-items: center; flex-wrap: wrap; } .copy { flex: 1.2; min-width: 300px; } .visual { flex: 1; min-width: 300px; }`. Note headline text CHANGES to "Know your risk before the market does." — update `e2e/redesign.spec.ts` if it matches hero text (it matches `/risk/i` — still passes).

- [ ] **Step 4: `page.tsx`:** `<Hero card={<HeroXray report={report} />} />`. BackendOffline keeps `<Hero />` (no card).

- [ ] **Step 5: Verify + commit**

Run: `npx vitest run src/components/charts/sector-bars.test.ts && npx tsc --noEmit && npx playwright test e2e/redesign.spec.ts --reporter=line`

```bash
git add frontend/src/components/charts/ frontend/src/components/home/ frontend/src/app/page.tsx
git commit -m "feat(v3): split hero with live glass X-Ray card + sector bars"
```

---

### Task 4: Interactive what-if strip on home

**Files:**
- Create: `frontend/src/components/home/LiveWhatIfStrip.tsx` + `live-what-if-strip.module.css`
- Modify: `frontend/src/app/page.tsx` (replace `<WhatIfTeaser />`)
- Delete: `frontend/src/components/home/WhatIfTeaser.tsx` + `what-if-teaser.module.css` (grep first: only page.tsx imports it)

**Interfaces:**
- Consumes: `useDebouncedScore(rows, enabled)` (existing), `PortfolioRow`, `setWeight`, `serializePortfolio` from `@/lib/portfolio-state`; `RiskReport`.
- Produces: `<LiveWhatIfStrip report={...} />` — single-slider live demo.

- [ ] **Step 1: Component** — client. Derive baseline rows from `report.holdings` market values (same `baselineRows` math as WhatIfPanel — EXTRACT that function: move `baselineRows` from `WhatIfPanel.tsx` into `@/lib/portfolio-state` as `rowsFromHoldings(holdings: Holding[]): PortfolioRow[]` with its rounding, import it in BOTH WhatIfPanel and this strip; add a vitest case for it in `portfolio-state.test.ts`:

```ts
test("rowsFromHoldings derives rounded percent weights", () => {
  const rows = rowsFromHoldings([
    { ticker: "NVDA", sector: "T", shares: 1, market_value: 600 },
    { ticker: "KO", sector: "S", shares: 1, market_value: 400 },
  ]);
  expect(rows).toEqual([
    { ticker: "NVDA", weightPct: 60, locked: false },
    { ticker: "KO", weightPct: 40, locked: false },
  ]);
});
```

Strip UI: caption "Drag it — the engine re-scores live", the TOP holding's slider only (range 0.5–95 step 0.5, gradient fill track), score delta `{baseline} → {scored ?? …}` in display font colored by target band (`riskInkVar`), link "Open the full simulator ↓" anchoring `#sample`, and "Build yours →" to /analyze. Uses `useDebouncedScore(rows, dirty)` exactly like WhatIfPanel (dirty = serialize differs).

- [ ] **Step 2: Swap into page.tsx**, delete WhatIfTeaser files (`git rm`), update the whatif e2e spec if it referenced teaser text (it doesn't — it targets the panel region on `/`; ADD a strip assertion):

```ts
test("home strip rescores on slider drag", async ({ page }) => {
  await page.route("**/api/score", (route) =>
    route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, holdings: [], facts: SCORED_FACTS, score_version: "v1" }) }),
  );
  await page.goto("/");
  const strip = page.getByRole("region", { name: /drag it/i });
  await strip.locator('input[type="range"]').press("ArrowRight");
  await expect(strip.getByText("61")).toBeVisible();
});
```

(Give the strip `role="region"` + `aria-label="Drag it — the engine re-scores live"`.)

- [ ] **Step 3: Verify + commit**

Run: `npx vitest run && npx tsc --noEmit && npx playwright test e2e/whatif.spec.ts --reporter=line`

```bash
git add frontend/src frontend/e2e/whatif.spec.ts
git rm frontend/src/components/home/WhatIfTeaser.tsx frontend/src/components/home/what-if-teaser.module.css
git commit -m "feat(v3): live what-if strip on the homepage"
```

---

### Task 5: How-it-works visual panels

**Files:**
- Modify: `frontend/src/components/home/HowItWorks.tsx` + `how-it-works.module.css`

**Interfaces:**
- Consumes: `<Reveal>` (Task 2).

- [ ] **Step 1: Replace the three text steps with glass panels + inline SVG mini-diagrams.** Keep ids (`how-it-works`, `how-it-works-h`), kicker, thesis h2 (now `grad-text`), foot links, and the 2/2 stat. Each step becomes `<Reveal delay={i*120}><li className={`glass ${styles.step}`}>…svg + h3 + ONE sentence…</li></Reveal>`. The three inline SVGs (currentColor strokes, ~120×56 viewBox, aria-hidden):
  1. engine: three input squares → arrow → bold number "74" (stroke boxes, text element)
  2. model: number "74" → arrow → three text lines (rects of decreasing width)
  3. guardrail: prose lines with one number circled and struck through, checkmark on the valid one — accent `--risk-high-ink` stroke on the rejected numeral ONLY (data-color rule: it represents a rejected risk number, allowed; if in doubt use `--ink-faint`) — decision: use `--ink-faint` strike + `--accent` check to keep risk colors data-only.
  One sentence per step, copied from current step bodies' first sentence verbatim.

- [ ] **Step 2: Verify + commit** — `npx tsc --noEmit && npm run build`;

```bash
git add frontend/src/components/home/
git commit -m "feat(v3): visual how-it-works panels with mini diagrams"
```

---

### Task 6: Universe sector grid

**Files:**
- Modify: `frontend/src/components/home/InstrumentIndex.tsx` + `instrument-index.module.css`

**Interfaces:**
- Consumes: `TickerOption[]`, existing `groupBySector`, `<Reveal>`.

- [ ] **Step 1: Restructure to `<details>` per sector** (crawl-safe: chips stay in DOM regardless of open state). Summary row = sector name + count + proportional bar (width = sector share of universe, `--accent` fill on `--bg-grain` track — same pattern as SectorBars). First sector `open` by default. Filter input stays; a filter match force-renders all matching groups expanded (`open` attribute driven by `filter !== ""`). Chips unchanged (44px, `<Link>`).
- [ ] **Step 2: Glass container** — wrap the whole index in `.glass` padding block; summaries get hover background `--accent-soft`; `summary { cursor: pointer; min-height: 44px; }`.
- [ ] **Step 3: Verify + commit** — `npx tsc --noEmit && npx playwright test e2e/redesign.spec.ts --reporter=line`;

```bash
git add frontend/src/components/home/
git commit -m "feat(v3): collapsible sector grid universe index"
```

---

## Phase 3 — Analyze + report

### Task 7: Risk-composition bar (self-validating)

**Files:**
- Create: `frontend/src/lib/score-breakdown.ts`
- Test: `frontend/src/lib/score-breakdown.test.ts`
- Create: `frontend/src/components/dashboard/RiskComposition.tsx` + `risk-composition.module.css`
- Modify: `frontend/src/components/dashboard/CoachView.tsx`, `AnalystView.tsx` (render under stats/metrics)

**Interfaces:**
- Consumes: `RiskFacts`.
- Produces: `scoreBreakdown(facts: RiskFacts): { label: string; points: number }[] | null` — segment point-contributions summing to ≈ risk_score; `null` when the mirror disagrees with the engine (fail-closed hide). `<RiskComposition facts={...} />`.

- [ ] **Step 1: Failing tests:**

```ts
import { expect, test } from "vitest";

import type { RiskFacts } from "@/lib/types";

import { scoreBreakdown } from "./score-breakdown";

const FACTS: RiskFacts = {
  risk_score: 73.8,
  risk_band: "aggressive",
  concentration_pct_top3: 87.5,
  volatility_annualized_pct: 33.4,
  max_drawdown_pct: -31.8,
  largest_sector: "Technology",
  largest_sector_pct: 87.5,
  holdings_count: 5,
};

test("segments sum to the engine score within tolerance", () => {
  const segs = scoreBreakdown(FACTS)!;
  const total = segs.reduce((s, x) => s + x.points, 0);
  expect(Math.abs(total - FACTS.risk_score)).toBeLessThan(0.75);
  expect(segs.map((s) => s.label)).toEqual(["Concentration", "Volatility", "Drawdown"]);
});

test("returns null when facts do not reproduce the score (fail closed)", () => {
  expect(scoreBreakdown({ ...FACTS, risk_score: 20 })).toBeNull();
});
```

Run → FAIL.

- [ ] **Step 2: Implement** — mirror of `backend/src/riskpilot/risk_engine/score.py` (weights 0.50/0.35/0.15, vol anchors 10%→0 50%→1, drawdown ceil 50%; concentration signal = pct/100). READ score.py first and copy its anchor constants into named consts with a comment pinning the source file. Compute the three signal contributions in points; if `|sum − facts.risk_score| ≥ 0.75` return `null`:

```ts
// Mirrors backend risk_engine/score.py (v1-concentration-led). If the engine's
// formula changes, the sum stops matching facts.risk_score and this returns
// null — the UI hides the bar rather than showing invented segment math.
const W_CONCENTRATION = 0.5;
const W_VOLATILITY = 0.35;
const W_DRAWDOWN = 0.15;
const VOL_FLOOR = 10;
const VOL_CEIL = 50;
const DD_CEIL = 50;
const TOLERANCE = 0.75;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function scoreBreakdown(facts: RiskFacts) {
  const conc = clamp01(facts.concentration_pct_top3 / 100) * W_CONCENTRATION * 100;
  const vol =
    clamp01((facts.volatility_annualized_pct - VOL_FLOOR) / (VOL_CEIL - VOL_FLOOR)) *
    W_VOLATILITY * 100;
  const dd = clamp01(Math.abs(facts.max_drawdown_pct) / DD_CEIL) * W_DRAWDOWN * 100;
  const segments = [
    { label: "Concentration", points: conc },
    { label: "Volatility", points: vol },
    { label: "Drawdown", points: dd },
  ];
  const total = conc + vol + dd;
  if (Math.abs(total - facts.risk_score) >= TOLERANCE) return null;
  return segments;
}
```

(If score.py's real anchors differ from these, use score.py's values — the test against real sample facts is the arbiter.)

- [ ] **Step 3: Component** — stacked horizontal bar, width per segment = points (% of 100), labels beneath with point values, kicker "Why this score". Colors: three OPACITY steps of `--accent` (0.9/0.6/0.35) — composition is chrome-data, not risk-band data. Hidden entirely when `scoreBreakdown` returns null. Render in CoachView (after `.stats`) and AnalystView (after metrics grid).
- [ ] **Step 4: GREEN + commit**

Run: `npx vitest run src/lib/score-breakdown.test.ts && npx tsc --noEmit && npm run build`

```bash
git add frontend/src/lib/score-breakdown.* frontend/src/components/dashboard/
git commit -m "feat(v3): self-validating risk-composition bar"
```

---

### Task 8: Builder two-column + live preview rail

**Files:**
- Create: `frontend/src/components/analyze/PreviewRail.tsx` + `preview-rail.module.css`
- Modify: `frontend/src/app/analyze/AnalyzeClient.tsx` (layout wrapper), `analyze.module.css`

**Interfaces:**
- Consumes: `useDebouncedScore(rows, enabled)`, `RiskGauge`, `SectorBars` (Task 3), universe (for sector lookup: build `Holding[]`-shaped rows: `{ticker, sector: fromUniverse, shares: 1, market_value: weightPct}` — market_value proportional to weight works for SectorBars math).
- Produces: `<PreviewRail rows={rows} universe={universe} />`.

- [ ] **Step 1: PreviewRail** — client: `enabled = rows.length >= 3`; below 3 → glass card with "Add {3−n} more to preview your risk"; scored → mini gauge (size 120, from `state.facts`) + SectorBars over synthetic holdings + caption "previewing · run for the full read". Pending → gauge dims (opacity .4). Error → caption "engine unreachable — preview paused".
- [ ] **Step 2: Two-column** — in AnalyzeClient's builder phase render: `<div className={styles.builderGrid}><PortfolioBuilder …/><PreviewRail …/></div>`; css `.builderGrid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--space-3); } @media (max-width: 860px) { .builderGrid { grid-template-columns: 1fr; } }` (rail BELOW builder on mobile). Builder card itself wrapped `glass` with padding.
- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npx playwright test e2e/analyze.spec.ts --reporter=line` (specs use stubbed routes; preview rail hits `/api/score` — add `page.route` stub returning 200 facts to the two specs that reach 3+ holdings, mirroring whatif.spec's stub).

```bash
git add frontend/src/components/analyze/ frontend/src/app/analyze/ frontend/e2e/analyze.spec.ts
git commit -m "feat(v3): analyze two-column with live preview rail"
```

---

### Task 9: Report + control styling sweep

**Files:**
- Modify: `frontend/src/components/dashboard/number-card.module.css`, `coach-view.module.css`, `page.module.css` (tiles)
- Modify: `frontend/src/components/analyze/portfolio-builder.module.css` (weight input track fill)
- Modify: `frontend/src/components/whatif/what-if-panel.module.css` (gradient slider tracks, glass card)

**Interfaces:** none new — pure CSS.

- [ ] **Step 1: Slider tracks.** Range inputs (what-if panel, home strip): replace `accent-color` with styled tracks — webkit/moz pseudo elements: track `height: 6px; border-radius: 3px; background: var(--bg-grain);`, progress via `background: linear-gradient(var(--grad-accent)) 0/var(--fill,0%) 100% no-repeat` is NOT expressible per-input without JS — instead set inline CSS var from React: each slider already re-renders on change; add `style={{ "--fill": `${r.weightPct}%` } as React.CSSProperties}` and css `background: linear-gradient(to right, oklch(48% 0.24 275) var(--fill), var(--bg-grain) var(--fill));` on the track pseudo-elements. Thumb: 20px circle, white, `--shadow-1`, 44px touch via input height.
- [ ] **Step 2: Weight number-inputs in builder** get a subtle bottom fill bar (2px `::after`-style span behind input showing weight %— implement as a wrapper span with the same `--fill` pattern).
- [ ] **Step 3: Stat tiles** (`.stat`, `.tile`, NumberCard `.card`): keep 1px-gap grid but each cell gains `border-radius: 8px` inside a glass wrapper (outer container gets `glass`, inner cells `background: var(--glass-fill)` solid enough for contrast — verify dark).
- [ ] **Step 4: Verify + commit** — `npx tsc --noEmit && npx playwright test e2e/whatif.spec.ts e2e/analyze.spec.ts --reporter=line`;

```bash
git add frontend/src
git commit -m "style(v3): gradient slider tracks, glass tiles, input fills"
```

---

## Phase 4 — Ticker + compare

### Task 10: Ticker spec-sheet + distribution strip

**Files:**
- Create: `frontend/src/components/ticker/DistributionStrip.tsx` + `distribution-strip.module.css`
- Modify: `frontend/src/components/ticker/TickerView.tsx` + `ticker-view.module.css`
- Modify: `frontend/src/components/ticker/Sparkline.tsx` ONLY IF it lacks a gradient fill already (it has score-based fill — check; likely CSS frame only)

**Interfaces:**
- Consumes: `SectorContext` (existing), `<Reveal>`.
- Produces: `<DistributionStrip percentile={n} label="volatility" />` — horizontal band with marker.

- [ ] **Step 1: DistributionStrip:**

```tsx
import styles from "./distribution-strip.module.css";

// Where this ticker sits in the universe: a band from calm to wild with a
// marker at its percentile. Reads in one glance what a sentence had to say.
export function DistributionStrip({ percentile }: { percentile: number }) {
  const clamped = Math.max(0, Math.min(100, percentile));
  return (
    <div
      className={styles.strip}
      role="img"
      aria-label={`More volatile than ${clamped}% of the universe`}
    >
      <span className={`caption ${styles.end}`}>calmer</span>
      <span className={styles.band}>
        <span className={styles.marker} style={{ left: `${clamped}%` }} />
      </span>
      <span className={`caption ${styles.end}`}>wilder</span>
    </div>
  );
}
```

css: `.band { position: relative; flex: 1; height: 10px; border-radius: 5px; background: linear-gradient(to right, var(--risk-low), var(--risk-mid), var(--risk-high)); opacity: 0.85; } .marker { position: absolute; top: -4px; width: 4px; height: 18px; border-radius: 2px; background: var(--ink); transform: translateX(-50%); box-shadow: var(--shadow-1); } .strip { display: flex; align-items: center; gap: var(--space-1); }` (gradient of the RISK RAMP is data-coloring: the axis IS risk.)

- [ ] **Step 2: Spec-sheet merge.** In TickerView, wrap the gauge + stat `<dl>` into one `glass` card (`.primary` section gets `glass` class, internal layout kept). Context cells: add inline dual-bar per metric (your value vs median — two 6px bars, `--accent` vs `--ink-faint`, widths normalized to the larger value). Replace the "Universe rank" text cell's sentence with `<DistributionStrip percentile={context.universe_volatility_percentile} />` + keep the sentence as `.caption` beneath.
- [ ] **Step 3: Sparkline frame** — `.chartCard` gets `glass`; check Sparkline's fill (it already draws an area fill — leave internals alone per constraints).
- [ ] **Step 4: Verify + commit** — `npx tsc --noEmit && npm run build`;

```bash
git add frontend/src/components/ticker/
git commit -m "feat(v3): ticker glass spec-sheet, dual-bar medians, distribution strip"
```

---

### Task 11: Compare page glass + inline bars

**Files:**
- Modify: `frontend/src/components/compare/CompareGrid.tsx` + its module css (read both first — not yet touched this project)

**Interfaces:** consumes existing compare data shape (read the component).

- [ ] **Step 1: Read CompareGrid.** Map its metric rows. Column cards → `glass`. Each numeric metric cell gains an inline bar (width normalized across the row's max, `--accent` fill; the row's HIGHEST-RISK value — highest vol/drawdown-magnitude/beta/score — additionally tinted `background: var(--risk-high-soft)` on the cell). Risk-tint = data-coloring, allowed.
- [ ] **Step 2: Verify + commit** — `npx tsc --noEmit && npx playwright test e2e/compare.spec.ts --reporter=line`;

```bash
git add frontend/src/components/compare/
git commit -m "feat(v3): compare glass columns with inline bars + risk tint"
```

---

### Task 12: Full sweep — e2e, snapshots, reduced motion

**Files:**
- Modify: `frontend/e2e/visual.spec.ts-snapshots/` (regenerated)
- Modify: any spec whose behavioral assertion changed (audit, not rewrite)

- [ ] **Step 1: Full suites** — `cd backend && .venv/bin/python -m pytest tests/ -q` (87 expected) then `cd frontend && npx vitest run && npx playwright test --reporter=line` (fix any behavioral drift — assertions only, no test deletion).
- [ ] **Step 2: Reduced-motion spot check** — `npx playwright test e2e/redesign.spec.ts --reporter=line` with a temporary `page.emulateMedia({ reducedMotion: "reduce" })` variant added to the spec permanently:

```ts
test("reduced motion still shows all content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
```

- [ ] **Step 3: Regenerate snapshots** — `npx playwright test e2e/visual.spec.ts --update-snapshots --reporter=line` then full suite once more, all green.
- [ ] **Step 4: Commit + push**

```bash
git add frontend/e2e
git commit -m "test(v3): behavioral spec updates, reduced-motion guard, snapshot refresh"
git push
```

---

## Self-review notes

- Spec §1 system → T1–T2; §2 homepage flow items 1–6 → T3 (hero), T4 (strip), T5 (how-it-works), T6 (universe), sample dashboard demotion = position unchanged after strip insertion (T4 places strip above `#sample`); §3 → T7 (composition bar), T8 (rail), T9 (styling); §4 → T10–T11; §5 → per-task verifies + T12.
- Stat-tile median mini-bars from spec §3 folded into T9 scope ONLY as glass restyle; the vs-median data bars ship in T10 for ticker (where medians exist today). Portfolio-level medians would need a new engine endpoint — cut per YAGNI, noted as explicit deviation from spec §3 ("stat tiles → mini bars vs median": deferred; spec's own fail-closed principle favors shipping without inventing a data source).
- Type consistency: `sectorWeights` returns `{sector, pct}[]` consumed by SectorBars only; `rowsFromHoldings` name used in T4 and referenced by WhatIfPanel refactor; `scoreBreakdown` null-contract stated in both test and component.
