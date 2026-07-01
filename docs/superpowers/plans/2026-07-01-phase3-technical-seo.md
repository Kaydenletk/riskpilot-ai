# Phase 3 — Technical SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete technical SEO to the Next.js frontend — metadata files, per-ticker metadata, semantic headings, and crawlable ticker links — so all 11 ticker pages are discoverable and richly indexed, without changing the redesign's visuals.

**Architecture:** App Router metadata files (`robots.ts`, `sitemap.ts`, `manifest.ts`, `icon.tsx`, `opengraph-image.tsx`) plus a shared `lib/seo.ts` that owns the canonical origin and the ticker→metadata mapping so the sitemap, OG images, and `generateMetadata` all read ONE source (the committed fixtures). Rendering stays `force-dynamic` (phase 4 flips it). Headings are semantic retags of existing text — no new visible copy.

**Tech Stack:** Next.js 15.5.19 App Router, TypeScript, `next/og` `ImageResponse` (verified available), vitest (unit), Playwright (visual).

## Global Constraints

- Repo root: `/Users/khanhle/Desktop/Desktop - Khanh’s MacBook Pro/💻 Dev-Projects/RiskPilot AI` (quote it — spaces + non-ASCII). Frontend dir: `frontend/`. Set `REPO` and work from `$REPO/frontend`.
- Branch: `feat/technical-seo` (already created; spec committed). Base/prod: `main`.
- Next.js **15.5.19**, App Router. `generateMetadata` and dynamic route params are **async** — always `await params` (`params: Promise<{ symbol: string }>`).
- Path alias: `@/*` → `frontend/src/*`.
- Canonical origin (`metadataBase`): **`https://riskpilot-coach.vercel.app`** — the single source of truth is `CANONICAL_ORIGIN` in `lib/seo.ts`. The Vercel alias change to point that domain at the current deploy is **gated on explicit user go** — NOT part of this code plan.
- Ticker universe = committed fixtures. `fixtureUniverse(): TickerOption[]` and the fixture reports come from `@/lib/ticker-backend` / `ticker-fixtures.json`. **11 tickers.** Never hardcode the ticker list — enumerate from the fixtures.
- `TickerFacts` fields (exact): `risk_score:number`, `risk_band:"conservative"|"moderate"|"aggressive"`, `volatility_annualized_pct:number`, `max_drawdown_pct:number`, `beta:number`, `sector:string`.
- **Rendering stays `force-dynamic`** on home + ticker pages. Do NOT add `generateStaticParams` or remove `force-dynamic` — that's phase 4.
- **No visual change.** Headings are retags. Playwright visual (`e2e/redesign.spec.ts`) must stay green; add an `<h1>` presence assertion.
- Commit after each task. Use `--no-verify` only if a pre-commit hook is absent/irrelevant; otherwise let hooks run.
- Test commands run from `$REPO/frontend`: `npm run test` (vitest), `npm run build`, `npm run e2e`.

---

### Task 1: `lib/seo.ts` — canonical origin + ticker metadata helpers (TDD)

**Files:**
- Create: `frontend/src/lib/seo.ts`
- Test: `frontend/src/lib/seo.test.ts`

**Interfaces:**
- Consumes: `TickerFacts`, `TickerOption` from `@/lib/types`.
- Produces:
  - `CANONICAL_ORIGIN: string` = `"https://riskpilot-coach.vercel.app"`
  - `tickerPath(ticker: string): string` → `/ticker/<lowercased>`
  - `tickerTitle(ticker: string, facts: TickerFacts): string`
  - `tickerDescription(ticker: string, facts: TickerFacts): string`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/seo.test.ts
import { describe, expect, it } from "vitest";
import { CANONICAL_ORIGIN, tickerPath, tickerTitle, tickerDescription } from "./seo";
import type { TickerFacts } from "./types";

const NVDA: TickerFacts = {
  risk_score: 80,
  risk_band: "aggressive",
  volatility_annualized_pct: 42,
  max_drawdown_pct: -35.5,
  beta: 1.75,
  sector: "Technology",
};

