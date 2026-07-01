# Phase 3 — Technical SEO

**Date:** 2026-07-01
**Status:** Approved (design), pending spec review
**Part of:** RiskPilot AI investor-readiness sequence (phase 3 of 6)

## Context

The redesigned UI is live (phase 1) but has no technical SEO. Verified gaps on
`main` (`7f9c79c`):

- No `robots.ts`, `sitemap.ts`, `manifest.ts`, favicon/icon, or OG image. No `public/`.
- `layout.tsx` has one static title/description and **no `metadataBase`** → relative
  canonical/OG URLs cannot resolve.
- `ticker/[symbol]/page.tsx` has **no `generateMetadata`** → all 11 tickers share the
  home title/description.
- Home + ticker have **no `<h1>`** (masthead brand is a `<div>`).
- Ticker discovery is JS-only: the home `SearchPalette` (⌘K) routes via
  `router.push` with `<button>`/`<li>` — **crawlers see zero ticker URLs**.

Enabling facts:
- The ticker universe is committed fixtures (`frontend/src/lib/ticker-fixtures.json`):
  **11 tickers** (NVDA, AMD, MSFT, AAPL, TSLA, AMZN, JPM, XOM, KO, PG, JNJ), each with
  `risk_score`, `risk_band`, `volatility_annualized_pct`, `max_drawdown_pct`, `beta`,
  `sector`. `fixtureUniverse()` returns them without a backend — usable in
  `sitemap.ts` and `generateMetadata` at build/request time.
- Next.js 15.5.19, App Router. Version-correct APIs confirmed via Next docs:
  `MetadataRoute.Robots/Sitemap/Manifest`, async `generateMetadata` with
  `await params`, dynamic `opengraph-image` via `ImageResponse`, `metadataBase` +
  `alternates.canonical`.

## Decisions (approved)

- **Canonical origin / `metadataBase`:** `https://riskpilot-coach.vercel.app`. This
  branded domain currently serves a different/older build; a Vercel alias change to
  point it at the current redesign deploy is REQUIRED and gated on explicit user go
  (same gate discipline as the phase-1 deploy).
- **Rendering stays `force-dynamic` in phase 3.** `generateStaticParams` + dropping
  `force-dynamic` + caching is phase 4. Metadata, headings, and crawlable links all
  work regardless of rendering mode, so phase boundaries stay clean.

## Goal

Search engines can discover all 11 ticker pages and index rich, unique metadata;
shared links render branded OG cards; the site has valid robots/sitemap/manifest/icon.

## Non-Goals (out of scope for phase 3)

- No rendering-strategy change (`force-dynamic` stays) — phase 4.
- No TradingView change — phase 4.
- No backend hosting — phase 5.
- No new visible marketing copy beyond headings + a small crawlable ticker list.

## Design

### A. Metadata infrastructure (new files under `frontend/src/app/`)

- `robots.ts` → `MetadataRoute.Robots`: `userAgent '*'`, allow `/`, `sitemap` at the
  canonical origin. (No disallows — the app is fully public.)
- `sitemap.ts` → `MetadataRoute.Sitemap`: home `/` + one entry per ticker
  (`/ticker/<lowercased ticker>`), enumerated from `fixtureUniverse()`. `changeFrequency`
  and `priority` set (home highest).
- `manifest.ts` → `MetadataRoute.Manifest`: name "RiskPilot AI — Portfolio Risk Coach",
  short_name "RiskPilot", description, `start_url '/'`, `display 'standalone'`,
  theme/background colors matching the design tokens, icons referencing the generated
  icon.
- `icon.tsx` (favicon via `ImageResponse`) — the "R" / RiskPilot mark on the accent
  color; kills the favicon 404. `apple-icon.tsx` optional if trivial.
- `opengraph-image.tsx` (home) — branded 1200×630 `ImageResponse`: product name +
  tagline ("Portfolio risk math you can verify"). `twitter-image` can reuse it.
- `ticker/[symbol]/opengraph-image.tsx` — per-ticker 1200×630 `ImageResponse`: ticker,
  risk score/band, sector, from the fixture report. `notFound` symbols → skip.
- `layout.tsx` — add `metadataBase: new URL('https://riskpilot-coach.vercel.app')` and
  richer default `openGraph`/`twitter`/`alternates.canonical` on the root metadata.

### B. Per-ticker metadata, headings, crawlable links

- `ticker/[symbol]/page.tsx` — add async `generateMetadata({ params })`: `await params`,
  look up the fixture report; if absent return minimal/no-index metadata (mirrors
  `notFound()`), else return unique `title` (e.g. `NVDA Risk Score 80/100 — Technology |
  RiskPilot AI`), `description` from real facts (volatility, drawdown, beta),
  `openGraph`, and `alternates.canonical` = the ticker URL.
- **Headings (semantic, not visual):** retag existing text to real headings without
  changing the rendered design.
  - Home: promote the page's primary line to an `<h1>` (e.g. the masthead brand or a
    "Portfolio risk X-Ray" heading). If the brand must stay a link, add a visually
    styled `<h1>` for the page's actual title.
  - Ticker: an `<h1>` like `XOM Risk Score — Energy`, and `<h2>`s on the number
    sections (Risk Score, Volatility, Drawdown) — retagging existing labels.
  - Constraint: no duplicate visible text; restyle tags, don't add copy.
- **Crawlable ticker links:** add a server-rendered `<nav>`/`<section>` on the home page
  containing a static `<a href="/ticker/<ticker>">` for each of the 11 tickers (labeled
  with ticker + sector). This is the crawl path AND a no-JS fallback. The ⌘K
  `SearchPalette` stays for human interaction — the `<a>` list complements it.

## Architecture / boundaries

Each metadata file is a single-responsibility module with a typed return
(`MetadataRoute.*` or `Metadata`). `sitemap.ts` and both `opengraph-image` files and
`generateMetadata` all consume the SAME `fixtureUniverse()` / fixture-report source —
no duplicated ticker list. A shared helper (e.g. `lib/seo.ts`) may hold the canonical
origin constant and the ticker→metadata mapping so the OG image and `generateMetadata`
don't drift.

## Error handling

- `generateMetadata` for an unknown symbol returns robots `{ index: false }` (don't
  index a page that will `notFound()`), never throws.
- OG image routes handle a missing fixture by rendering the branded default, not erroring.
- Sitemap/robots are pure functions over committed data — no runtime failure path.

## Verification (evidence required)

- `npm run build` green; build output lists `robots.txt`, `sitemap.xml`, `manifest`,
  `icon`, `opengraph-image` routes.
- Local curl: `/robots.txt`, `/sitemap.xml` (contains all 11 ticker URLs + home),
  `/manifest.webmanifest`, `/icon`, `/opengraph-image` all 200 with correct content-type.
- Per-ticker: view-source on two ticker pages shows DISTINCT `<title>`/`<meta
  description>`/`og:*`; home HTML contains 11 `<a href="/ticker/...">`; home + ticker
  each have exactly one `<h1>`.
- Rendered design unchanged (Playwright visual still green — headings are retags).
- After the (gated) alias change: `riskpilot-coach.vercel.app` serves the redesign and
  canonical/OG URLs resolve against it.

## Success criteria

All SEO metadata files present and valid; 11 tickers crawlable via real `<a>` links and
listed in the sitemap; each ticker has unique metadata + OG card; home + ticker have a
semantic `<h1>`; the branded canonical domain serves current prod. The redesign's visual
output is unchanged.
