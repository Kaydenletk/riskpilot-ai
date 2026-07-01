# Phase 4 — Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home + 11 ticker routes prerender statically, load the TradingView third-party script only on scroll, and track real Core Web Vitals — with no change to rendered output or fixture-fallback behavior.

**Architecture:** Three localized changes: (A) flip the fetch cache mode off `no-store` and add `generateStaticParams` + drop `force-dynamic` so routes prerender from committed fixtures; (B) wrap the TradingView script injection in an IntersectionObserver inside the existing `LiveContextPanel` client component; (C) add `@vercel/speed-insights` to the root layout.

**Tech Stack:** Next.js 15.5.19 App Router, TypeScript, `@vercel/speed-insights@2.0.0`, vitest + Playwright.

## Global Constraints

- Repo root: `/Users/khanhle/Desktop/Desktop - Khanh’s MacBook Pro/💻 Dev-Projects/RiskPilot AI` (quote — spaces + non-ASCII). Set `REPO`; frontend dir `$REPO/frontend`.
- Branch: `perf/static-and-lazy-tradingview` (created; spec committed). Base/prod: `main`.
- **Fully static, NO `revalidate`.** Do not add ISR — phase 5 adds revalidation when a backend is hosted.
- Fixture fallback behavior MUST be preserved: every server fetch keeps its `try/catch` + `AbortSignal.timeout(2500)` and returns the committed fixture on failure.
- **No visual change.** e2e (`e2e/redesign.spec.ts`, 7 tests) + unit (16) must stay green. Rendered output identical.
- `fixtureUniverse()` (from `@/lib/ticker-backend`) is the single source for the 11 tickers — `generateStaticParams` reuses it (same source the sitemap uses).
- Deploy (`vercel --prod`) is GATED on explicit user go — NOT a code task.
- Test commands from `$REPO/frontend`: `npm run test`, `npm run build`, `npm run e2e`.

---

### Task 1: Make server fetches static-compatible (drop `no-store`)

**Files:**
- Modify: `frontend/src/lib/backend.ts` (fetchSampleReport)
- Modify: `frontend/src/lib/ticker-backend.ts` (fetchTickerUniverse, fetchTickerReport)

**Interfaces:**
- Consumes: nothing new.
- Produces: unchanged public signatures — `fetchSampleReport(): Promise<RiskReport>`, `fetchTickerUniverse(): Promise<TickerOption[]>`, `fetchTickerReport(ticker: string): Promise<TickerReport | null>`. Only the internal `fetch` cache mode changes.

`cache: "no-store"` opts a route out of static generation. Switch all three to `cache: "force-cache"` (build-time: fetch throws/times out with no backend → `try/catch` returns the fixture, deterministically). Behavior is unchanged because prod has no backend.

- [ ] **Step 1: Change `fetchSampleReport` in `backend.ts`**

Replace `cache: "no-store",` with `cache: "force-cache",` in the `fetch` options of `fetchSampleReport`. The surrounding `try/catch`, `AbortSignal.timeout(2500)`, and `return FIXTURE;` stay exactly as-is.

- [ ] **Step 2: Change both fetches in `ticker-backend.ts`**

In `fetchTickerUniverse` and `fetchTickerReport`, replace each `cache: "no-store",` with `cache: "force-cache",`. Keep the `signal: AbortSignal.timeout(2500)`, the `try/catch`, the `res.status === 404 → return null`, and the fixture fallbacks unchanged.

- [ ] **Step 3: Unit tests still green (no behavior change)**

Run: `cd "$REPO/frontend" && npm run test`
Expected: 16/16 pass (seo + sitemap-entries + verdict + breakdown). The fetch clients aren't directly unit-tested; this confirms nothing broke.

- [ ] **Step 4: Commit**

```bash
git -C "$REPO" add frontend/src/lib/backend.ts frontend/src/lib/ticker-backend.ts
git -C "$REPO" commit -m "perf: force-cache server fetches so routes can prerender (fixture fallback intact)"
```

---