describe("seo helpers", () => {
  it("canonical origin is the branded prod domain", () => {
    expect(CANONICAL_ORIGIN).toBe("https://riskpilot-coach.vercel.app");
  });

  it("tickerPath lowercases and prefixes /ticker/", () => {
    expect(tickerPath("NVDA")).toBe("/ticker/nvda");
    expect(tickerPath("xom")).toBe("/ticker/xom");
  });

  it("tickerTitle includes ticker, score, and sector", () => {
    const t = tickerTitle("NVDA", NVDA);
    expect(t).toContain("NVDA");
    expect(t).toContain("80");
    expect(t).toContain("Technology");
    expect(t).toContain("RiskPilot AI");
  });

  it("tickerDescription surfaces real facts (volatility, drawdown, beta)", () => {
    const d = tickerDescription("NVDA", NVDA);
    expect(d).toContain("42");        // volatility
    expect(d).toContain("35.5");      // drawdown magnitude
    expect(d).toContain("1.75");      // beta
    expect(d.length).toBeGreaterThan(50);
    expect(d.length).toBeLessThanOrEqual(160); // meta description budget
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "$REPO/frontend" && npm run test -- seo`
Expected: FAIL — `seo.ts` does not exist / exports undefined.

- [ ] **Step 3: Write the implementation**

```ts
// frontend/src/lib/seo.ts
// Single source of truth for SEO-facing strings and the canonical origin.
// The sitemap, OG images, and generateMetadata all read from here so the
// ticker metadata can never drift between surfaces.
import type { TickerFacts } from "./types";

export const CANONICAL_ORIGIN = "https://riskpilot-coach.vercel.app";

export function tickerPath(ticker: string): string {
  return `/ticker/${ticker.toLowerCase()}`;
}

export function tickerTitle(ticker: string, facts: TickerFacts): string {
  const score = Math.round(facts.risk_score);
  return `${ticker.toUpperCase()} Risk Score ${score}/100 — ${facts.sector} | RiskPilot AI`;
}

export function tickerDescription(ticker: string, facts: TickerFacts): string {
  const vol = Math.round(facts.volatility_annualized_pct);
  const dd = Math.abs(facts.max_drawdown_pct);
  const t = ticker.toUpperCase();
  return `${t} risk read: ${facts.risk_band} (score ${Math.round(
    facts.risk_score,
  )}/100). Annualized volatility ~${vol}%, worst sample drawdown ${dd}%, beta ${facts.beta}. Illustrative sample data, not advice.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "$REPO/frontend" && npm run test -- seo`
Expected: PASS (4 tests). If `tickerDescription` exceeds 160 chars for NVDA, tighten the wording until it fits — the test enforces the budget.

- [ ] **Step 5: Commit**

```bash
git -C "$REPO" add frontend/src/lib/seo.ts frontend/src/lib/seo.test.ts
git -C "$REPO" commit -m "feat(seo): canonical origin + ticker metadata helpers"
```

---

### Task 2: `sitemap.ts` — home + 11 ticker URLs from fixtures (TDD)

**Files:**
- Create: `frontend/src/app/sitemap.ts`
- Test: `frontend/src/lib/sitemap-entries.test.ts`
- Create: `frontend/src/lib/sitemap-entries.ts` (pure, testable core)

**Interfaces:**
- Consumes: `fixtureUniverse()` from `@/lib/ticker-backend`; `CANONICAL_ORIGIN`, `tickerPath` from `@/lib/seo`.
- Produces: `sitemapEntries(): MetadataRoute.Sitemap` (pure) and the default `sitemap()` export that Next reads.

Split the pure enumeration into `lib/sitemap-entries.ts` so it can be unit-tested without invoking Next's file-convention machinery.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/sitemap-entries.test.ts
import { describe, expect, it } from "vitest";
import { sitemapEntries } from "./sitemap-entries";
import { fixtureUniverse } from "./ticker-backend";

describe("sitemapEntries", () => {
  it("includes the home page", () => {
    const urls = sitemapEntries().map((e) => e.url);
    expect(urls).toContain("https://riskpilot-coach.vercel.app");
  });

  it("includes every ticker in the universe, lowercased", () => {
    const entries = sitemapEntries();
    const universe = fixtureUniverse();
    for (const { ticker } of universe) {
      expect(entries.some((e) => e.url.endsWith(`/ticker/${ticker.toLowerCase()}`))).toBe(true);
    }
    // home + N tickers
    expect(entries.length).toBe(universe.length + 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "$REPO/frontend" && npm run test -- sitemap-entries`
Expected: FAIL — `sitemap-entries.ts` missing.

- [ ] **Step 3: Write the implementation**

```ts
// frontend/src/lib/sitemap-entries.ts
import type { MetadataRoute } from "next";

import { CANONICAL_ORIGIN, tickerPath } from "./seo";
import { fixtureUniverse } from "./ticker-backend";

export function sitemapEntries(): MetadataRoute.Sitemap {
  const home: MetadataRoute.Sitemap[number] = {
    url: CANONICAL_ORIGIN,
    changeFrequency: "weekly",
    priority: 1,
  };
  const tickers: MetadataRoute.Sitemap = fixtureUniverse().map((o) => ({
    url: `${CANONICAL_ORIGIN}${tickerPath(o.ticker)}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return [home, ...tickers];
}
```

```ts
// frontend/src/app/sitemap.ts
import type { MetadataRoute } from "next";

import { sitemapEntries } from "@/lib/sitemap-entries";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "$REPO/frontend" && npm run test -- sitemap-entries`
Expected: PASS (2 tests) — 12 entries (home + 11).

- [ ] **Step 5: Commit**

```bash
git -C "$REPO" add frontend/src/lib/sitemap-entries.ts frontend/src/lib/sitemap-entries.test.ts frontend/src/app/sitemap.ts
git -C "$REPO" commit -m "feat(seo): sitemap with home + all ticker URLs from fixtures"
```

---

### Task 3: `robots.ts` + `manifest.ts`

**Files:**
- Create: `frontend/src/app/robots.ts`
- Create: `frontend/src/app/manifest.ts`

**Interfaces:**
- Consumes: `CANONICAL_ORIGIN` from `@/lib/seo`.
- Produces: default `robots()` and `manifest()` exports (no other task depends on them).

No unit test — these are static config functions verified by the build + curl in Task 8.

- [ ] **Step 1: Write `robots.ts`**

```ts
// frontend/src/app/robots.ts
import type { MetadataRoute } from "next";

import { CANONICAL_ORIGIN } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: CANONICAL_ORIGIN,
  };
}
```

- [ ] **Step 2: Write `manifest.ts`**

```ts
// frontend/src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RiskPilot AI — Portfolio Risk Coach",
    short_name: "RiskPilot",
    description:
      "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [{ src: "/icon", sizes: "any", type: "image/png" }],
  };
}
```

- [ ] **Step 3: Type-check builds**

Run: `cd "$REPO/frontend" && npx tsc --noEmit`
Expected: no type errors from the two new files.

- [ ] **Step 4: Commit**

```bash
git -C "$REPO" add frontend/src/app/robots.ts frontend/src/app/manifest.ts
git -C "$REPO" commit -m "feat(seo): robots.txt + web manifest"
```

---

### Task 4: `icon.tsx` — generated favicon (kills favicon 404)

**Files:**
- Create: `frontend/src/app/icon.tsx`

**Interfaces:**
- Consumes: `next/og` `ImageResponse`.
- Produces: the `/icon` route (referenced by `manifest.ts` Task 3).

- [ ] **Step 1: Write `icon.tsx`**

```tsx
// frontend/src/app/icon.tsx
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#7c9cff",
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        R
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd "$REPO/frontend" && npm run build 2>&1 | grep -i "icon\|error" | head`
Expected: build lists an `/icon` route; no error. (Full build asserted in Task 8; this is a quick check.)

- [ ] **Step 3: Commit**

```bash
git -C "$REPO" add frontend/src/app/icon.tsx
git -C "$REPO" commit -m "feat(seo): generated favicon icon"
```

---

### Task 5: OG images — home + per-ticker (`opengraph-image.tsx`)

**Files:**
- Create: `frontend/src/app/opengraph-image.tsx`
- Create: `frontend/src/app/ticker/[symbol]/opengraph-image.tsx`

**Interfaces:**
- Consumes: `next/og` `ImageResponse`; `fetchTickerReport` from `@/lib/ticker-backend`; `CANONICAL_ORIGIN` (unused directly but shared branding).
- Produces: `/opengraph-image` (home) and `/ticker/[symbol]/opengraph-image` routes referenced by metadata (layout default + Task 7).

- [ ] **Step 1: Write the home OG image**

```tsx
// frontend/src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RiskPilot AI — Portfolio Risk Coach";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, color: "#7c9cff", fontWeight: 700 }}>RiskPilot AI</div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>
          Portfolio risk math you can verify.
        </div>
        <div style={{ fontSize: 32, color: "#a3a3a3", marginTop: 24 }}>
          AI explanations that cannot invent the numbers.
        </div>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 2: Write the per-ticker OG image**

```tsx
// frontend/src/app/ticker/[symbol]/opengraph-image.tsx
import { ImageResponse } from "next/og";

import { fetchTickerReport } from "@/lib/ticker-backend";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ticker risk read — RiskPilot AI";

export default async function TickerOg({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const report = await fetchTickerReport(symbol);

  // Unknown symbol → branded default card (never throw from an OG route).
  const heading = report ? report.ticker : "RiskPilot AI";
  const score = report ? `${Math.round(report.facts.risk_score)}/100` : "";
  const sub = report
    ? `${report.facts.risk_band} · ${report.facts.sector} · vol ~${Math.round(
        report.facts.volatility_annualized_pct,
      )}%`
    : "Portfolio risk math you can verify.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 32, color: "#7c9cff", fontWeight: 700 }}>RiskPilot AI · risk read</div>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 16 }}>{heading}</div>
        {score ? <div style={{ fontSize: 56, marginTop: 8 }}>Risk score {score}</div> : null}
        <div style={{ fontSize: 32, color: "#a3a3a3", marginTop: 24 }}>{sub}</div>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 3: Verify both build**

Run: `cd "$REPO/frontend" && npm run build 2>&1 | grep -i "opengraph\|error" | head`
Expected: build lists `/opengraph-image` and `/ticker/[symbol]/opengraph-image`; no error.

- [ ] **Step 4: Commit**

```bash
git -C "$REPO" add frontend/src/app/opengraph-image.tsx "frontend/src/app/ticker/[symbol]/opengraph-image.tsx"
git -C "$REPO" commit -m "feat(seo): home + per-ticker OG images"
```

---

### Task 6: `layout.tsx` — metadataBase + richer root metadata

**Files:**
- Modify: `frontend/src/app/layout.tsx` (the `metadata` export, lines ~6-10)

**Interfaces:**
- Consumes: `CANONICAL_ORIGIN` from `@/lib/seo`.
- Produces: root metadata with `metadataBase`, `openGraph`, `twitter`, `alternates.canonical` — inherited by all pages.

- [ ] **Step 1: Replace the `metadata` export**

Replace the existing `export const metadata: Metadata = { title, description }` block with:

```tsx
import type { Metadata } from "next";
import { spaceGrotesk } from "@/lib/fonts";
import { CANONICAL_ORIGIN } from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: {
    default: "RiskPilot AI — Portfolio Risk Coach",
    template: "%s | RiskPilot AI",
  },
  description:
    "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "RiskPilot AI",
    title: "RiskPilot AI — Portfolio Risk Coach",
    description:
      "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
    url: CANONICAL_ORIGIN,
  },
  twitter: {
    card: "summary_large_image",
    title: "RiskPilot AI — Portfolio Risk Coach",
    description: "Portfolio risk math you can verify. AI explanations that cannot invent the numbers.",
  },
};
```

Note: the `title` becomes an object with `template`. Because ticker titles from `tickerTitle()` already end with `| RiskPilot AI`, set the ticker page's `title` via `generateMetadata` using `absolute` (Task 7) to avoid a doubled suffix.

- [ ] **Step 2: Type-check + build**

Run: `cd "$REPO/frontend" && npx tsc --noEmit && npm run build 2>&1 | tail -3`
Expected: no type errors; build succeeds.

- [ ] **Step 3: Commit**

```bash
git -C "$REPO" add frontend/src/app/layout.tsx
git -C "$REPO" commit -m "feat(seo): metadataBase + root OpenGraph/Twitter/canonical"
```

---

### Task 7: Per-ticker `generateMetadata` + ticker `<h1>`/`<h2>` retag

**Files:**
- Modify: `frontend/src/app/ticker/[symbol]/page.tsx`
- Modify: `frontend/src/components/ticker/TickerView.tsx` (retag a heading only if the page-level `<h1>` must live there — prefer adding `<h1>` in `page.tsx`)

**Interfaces:**
- Consumes: `fetchTickerReport` from `@/lib/ticker-backend`; `tickerTitle`, `tickerDescription`, `tickerPath` from `@/lib/seo`.
- Produces: unique metadata per ticker; a single `<h1>` on the ticker page.

- [ ] **Step 1: Add `generateMetadata` to the ticker page**

At the top of `frontend/src/app/ticker/[symbol]/page.tsx`, after imports, add:

```tsx
import type { Metadata } from "next";

import { tickerTitle, tickerDescription, tickerPath } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const report = await fetchTickerReport(symbol);
  if (!report) {
    // Page will notFound(); don't index it.
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const title = tickerTitle(report.ticker, report.facts);
  const description = tickerDescription(report.ticker, report.facts);
  const path = tickerPath(report.ticker);
  return {
    title: { absolute: title }, // already ends with "| RiskPilot AI"
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}
```

(`fetchTickerReport` is already imported in this file.)

- [ ] **Step 2: Add a single `<h1>` to the ticker page body**

In the same file's returned JSX, the header currently renders the brand link + a caption. Add a visually-appropriate `<h1>` for the page's real subject. If `TickerView` already renders the ticker prominently, retag THAT element to `<h1>` instead of adding a second one — there must be exactly one `<h1>`. Concretely, in `page.tsx` after fetching `report`, pass a heading into the header, e.g.:

```tsx
<header className={`${styles.masthead} stage stage-1`}>
  <Link href="/" className={styles.brand} style={{ textDecoration: "none" }}>
    RiskPilot<span className={styles.brandAccent}>AI</span>
  </Link>
  <h1 className="caption" style={{ margin: 0, fontSize: "inherit", fontWeight: "inherit" }}>
    {report.ticker} risk read · {report.facts.sector}
  </h1>
</header>
```

The inline style keeps it visually identical to the prior caption — semantics change, pixels do not. If `TickerView` already shows an `<h1>`-worthy ticker title, retag there and skip this; ensure exactly one `<h1>`.

- [ ] **Step 3: Verify build + no double `<h1>`**

Run: `cd "$REPO/frontend" && npm run build 2>&1 | tail -3`
Expected: build succeeds.
Then start the built app and check: `cd "$REPO/frontend" && (npm run start &) && sleep 4 && curl -s localhost:3000/ticker/nvda | grep -o "<h1[^>]*>" | wc -l && curl -s localhost:3000/ticker/nvda | grep -o "<title>[^<]*</title>"; kill %1 2>/dev/null`
Expected: exactly `1` h1; `<title>` contains `NVDA Risk Score 80/100 — Technology`.

- [ ] **Step 4: Commit**

```bash
git -C "$REPO" add "frontend/src/app/ticker/[symbol]/page.tsx" frontend/src/components/ticker/TickerView.tsx
git -C "$REPO" commit -m "feat(seo): per-ticker generateMetadata + semantic h1"
```

---

### Task 8: Home `<h1>` + crawlable ticker link list

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/page.module.css` (styles for the ticker link list, if needed)

**Interfaces:**
- Consumes: `fetchTickerUniverse()` (already called in `page.tsx`); `tickerPath` from `@/lib/seo`.
- Produces: one `<h1>` on home; 11 server-rendered `<a href="/ticker/...">` links.

- [ ] **Step 1: Add a single `<h1>` to the home masthead**

In `page.tsx`'s `Masthead()`, retag the brand or add a page `<h1>`. The brand is the site identity; the page's real subject is the risk X-Ray. Add a visually-neutral `<h1>` (screen-reader + crawler heading) without changing layout:

```tsx
<h1 className={styles.brand} style={{ margin: 0 }}>
  RiskPilot<span className={styles.brandAccent}>AI</span>
</h1>
```

Replace the existing brand `<div>` in `Masthead` with this `<h1>` (keep the same className so styling is identical). Exactly one `<h1>` on the page.

- [ ] **Step 2: Add the crawlable ticker list**

After the `<Dashboard>` in `Home()`'s returned JSX, add a server-rendered nav listing every ticker (the `universe` is already fetched):

```tsx
<nav aria-label="Browse the risk universe" className={styles.tickerNav}>
  <span className="caption">Browse all instruments:</span>
  <ul className={styles.tickerNavList}>
    {universe.map((o) => (
      <li key={o.ticker}>
        <a href={tickerPath(o.ticker)}>
          <span className="num">{o.ticker}</span> · {o.sector}
        </a>
      </li>
    ))}
  </ul>
</nav>
```

Add `import { tickerPath } from "@/lib/seo";` to the file. Add minimal styles to `page.module.css`:

```css
.tickerNav { margin-top: var(--space-4); }
.tickerNavList { display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; padding: 0; margin: var(--space-2) 0 0; }
.tickerNavList a { text-decoration: none; }
```

- [ ] **Step 3: Verify build + 11 links + one h1**

Run: `cd "$REPO/frontend" && npm run build 2>&1 | tail -3`
Expected: build succeeds.
Then: `cd "$REPO/frontend" && (npm run start &) && sleep 4 && echo "h1 count:" && curl -s localhost:3000 | grep -o "<h1" | wc -l && echo "ticker links:" && curl -s localhost:3000 | grep -o 'href="/ticker/[a-z]*"' | sort -u | wc -l; kill %1 2>/dev/null`
Expected: h1 count `1`; ticker links `11`.

- [ ] **Step 4: Commit**

```bash
git -C "$REPO" add frontend/src/app/page.tsx frontend/src/app/page.module.css
git -C "$REPO" commit -m "feat(seo): home h1 + crawlable ticker link list"
```

---

### Task 9: Update e2e to assert `<h1>` presence; full verification

**Files:**
- Modify: `frontend/e2e/redesign.spec.ts`

**Interfaces:**
- Consumes: the running app.
- Produces: a green visual + presence suite that now also guards the `<h1>`.

- [ ] **Step 1: Add an `<h1>` assertion to the landing test**

In `e2e/redesign.spec.ts`, inside the `"landing renders verdict headline + theme toggle"` test, add:

```ts
await expect(page.locator("h1")).toHaveCount(1);
await expect(page.locator("h1")).toBeVisible();
```

- [ ] **Step 2: Run the full e2e suite**

Run: `cd "$REPO/frontend" && npm run e2e`
Expected: all 7 tests pass (visual screenshots + the new h1 assertion). Screenshots should look identical to before — headings are retags.

- [ ] **Step 3: Run unit + build as the final gate**

Run: `cd "$REPO/frontend" && npm run test && npm run build`
Expected: vitest all green (seo + sitemap-entries + prior suites); build succeeds and its route list includes `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `icon`, `opengraph-image`, `ticker/[symbol]/opengraph-image`.

- [ ] **Step 4: Curl-verify the SEO surfaces on the built app**

Run:
```bash
cd "$REPO/frontend" && (npm run start &) && sleep 4
for p in /robots.txt /sitemap.xml /manifest.webmanifest /icon /opengraph-image; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code} %{content_type}' localhost:3000$p)"
done
echo "sitemap ticker count:" && curl -s localhost:3000/sitemap.xml | grep -o "/ticker/" | wc -l
kill %1 2>/dev/null
```
Expected: each path 200 with sane content-type; sitemap contains 11 `/ticker/` occurrences.

- [ ] **Step 5: Commit**

```bash
git -C "$REPO" add frontend/e2e/redesign.spec.ts
git -C "$REPO" commit -m "test(seo): assert single visible h1 on landing"
```

---

## Post-plan: gated deploy (NOT a code task)

After all tasks merge to `main`, phase 3 needs a production deploy to take effect. Two gated actions requiring explicit user go:
1. `vercel --prod` from `frontend/` (same as phase 1 — CLI deploy).
2. **Vercel alias change** so `riskpilot-coach.vercel.app` points at the current deploy (so canonical/OG URLs resolve to the branded domain). This mutates persistent project config — surface and get explicit approval before running.

Then verify live: `curl https://riskpilot-coach.vercel.app/sitemap.xml` lists 11 tickers; a ticker page's view-source shows unique metadata; OG debugger renders the card.

## Self-Review

**Spec coverage:** A-files → Tasks 2 (sitemap), 3 (robots+manifest), 4 (icon), 5 (OG), 6 (metadataBase). B → Tasks 7 (per-ticker meta + ticker h1), 8 (home h1 + crawlable links). `lib/seo.ts` shared source → Task 1. Verification → Task 9. force-dynamic untouched (Global Constraints). Canonical alias gated (post-plan). ✓

**Placeholder scan:** every code step has complete code; test steps have real assertions; no TBD. The one conditional ("retag in TickerView if it already has an h1-worthy title") names the exact invariant (exactly one `<h1>`) and how to verify it (curl grep count). ✓

**Type consistency:** `TickerFacts` fields match `types.ts` exactly (risk_score, risk_band, volatility_annualized_pct, max_drawdown_pct, beta, sector). `tickerTitle`/`tickerDescription`/`tickerPath`/`CANONICAL_ORIGIN` signatures defined in Task 1 and consumed unchanged in Tasks 2, 5, 7, 8. `MetadataRoute.Sitemap`/`Robots`/`Manifest` and `Metadata` used consistently. ✓

**Executor note:** set `REPO="/Users/khanhle/Desktop/Desktop - Khanh’s MacBook Pro/💻 Dev-Projects/RiskPilot AI"`. Subagents lose cwd on this emoji path — run inline (see `.superpowers/sdd/progress.md` note). `npm run test -- <name>` filters vitest by file substring.
