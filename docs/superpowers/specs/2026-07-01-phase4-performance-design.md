# Phase 4 — Performance: static rendering, TradingView lazy-load, Speed Insights

**Date:** 2026-07-01
**Status:** Approved (design), pending spec review
**Part of:** RiskPilot AI investor-readiness sequence (phase 4 of 6)

## Context

Verified on `main` (`c4cb750`, phase 3 merged):

- Home `page.tsx`, ticker `[symbol]/page.tsx`, and `api/tickers/route.ts` all export
  `dynamic = "force-dynamic"` → every request server-rendered, uncached
  (`x-vercel-cache: MISS`).
- No `generateStaticParams` → the 11 ticker routes are not prerendered.
- `fetchSampleReport` (backend.ts) and `fetchTickerReport`/`fetchTickerUniverse`
  (ticker-backend.ts) use `fetch(..., { cache: "no-store", signal: timeout(2500) })`
  — they prefer a live backend and fall back to committed fixtures
  (`demo-report.json`, `ticker-fixtures.json`). **`no-store` forces dynamic rendering.**
- Prod has **no backend hosted** → these always fall back to the committed fixtures.
- `LiveContextPanel` (TradingView) is `"use client"` and injects
  `s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js` in a
  `useEffect` **on mount** — eager, even though the panel is below the fold. ~43
  third-party requests on ticker page load.
- No web-vitals / Speed Insights instrumentation.

## Decisions (approved)

- **Fully static rendering** (no ISR revalidate). Prerender the 11 tickers + home from
  the committed fixtures. Because prod has no backend, this is always correct today.
  **Phase-5 handoff:** when a live backend is hosted, revalidation (ISR) must be added
  so static pages pick up fresh data — flagged, not done here.
- **TradingView: IntersectionObserver** — inject the widget script only when the panel
  scrolls into view. Keep the `<noscript>` fallback.
- **Add `@vercel/speed-insights`** for real Core Web Vitals from prod users.

## Goal

Ticker + home routes prerender statically (cache HIT), the TradingView third-party
script loads only on scroll, and real CWV are tracked — without changing rendered
output or the fixture-fallback behavior.

## Non-Goals

- No backend hosting or ISR revalidation (phase 5 adds revalidation).
- No SEO change (phase 3 done).
- No visual redesign — output identical.
- No portfolio upload (phase 5), no benchmark (phase 6).

## Design

### A. Static rendering

- **`fetch` cache compatibility (blocker for static):** `no-store` opts a route out of
  static generation. Change the three server fetches so that build-time prerender uses
  the fixture cleanly:
  - Replace `cache: "no-store"` with `cache: "force-cache"` (or remove the option so the
    default applies) on `fetchSampleReport`, `fetchTickerReport`, `fetchTickerUniverse`.
    The `try/catch` + `AbortSignal.timeout(2500)` fallback to fixtures is retained, so
    behavior is unchanged (prod has no backend → fixture either way). This makes the
    fetch static-compatible.
  - Rationale: with no backend, the fetch throws/times out at build and the fixture is
    returned — deterministic static output. When a backend is later hosted, phase 5
    switches these to a revalidating strategy.
- **Ticker page:** add
  ```ts
  export async function generateStaticParams() {
    return fixtureUniverse().map((o) => ({ symbol: o.ticker.toLowerCase() }));
  }
  ```
  and **remove** `export const dynamic = "force-dynamic"`. All 11 ticker routes
  prerender. `fetchTickerReport` still returns `notFound()` for unknown symbols at
  request time (those aren't in `generateStaticParams`, so they're dynamically rendered
  → 404, unchanged).
- **Home page:** remove `export const dynamic = "force-dynamic"`. Renders statically
  from the fixture. The `BackendOffline` fallback path still works (fixture is present).
- **`api/tickers/route.ts`:** remove `force-dynamic` so the response can be cached. (It
  returns the static universe.)

### B. TradingView lazy-load (IntersectionObserver)

- In `LiveContextPanel`, replace the mount-time script injection with an
  IntersectionObserver that injects the script the first time the panel's container
  enters the viewport (with a small rootMargin so it starts slightly before). Once
  loaded, disconnect the observer. Keep the symbol-change remount behavior. Keep the
  `<noscript>` fallback. Net effect: zero `s3.tradingview.com` requests until the user
  scrolls to the panel.

### C. Speed Insights

- Add `@vercel/speed-insights` dependency; mount `<SpeedInsights />` in `layout.tsx`
  (App Router import: `@vercel/speed-insights/next`). Collects CWV from real users on
  Vercel with no config.

## Architecture / boundaries

`LiveContextPanel` stays a single self-contained client component — the observer logic
lives inside it. The fetch-cache change is localized to the two server clients
(`backend.ts`, `ticker-backend.ts`) and does not change their public signatures.
`generateStaticParams` reads the same `fixtureUniverse()` source as the sitemap
(phase 3) — one source of truth.

## Error handling

- Fetch still `try/catch`es and falls back to the fixture; the cache-mode change does
  not remove the fallback.
- IntersectionObserver guarded for SSR (only runs client-side, in `useEffect`); if
  `IntersectionObserver` is unavailable (very old browser), fall back to injecting
  immediately so the chart still loads.

## Verification (evidence required)

- `npm run build` output shows `/ticker/[symbol]` and `/` as `○ (Static)` /
  prerendered, and lists 11 prerendered ticker paths (not `ƒ Dynamic`).
- e2e (7/7) + unit (16/16) still green; rendered output visually identical.
- Local: load a ticker page, confirm NO request to `s3.tradingview.com` until the panel
  is scrolled into view (Playwright network capture or devtools), then it loads.
- `<noscript>` fallback still present.
- Speed Insights script present in prod HTML after deploy.
- After deploy: `x-vercel-cache: HIT` on repeat ticker/home requests (was MISS).

## Success criteria

11 ticker routes + home prerender statically (cache HIT in prod), TradingView loads
only on scroll (~43 fewer initial third-party requests), real CWV tracked, and the
rendered UI + fixture-fallback behavior are unchanged. Phase-5 ISR handoff documented.