### Task 2: Prerender the ticker routes (`generateStaticParams`, drop force-dynamic)

**Files:**
- Modify: `frontend/src/app/ticker/[symbol]/page.tsx`

**Interfaces:**
- Consumes: `fixtureUniverse()` from `@/lib/ticker-backend`.
- Produces: 11 prerendered ticker routes at build.

- [ ] **Step 1: Remove `force-dynamic` and add `generateStaticParams`**

In `frontend/src/app/ticker/[symbol]/page.tsx`:
- Delete the line `export const dynamic = "force-dynamic";`
- Add an import for `fixtureUniverse` alongside the existing `fetchTickerReport` import:
  ```ts
  import { fetchTickerReport, fixtureUniverse } from "@/lib/ticker-backend";
  ```
  (`fixtureUniverse` is already exported from that module.)
- Add, after the imports (near `generateMetadata`):
  ```ts
  export function generateStaticParams() {
    return fixtureUniverse().map((o) => ({ symbol: o.ticker.toLowerCase() }));
  }
  ```

Unknown symbols aren't in `generateStaticParams`; at request time `fetchTickerReport` returns null → `notFound()` → 404, unchanged.

- [ ] **Step 2: Build and confirm the ticker route prerenders**

Run: `cd "$REPO/frontend" && npm run build 2>&1 | grep -E "ticker|Static|Dynamic|Compiled" | head`
Expected: `Compiled successfully`; `/ticker/[symbol]` shows as prerendered (`●` SSG / lists the 11 params) — NOT `ƒ (Dynamic)`. If it still shows `ƒ`, a `no-store` fetch remains (revisit Task 1) or `force-dynamic` wasn't removed.

- [ ] **Step 3: Verify all 11 prerendered + 404 for unknown still works**

Run:
```bash
cd "$REPO/frontend" && (npm run start -- -p 3110 >/tmp/p4-t2.log 2>&1 &) && sleep 6
echo "nvda:" && curl -s -o /dev/null -w "%{http_code}\n" localhost:3110/ticker/nvda
echo "unknown zzzz (expect 404):" && curl -s -o /dev/null -w "%{http_code}\n" localhost:3110/ticker/zzzz
kill %1 2>/dev/null
```
Expected: nvda → 200; zzzz → 404.

- [ ] **Step 4: Commit**

```bash
git -C "$REPO" add "frontend/src/app/ticker/[symbol]/page.tsx"
git -C "$REPO" commit -m "perf: prerender 11 ticker routes via generateStaticParams"
```

---

### Task 3: Drop `force-dynamic` from home + api/tickers

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/api/tickers/route.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: home renders statically; `/api/tickers` cacheable.

- [ ] **Step 1: Remove `force-dynamic` from the home page**

In `frontend/src/app/page.tsx`, delete the line `export const dynamic = "force-dynamic";`. The `BackendOffline` fallback and fixture render are unchanged.

- [ ] **Step 2: Remove `force-dynamic` from `api/tickers/route.ts`**

In `frontend/src/app/api/tickers/route.ts`, delete the line `export const dynamic = "force-dynamic";`. The `GET` handler and its 503 fallback stay.

- [ ] **Step 3: Build and confirm home is static**

Run: `cd "$REPO/frontend" && npm run build 2>&1 | grep -E "^┌|^├|^└|Static|Dynamic|Compiled|/  |/api/tickers" | head -20`
Expected: `Compiled successfully`; `/` renders as `○ (Static)` (or prerendered), not `ƒ`. `/api/tickers` no longer forced dynamic.

- [ ] **Step 4: e2e stays green (home output unchanged)**

Run: `cd "$REPO/frontend" && npm run e2e`
Expected: 7/7 pass — the static home renders identically (theme toggle, verdict, single h1, screenshots).

- [ ] **Step 5: Commit**

```bash
git -C "$REPO" add frontend/src/app/page.tsx frontend/src/app/api/tickers/route.ts
git -C "$REPO" commit -m "perf: drop force-dynamic from home + api/tickers (static/cacheable)"
```

---

### Task 4: TradingView lazy-load via IntersectionObserver

**Files:**
- Modify: `frontend/src/components/ticker/LiveContextPanel.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: TradingView script injected only when the panel scrolls into view.

- [ ] **Step 1: Replace mount-time injection with an IntersectionObserver**

Rewrite the `useEffect` in `LiveContextPanel.tsx` so it (1) defines a `loadWidget()` that does the existing script injection, (2) if `IntersectionObserver` is unavailable, calls `loadWidget()` immediately (old-browser fallback), (3) otherwise observes the container and calls `loadWidget()` + disconnects on first intersection. Keep the symbol-change dependency and the `<noscript>` fallback. The full new `useEffect` + helper:

```tsx
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // clear any prior widget (symbol change / remount)
    container.innerHTML = "";
    let injected = false;

    function loadWidget() {
      if (injected || !container) return;
      injected = true;
      const script = document.createElement("script");
      script.src = WIDGET_SRC;
      script.async = true;
      script.type = "text/javascript";
      script.innerHTML = JSON.stringify({
        symbol: ticker.toUpperCase(),
        width: "100%",
        height: 200,
        locale: "en",
        dateRange: "12M",
        colorTheme: "light",
        isTransparent: true,
        autosize: false,
        largeChartUrl: "",
      });
      container.appendChild(script);
    }

    // No IntersectionObserver (very old browser / SSR safety) → load immediately.
    if (typeof IntersectionObserver === "undefined") {
      loadWidget();
      return () => {
        if (container) container.innerHTML = "";
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadWidget();
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }, // start loading just before it scrolls into view
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (container) container.innerHTML = "";
    };
  }, [ticker]);
```

Leave the JSX (`<section>`, header, note, `<div ref={containerRef}>`, `<noscript>`) unchanged.

- [ ] **Step 2: Build passes**

Run: `cd "$REPO/frontend" && npm run build 2>&1 | grep -E "Compiled|error|Error" | head`
Expected: `Compiled successfully`.

- [ ] **Step 3: Verify the script does NOT load until the panel is in view**

Write a temporary Playwright check (or use the existing e2e harness). Concretely:
```bash
cd "$REPO/frontend" && (npm run start -- -p 3111 >/tmp/p4-t4.log 2>&1 &) && sleep 6
# The mini-widget script must be absent from the initially-served HTML (it's injected client-side only on scroll):
echo "s3.tradingview in initial ticker HTML (expect 0):" && curl -s localhost:3111/ticker/nvda | grep -c "s3.tradingview.com"
kill %1 2>/dev/null
```
Expected: `0` — the third-party script is not in the server HTML. (The pre-change code also injected client-side, so absence from HTML is necessary but not sufficient; Step 4 adds the real in-browser scroll check.)

- [ ] **Step 4: Browser scroll check (real network assertion)**

Add a Playwright test `frontend/e2e/tradingview-lazy.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("TradingView script loads only after the panel scrolls into view", async ({ page }) => {
  const tvRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("s3.tradingview.com")) tvRequests.push(r.url());
  });

  await page.goto("/ticker/nvda");
  // Above the fold: the widget must NOT have requested yet.
  await page.waitForTimeout(500);
  expect(tvRequests, "TradingView should not load before scroll").toHaveLength(0);

  // Scroll the live-context panel into view.
  await page.getByText("Live market context").scrollIntoViewIfNeeded();
  await expect
    .poll(() => tvRequests.length, { timeout: 5000 })
    .toBeGreaterThan(0);
});
```

Run: `cd "$REPO/frontend" && npx playwright test tradingview-lazy`
Expected: PASS — 0 requests before scroll, ≥1 after.

- [ ] **Step 5: Commit**

```bash
git -C "$REPO" add frontend/src/components/ticker/LiveContextPanel.tsx frontend/e2e/tradingview-lazy.spec.ts
git -C "$REPO" commit -m "perf: lazy-load TradingView widget via IntersectionObserver"
```

---

### Task 5: Add Speed Insights

**Files:**
- Modify: `frontend/package.json` (add dependency)
- Modify: `frontend/src/app/layout.tsx` (mount `<SpeedInsights />`)

**Interfaces:**
- Consumes: `@vercel/speed-insights/next`.
- Produces: CWV collection in prod.

- [ ] **Step 1: Install the dependency**

Run: `cd "$REPO/frontend" && npm install @vercel/speed-insights@2.0.0`
Expected: added to `dependencies`; `package-lock.json` updated.

- [ ] **Step 2: Mount `<SpeedInsights />` in the layout**

In `frontend/src/app/layout.tsx`, add the import and render the component inside `<body>` after `{children}`'s wrapper:
```tsx
import { SpeedInsights } from "@vercel/speed-insights/next";
```
and in the returned JSX, inside `<body>`:
```tsx
      <body>
        <main>{children}</main>
        <SpeedInsights />
      </body>
```

- [ ] **Step 3: Build passes with the new component**

Run: `cd "$REPO/frontend" && npx tsc --noEmit && npm run build 2>&1 | grep -E "Compiled|error|Error" | head`
Expected: no type errors; `Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git -C "$REPO" add frontend/package.json frontend/package-lock.json frontend/src/app/layout.tsx
git -C "$REPO" commit -m "perf: add Vercel Speed Insights for real Core Web Vitals"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full build — confirm static rendering**

Run: `cd "$REPO/frontend" && npm run build 2>&1 | tail -25`
Expected: `Compiled successfully`; the route table shows `/` and `/ticker/[symbol]` prerendered (SSG `●`/`○`), with the 11 ticker params generated; NOT `ƒ (Dynamic)`.

- [ ] **Step 2: Full unit + e2e suite**

Run: `cd "$REPO/frontend" && npm run test && npm run e2e`
Expected: unit 16/16; e2e 8/8 (7 redesign + 1 tradingview-lazy). No visual regression.

- [ ] **Step 3: Record evidence**

Note in the phase ledger: build shows N static routes incl 11 tickers; unit + e2e counts; TradingView 0-before-scroll / ≥1-after. `x-vercel-cache: HIT` is verified post-deploy (gated step), not here.

- [ ] **Step 4: Commit (if any lockfile/formatting drift)**

```bash
git -C "$REPO" status --short
# commit only if something changed
```

---

## Post-plan: gated deploy (NOT a code task)

After merge to `main`: `vercel --prod` from `frontend/` (gated on user go). Then verify live:
- `curl -sI https://riskpilot-coach.vercel.app/ticker/nvda | grep -i x-vercel-cache` → `HIT` on the second request (was MISS).
- In a browser, confirm no `s3.tradingview.com` request on ticker load until scrolling to the panel.
- Speed Insights script present in prod HTML.

**Phase-5 handoff:** when a live backend is hosted, add ISR (`revalidate`) so the static pages pick up fresh data instead of the build-time fixtures.

## Self-Review

**Spec coverage:** A (fetch cache → Task 1; generateStaticParams + drop force-dynamic ticker → Task 2; home + api/tickers → Task 3). B (IntersectionObserver → Task 4). C (Speed Insights → Task 5). Verification → Task 6. Fully-static / no-revalidate honored (Global Constraints). Deploy gated (post-plan). ✓

**Placeholder scan:** every code step shows the exact edit or full code block; the Playwright test is complete; no TBD. ✓

**Type consistency:** `fixtureUniverse()` returns `TickerOption[]` (has `.ticker`) — used in `generateStaticParams` (Task 2) matching its use in the sitemap (phase 3). Public fetch signatures unchanged (Task 1). `SpeedInsights` imported from `@vercel/speed-insights/next` (Task 5). ✓

**Executor note:** set `REPO="/Users/khanhle/Desktop/Desktop - Khanh’s MacBook Pro/💻 Dev-Projects/RiskPilot AI"`. Subagents lose cwd on the emoji path — run inline (see `.superpowers/sdd/progress.md`). Kill stray `next start` on the test port before re-running.
