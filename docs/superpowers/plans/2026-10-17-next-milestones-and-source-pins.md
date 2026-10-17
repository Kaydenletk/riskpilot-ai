# RiskPilot Source Pins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a beginner inspect the reported figures and exact derivation behind each headline metric without losing the dependency-to-memo workflow.

**Architecture:** Add a pure metric-provenance model over the existing validated catalogue and a reusable native source dialog. Keep metric-source state inside CompanyVisuals, with focus restoration to the opening control. This increment highlights the local transcription of reported figures; original-document anchors/excerpts require a separate ingestion and verification increment.

**Tech Stack:** Existing Next.js, React, TypeScript, CSS Modules, Vitest, Testing Library and Playwright. No new package, provider call, account, database or model.

---

## Scope and current state

Plan prepared 2026-10-17. The user subsequently selected Subagent-Driven execution in this session; increment 1a is now implemented and verified. Other roadmap increments remain pending. Existing pending changes belong to ongoing work and must be preserved. Read `docs/superpowers/plans/2026-10-17-interactive-research-learning.md` and `learning/02-risk-memo/README.md` before execution. The revenue dependency drawer, personal classifications, captured-source memo, Markdown export and snapshot preservation are already implemented.

Native TaskList/TaskCreate and AskUserQuestion are not exposed in this runtime. Persist tasks beside this plan and use the available user-input surface for execution preference. Do not claim native tasks were created. Choose/prepare an isolated execution workspace only after preserving the current uncommitted implementation; do not start from a clean checkout that lacks these files. Commit commands below are execution checkpoints, not authorization to stage unrelated work. Run them only after the required existing product files are present in a separately reviewed branch baseline. Until that baseline exists, use task-scoped diff review checkpoints and retain uncommitted changes; do not sweep the dirty workspace into a baseline commit.

## Ordered product roadmap — separate implementation increments

| Order | Deliverable | User result | Technical learning | Completion evidence |
|---|---|---|---|---|
| 1a — detailed below | Metric source pins | Click sales, growth, profit-per-$100 or a revenue share and see inputs, units, fiscal year, calculation and report link | Typed data lineage, pure functions, accessible modal, separation of reported/derived values | Every supported number resolves to matching company/year inputs; existing dependency and memo flows pass |
| 1b | Original-document section navigation and risk-claim pins | Reach a verified report section/excerpt from a claim | Document ingestion, stable locators, source snapshots, stale-locator handling | Matched excerpts/locators checked against original files; missing matches shown explicitly; no promise of cross-browser external highlighting |
| 2 | Compare bottlenecks | Compare selected disclosure categories across NVIDIA, Microsoft and Apple | Reviewed taxonomy, normalized schema, missing-data states | Missing coverage is displayed as unknown; comparison never invents equivalent severity or probabilities |
| 3 | Cmd/Ctrl+K navigation | Jump to company, disclosure, saved source or memo using keyboard | Searchable navigation model, focus/shortcut behavior | Keyboard, screen reader labels, Escape and return focus tested; typing in an editor does not accidentally trigger actions |
| 4 | Activation measurement and usability checks | Check whether the new flow helps users reach a meaningful memo | Event schema, opt-in instrumentation, funnel definitions, experiment design | Events contain no notebook prose or raw questions; observe user explanations separately from click counts; no claimed retention gain without evidence |
| 5 | Case Study Mode | Optional annotations explain why features exist and what was measured | Product narrative, feature configuration, technical evidence | Default investor flow stays uncluttered; hypotheses and measured results are distinguished |
| 6 | Accounts, PostgreSQL and notebook sync | Keep research across devices with access isolation | SQL, migrations, transactions, authorization and optimistic concurrency | Two-user isolation tests; duplicate-save and concurrent-edit scenarios; export/import and rollback plan protect existing local data |
| 7 — evidence-gated | Background source refresh and evaluated hybrid retrieval | New source versions become available reliably | Job state, retries, idempotency, freshness and RAG evaluation | Worker restart/duplicate job tests; real lexical-vs-semantic comparison; failed ingestion never replaces the last usable catalogue |

Each row after 1a needs its own scoped design/implementation plan before application edits. IndexedDB/Zustand migration is a measured storage/performance decision, not a mandatory technology checkbox. Public sharing needs explicit privacy/storage design. Temporal/vector-store adoption depends on actual workflow/scale requirements.

## Decisions for increment 1a

- Preserve revenue clicks as dependency triggers. Headline sales/growth/profit become source triggers; revenue share receives a separate, clearly labelled source action. One control has one purpose.
- Store no duplicate financial numbers. Build source pins from `company.financials`, whose amounts are integer USD millions and whose mix reconciles with annual revenue.
- Growth uses the previous fiscal-year revenue as denominator. Profit-per-$100 uses net income / annual revenue; revenue share uses category / annual revenue. Use unrounded inputs, round only the display.
- Label the source rows **transcribed reported figures**, not a rendered original filing. A ratio is an app calculation. The report link preserves the complete original context.
- This increment covers numerical metrics. Existing risk source summaries remain labelled paraphrases; original-prose highlighting is 1b, not silently marked complete here.
- Keep the pure model independent of React and server calls. Keep modal state local so ResearchWorkspace does not gain another coordination responsibility.

## File structure

| File | Responsibility |
|---|---|
| `frontend/src/lib/research/metric-source.ts` | Typed targets, source rows and deterministic metric derivation |
| `frontend/src/lib/research/metric-source.test.ts` | Numerator/denominator/year/company and missing-data checks |
| `frontend/src/components/research/MetricSourceDialog.tsx` | Native dialog showing reported inputs, derivation, provenance and original link |
| `frontend/src/components/research/MetricSourceDialog.test.tsx` | Visible reported/derived distinction, safe link and close/cancel callback |
| `frontend/src/components/research/CompanyVisuals.tsx` | Source trigger integration and focus restoration; preserve dependency callbacks |
| `frontend/src/components/research/visuals.module.css` | Metric-value button styling using existing theme tokens |
| `frontend/src/components/research/decision.module.css` | Reuse existing drawer styles; no unrelated restyling |
| `frontend/e2e/metric-source.spec.ts` | Real browser metric → source → close and preserved dependency workflow |
| `learning/03-metric-source/README.md` | Vietnamese walkthrough tied to the implemented function/tests |

### Task 1: Typed metric lineage with tests

**Goal:** Produce the reported input rows and derivation for each supported metric.

**Files:** Create `frontend/src/lib/research/metric-source.ts`; create `frontend/src/lib/research/metric-source.test.ts`.

**Acceptance Criteria:**
- [x] Sales uses the latest annual total, growth uses latest/previous years, profit uses net income/annual sales, share uses category/annual sales.
- [x] Unknown category or absent financials returns null.
- [x] The selected company's URL, period and catalogue version accompany each result.
- [x] Negative net income remains negative; reported revenue inputs are not rounded before calculation.

**Verify:** From `frontend/`, `npx vitest run src/lib/research/metric-source.test.ts` → 4 passing tests.

**Steps:**

- [ ] Write the complete failing test file:

```ts
import { expect, test } from "vitest";
import { companies, corpusVersion } from "./corpus";
import { buildMetricSource } from "./metric-source";

const company = companies[0];

test("sales and growth preserve exact reported inputs and denominator", () => {
  const sales = buildMetricSource(company, { kind: "sales" })!;
  expect(sales.rows.map(row => row.amount)).toEqual([130497]);
  expect(sales.basis).toBe("reported");
  const growth = buildMetricSource(company, { kind: "growth" })!;
  expect(growth.rows.map(row => row.amount)).toEqual([60922, 130497]);
  expect(growth.rows.map(row => row.year)).toEqual([2024, 2025]);
  expect(growth.value).toBeCloseTo((130497 - 60922) / 60922 * 100, 10);
  expect(growth.basis).toBe("derived");
});

test("profit and share use matching annual revenue and retain losses", () => {
  const profit = buildMetricSource(company, { kind: "profit" })!;
  expect(profit.rows.map(row => row.amount)).toEqual([72880, 130497]);
  expect(profit.value).toBeCloseTo(72880 / 130497 * 100, 10);
  const share = buildMetricSource(company, { kind: "share", categoryId: "data-center" })!;
  expect(share.rows.map(row => row.amount)).toEqual([115186, 130497]);
  expect(share.value).toBeCloseTo(115186 / 130497 * 100, 10);
  const loss = { ...company, financials: { ...company.financials!, netIncome: -1000 } };
  expect(buildMetricSource(loss, { kind: "profit" })!.value).toBeLessThan(0);
});

test("provenance is scoped to the selected company", () => {
  for (const selected of companies) {
    const pin = buildMetricSource(selected, { kind: "sales" })!;
    expect(pin.symbol).toBe(selected.symbol);
    expect(pin.source.url).toBe(selected.evidence[0].url);
    expect(pin.source.period).toBe(selected.evidence[0].period);
    expect(pin.corpusVersion).toBe(corpusVersion);
    expect(pin.rows[0].amount).toBe(selected.financials!.revenueHistory.at(-1)!.amount);
  }
});

test("missing categories and financials are explicit", () => {
  expect(buildMetricSource(company, { kind: "share", categoryId: "unknown" })).toBeNull();
  expect(buildMetricSource({ ...company, financials: null }, { kind: "sales" })).toBeNull();
});
```

- [ ] Run the verify command; expect failure resolving `./metric-source` before implementation.
- [ ] Create the complete model:

```ts
import { corpusVersion, type ResearchCompany } from "./corpus";

export type MetricTarget =
  | { kind: "sales" }
  | { kind: "growth" }
  | { kind: "profit" }
  | { kind: "share"; categoryId: string };

export interface MetricSourceRow {
  id: string;
  label: string;
  year: number;
  amount: number;
}

export interface MetricSource {
  symbol: string;
  title: string;
  basis: "reported" | "derived";
  value: number;
  display: string;
  formula: string;
  rows: MetricSourceRow[];
  corpusVersion: string;
  source: { url: string; report: string; period: string; published: string; section: string };
}

export function buildMetricSource(company: ResearchCompany, target: MetricTarget): MetricSource | null {
  const facts = company.financials;
  const report = company.evidence[0];
  if (!facts || !report || facts.revenueHistory.length < 2) return null;
  const latest = facts.revenueHistory.at(-1)!;
  const previous = facts.revenueHistory.at(-2)!;
  const revenueRow = (year: number, amount: number): MetricSourceRow => ({
    id: `revenue-${year}`, label: "Annual revenue", year, amount,
  });
  let title: string;
  let basis: MetricSource["basis"] = "derived";
  let rows: MetricSourceRow[];
  let value: number;
  let display: string;
  let formula: string;
  const number = (amount: number) => amount.toLocaleString("en-US");

  switch (target.kind) {
    case "sales":
      title = "Annual sales";
      basis = "reported";
      rows = [revenueRow(latest.year, latest.amount)];
      value = latest.amount;
      display = `$${(value / 1000).toFixed(1)}B`;
      formula = `${number(value)} million USD ÷ 1,000 = ${(value / 1000).toFixed(1)} billion USD (rounded)`;
      break;
    case "growth":
      title = "Sales growth";
      rows = [revenueRow(previous.year, previous.amount), revenueRow(latest.year, latest.amount)];
      value = (latest.amount - previous.amount) / previous.amount * 100;
      display = `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
      formula = `(${number(latest.amount)} − ${number(previous.amount)}) ÷ ${number(previous.amount)} × 100`;
      break;
    case "profit":
      title = "Profit per $100 of sales";
      rows = [{ id: `net-income-${latest.year}`, label: "Net income", year: latest.year, amount: facts.netIncome }, revenueRow(latest.year, latest.amount)];
      value = facts.netIncome / latest.amount * 100;
      display = `$${Math.abs(value).toFixed(1)} ${value < 0 ? "lost" : "kept"}`;
      formula = `${number(facts.netIncome)} ÷ ${number(latest.amount)} × 100`;
      break;
    case "share": {
      const category = facts.revenueMix.find(row => row.id === target.categoryId);
      if (!category) return null;
      title = `${category.label} revenue share`;
      rows = [{ id: `category-${category.id}-${latest.year}`, label: category.label, year: latest.year, amount: category.amount }, revenueRow(latest.year, latest.amount)];
      value = category.amount / latest.amount * 100;
      display = `${value.toFixed(1)}%`;
      formula = `${number(category.amount)} ÷ ${number(latest.amount)} × 100`;
      break;
    }
  }
  return {
    symbol: company.symbol, title, basis, rows, value, display, formula, corpusVersion,
    source: { url: report.url, report: company.source, period: report.period, published: report.filed, section: facts.sourceSection },
  };
}
```

- [ ] Rerun the verify command; require all 4 tests pass. Inspect each denominator against the existing catalogue.
- [ ] Execution checkpoint after a reviewed baseline exists; otherwise record task-scoped diff review without creating a commit:

```bash
git add frontend/src/lib/research/metric-source.ts frontend/src/lib/research/metric-source.test.ts
git diff --cached --stat
git diff --cached
git commit -m "feat: model metric source lineage"
```

Verify the staged diff contains only this task before committing; existing staged user changes are a reason to use the non-commit checkpoint instead.

### Task 2: Reusable source inspector with tests

**Goal:** Show exact reported rows and the app derivation in an accessible dialog without claiming to render the original filing.

**Files:** Create `frontend/src/components/research/MetricSourceDialog.tsx`; create `frontend/src/components/research/MetricSourceDialog.test.tsx`; reuse `frontend/src/components/research/decision.module.css` without editing it.

**Dependencies:** Task 1.

**Acceptance Criteria:**
- [x] The dialog labels reported vs derived, units, fiscal year, report and catalogue version.
- [x] Relevant rows are highlighted in the local transcription and explained in text.
- [x] Original report link uses the catalogue URL with a safe new-tab relationship.
- [x] Close and cancel call the parent; native focus behavior is checked in Task 3's browser tests.

**Verify:** From `frontend/`, `npx vitest run src/components/research/MetricSourceDialog.test.tsx` → 2 passing tests.

**Steps:**

- [ ] Write the complete failing tests:

```tsx
import { afterEach, beforeAll, afterAll, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { companies } from "@/lib/research/corpus";
import { buildMetricSource } from "@/lib/research/metric-source";
import { MetricSourceDialog } from "./MetricSourceDialog";

const showDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterEach(cleanup);
afterAll(() => {
  for (const [name, descriptor] of [["showModal", showDescriptor], ["close", closeDescriptor]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

test("explains derived values from exact inputs and discloses transcription", () => {
  const pin = buildMetricSource(companies[0], { kind: "profit" })!;
  render(<MetricSourceDialog pin={pin} onClose={vi.fn()} />);
  expect(screen.getByRole("dialog")).toHaveAccessibleName("Profit per $100 of sales");
  expect(screen.getByText("App calculation from reported inputs")).toBeVisible();
  expect(screen.getByText("72,880")).toBeVisible();
  expect(screen.getByText("130,497")).toBeVisible();
  expect(screen.getByText(/Transcribed reported figures/)).toBeVisible();
  expect(screen.getByRole("link", { name: "Open original annual report" })).toHaveAttribute("href", pin.source.url);
});

test("both Close and Escape cancel delegate to the parent", () => {
  const close = vi.fn();
  render(<MetricSourceDialog pin={buildMetricSource(companies[0], { kind: "sales" })!} onClose={close} />);
  fireEvent.click(screen.getByRole("button", { name: "Close metric source" }));
  expect(close).toHaveBeenCalledTimes(1);
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: false, cancelable: true }));
  expect(close).toHaveBeenCalledTimes(2);
});
```

- [ ] Run the verify command; expect module-not-found failure before the component exists.
- [ ] Create the complete component:

```tsx
import { useEffect, useId, useRef } from "react";
import type { MetricSource } from "@/lib/research/metric-source";
import { Icon } from "./Icon";
import styles from "./decision.module.css";

export function MetricSourceDialog({ pin, onClose }: { pin: MetricSource; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className={styles.drawer} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.drawerContent}>
      <header className={styles.drawerHeader}>
        <span className={styles.eyebrow}>METRIC SOURCE · {pin.symbol}</span>
        <button aria-label="Close metric source" onClick={onClose}><Icon name="close" />Close</button>
      </header>
      <h2 id={titleId}>{pin.title}</h2>
      <div className={styles.revenuePill}><strong>{pin.display}</strong></div>
      <p>{pin.basis === "derived" ? "App calculation from reported inputs" : "Reported annual figure; display converted to billions"}</p>
      <section className={styles.drawerSection}>
        <h3>Inputs used for this number</h3>
        <p className={styles.muted}>Transcribed reported figures, not the original document layout. Highlighted rows are the inputs used above. Amounts are in millions of US dollars.</p>
        <table style={{ width: "100%", marginTop: 16 }}>
          <caption>Reported inputs</caption>
          <thead><tr><th scope="col">Reported item</th><th scope="col">Fiscal year</th><th scope="col">USD millions</th></tr></thead>
          <tbody>{pin.rows.map(row => <tr key={row.id} style={{ background: "var(--rp-soft)" }}>
            <th scope="row">{row.label}</th><td>FY{row.year}</td><td>{row.amount.toLocaleString("en-US")}</td>
          </tr>)}</tbody>
        </table>
      </section>
      <section className={styles.drawerSection}>
        <h3>{pin.basis === "derived" ? "How the app calculates it" : "How the app formats it"}</h3>
        <p style={{ overflowWrap: "anywhere" }}>{pin.formula}</p>
        <p className={styles.muted}>Original figures are used before rounding. Profit per $100 is company net income relative to sales, not investor return.</p>
      </section>
      <section className={styles.drawerSection}>
        <h3>{pin.source.report}</h3>
        <p>{pin.source.period} · published {pin.source.published}</p>
        <p className={styles.muted}>{pin.source.section}</p>
        <a href={pin.source.url} target="_blank" rel="noopener noreferrer">Open original annual report</a>
        <p className={styles.footnote}>Catalogue version: {pin.corpusVersion}</p>
      </section>
    </div>
  </dialog>;
}
```

- [ ] Rerun both Task 1 and Task 2 tests. The jsdom stubs check rendering/callbacks only; do not treat them as proof of native focus trapping.
- [ ] Execution checkpoint after a reviewed baseline exists; otherwise retain the diff without committing:

```bash
git add frontend/src/components/research/MetricSourceDialog.tsx frontend/src/components/research/MetricSourceDialog.test.tsx
git diff --cached --stat
git diff --cached
git commit -m "feat: add metric source inspector"
```

Proceed with the commit only if the staged diff contains this task alone.

### Task 3: Integrate source triggers and verify the real workflow

**Goal:** Make headline metrics inspectable while preserving revenue dependency navigation and risk memo behavior.

**Files:** Modify `frontend/src/components/research/CompanyVisuals.tsx`; modify `frontend/src/components/research/visuals.module.css`; create `frontend/e2e/metric-source.spec.ts`; create `learning/03-metric-source/README.md`.

**Dependencies:** Tasks 1–2.

**Acceptance Criteria:**
- [x] All three companies expose sales/growth/profit source controls and a separate revenue-share source action.
- [x] Existing Data Center percentage/bar clicks still open dependencies.
- [x] Escape/Close restore focus to the metric trigger. No horizontal overflow at 375px/1440px.
- [x] Existing memo creation, captured history, company isolation and Markdown download still pass.
- [x] No code or copy claims original-document highlighting is complete.

**Verify:** From `frontend/`, `npx playwright test e2e/metric-source.spec.ts e2e/research.spec.ts e2e/dependency.spec.ts e2e/theme.spec.ts --workers=2` → all selected tests pass; `npm test` and `NEXT_DIST_DIR=.next-verify npm run build` → exit 0.

**Steps:**

- [ ] Write complete browser tests before integration:

```ts
import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`metric source supports exact inputs and focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const profit = page.getByRole("button", { name: "Source for profit per $100", exact: true });
    await profit.click();
    const source = page.getByRole("dialog", { name: "Profit per $100 of sales", exact: true });
    await expect(source.getByRole("table", { name: "Reported inputs" })).toContainText("72,880");
    await expect(source).toContainText("130,497");
    await expect(source).toContainText("72,880 ÷ 130,497 × 100");
    expect(await source.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(profit).toBeFocused();
    await page.getByRole("button", { name: "Explore dependencies: Data Center", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Data Center", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
  });
}

test("source pins switch companies without using another company's amounts", async ({ page }) => {
  await page.goto("/");
  for (const [company, amount] of [["NVIDIA NVDA", "130,497"], ["Microsoft MSFT", "281,724"], ["Apple AAPL", "416,161"]]) {
    await page.getByRole("button", { name: company, exact: true }).click();
    await page.getByRole("button", { name: "Source for annual sales", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Annual sales", exact: true })).toContainText(amount);
    await page.getByRole("button", { name: "Close metric source", exact: true }).click();
  }
});
```

- [ ] Run `npx playwright test e2e/metric-source.spec.ts --workers=2`; expect missing source-trigger failures.
- [ ] Add these imports in CompanyVisuals:

```tsx
import { useRef, useState } from "react";
import { buildMetricSource, type MetricSource, type MetricTarget } from "@/lib/research/metric-source";
import { MetricSourceDialog } from "./MetricSourceDialog";
```

Replace the existing `useState` import with the combined React import; do not leave duplicate imports. Inside CompanyVisuals, after `latestSource`, add:

```tsx
const [metricSource, setMetricSource] = useState<MetricSource | null>(null);
const metricOpener = useRef<HTMLElement | null>(null);
function openMetric(target: MetricTarget) {
  metricOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  setMetricSource(buildMetricSource(company, target));
}
function closeMetric() {
  setMetricSource(null);
  requestAnimationFrame(() => metricOpener.current?.focus());
}
```

- [ ] Replace the annual-sales `<strong>` with:

```tsx
<button type="button" className={styles.metricSourceValue} aria-label="Source for annual sales" onClick={() => openMetric({ kind: "sales" })}>
  <strong>{formatBillions(summary.revenue)}</strong><span>View source <Icon name="external" size={12} /></span>
</button>
```

Replace the sales-growth `<strong>` in the metric card, leaving the trend-card headline intact:

```tsx
<button type="button" className={styles.metricSourceValue} aria-label="Source for sales growth" onClick={() => openMetric({ kind: "growth" })}>
  <strong className={summary.growth < 0 ? styles.negative : undefined}>{growth}</strong><span>View calculation <Icon name="external" size={12} /></span>
</button>
```

Replace the profit metric card's `<strong>`:

```tsx
<button type="button" className={styles.metricSourceValue} aria-label="Source for profit per $100" onClick={() => openMetric({ kind: "profit" })}>
  <strong className={summary.profitPer100 < 0 ? styles.negative : undefined}>${Math.abs(summary.profitPer100).toFixed(1)}<small>{summary.profitPer100 < 0 ? "lost" : "kept"}</small></strong>
  <span>View calculation <Icon name="external" size={12} /></span>
</button>
```

After the share-headline container, before the stacked bar, insert:

```tsx
<button type="button" className={styles.metricSourceLink} aria-label={`Source for ${selected.label} revenue share`} onClick={() => openMetric({ kind: "share", categoryId: selected.id })}>
  View share calculation <Icon name="external" size={12} />
</button>
```

Before the final closing section in CompanyVisuals, insert:

```tsx
{metricSource && <MetricSourceDialog pin={metricSource} onClose={closeMetric} />}
```

- [ ] Append complete styles to visuals.module.css:

```css
.metricSourceValue {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--rp-text);
  text-align: left;
  min-width: 0;
}
.metricSourceValue strong {
  display: block;
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 600;
  letter-spacing: -1.6px;
  line-height: 1.1;
  white-space: nowrap;
}
.metricSourceValue strong small {
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0;
  margin-left: 8px;
  color: var(--rp-muted);
}
.metricSourceValue .negative { color: var(--rp-amber); }
.metricSourceValue > span, .metricSourceLink {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--rp-green);
  font-size: 10px;
}
.metricSourceValue > span { margin-top: 8px; }
.metricSourceLink { border: 0; background: transparent; padding: 8px 0 12px; }
@media (max-width: 760px) {
  .metricSourceValue { text-align: right; }
  .metricSourceValue strong { font-size: 30px; letter-spacing: -1px; }
  .metricSourceValue strong small { font-size: 11px; margin-left: 4px; }
}
```

- [ ] Run the Verify commands. Inspect mobile/dark screenshots of the source dialog. Do not change the current notebook key/schema or the dependency drawer to make these tests pass.
- [ ] Write the complete walkthrough at `learning/03-metric-source/README.md`:

```markdown
# Học từ source pinning

Bấm lợi nhuận trên mỗi $100 doanh thu, xem hai dòng Net income và Annual revenue,
rồi đối chiếu phép tính. Đây là số tính từ báo cáo, không phải lợi nhuận của cổ đông.

Luồng code: CompanyVisuals.openMetric → buildMetricSource → MetricSourceDialog.
Hàm buildMetricSource không gọi API và không sửa notebook. Nhờ vậy ta kiểm tra
đúng tử số, mẫu số và công ty bằng unit test trước khi nối giao diện.

Dữ liệu bảng là bản chép có cấu trúc từ báo cáo, không phải toàn bộ tài liệu gốc.
Nút Open original annual report giữ đường kiểm tra nguồn. Highlight tài liệu gốc
và locator theo đoạn văn thuộc increment tiếp theo.

Bài thử: trước khi mở Sales growth, dự đoán mẫu số là doanh thu năm nào.
Đọc metric-source.test.ts để tìm assertion kiểm tra mẫu số đó.

Tradeoff: các source pin dùng lại số liệu của catalogue nên không tạo thêm bản
số liệu cần đồng bộ. Tuy nhiên việc chép từ báo cáo vẫn cần được đối chiếu;
unit test không chứng minh thao tác chép ban đầu đúng với tài liệu bên ngoài.
```

- [ ] Execution checkpoint after a reviewed baseline exists; otherwise retain task-scoped changes without committing:

```bash
git add frontend/src/components/research/CompanyVisuals.tsx frontend/src/components/research/visuals.module.css frontend/e2e/metric-source.spec.ts learning/03-metric-source/README.md
git diff --cached --stat
git diff --cached
git commit -m "feat: connect metrics to source inspector"
```

Proceed only with this task staged. Update this plan's tasks JSON only after commands and acceptance criteria pass.

## Self-review checklist

- [x] Scope coverage: this plan implements numerical source pins (roadmap 1a); original-document/risk-prose pins, comparison, navigation, measurement, case-study mode and storage have separate increment boundaries.
- [x] Types: MetricTarget, MetricSourceRow and MetricSource are defined in Task 1 before use. `kind`, `categoryId`, `rows`, `amount`, `basis` and `source` signatures match throughout.
- [x] No application implementation is performed in this planning turn; all implementation steps are pending.
- [x] Tests have explicit inputs, expected values and commands. Native browser focus is not inferred from jsdom stubs.
- [x] No source-truth, retention, enterprise-compliance or performance claim is inferred from test counts.

## Execution handoff

All tasks remain pending. User requested a plan, so stop after saving the documents and obtaining an execution preference. Do not modify application files or create commits as part of this planning turn. Existing main product code is uncommitted; do not silently lose it by executing from a clean worktree.

## Increment 1a execution record

- Completed all three tasks using fresh implementation agents and sequential specification/quality reviews. Final whole-feature review found no critical or important issues.
- Used `codex/metric-source-pins` at `.claude/worktrees/metric-source-pins`, preserving a snapshot of the existing uncommitted product. Copied only the eight reviewed source/test/lesson files back after checking original destination hashes; no conflicts, staging, baseline commit or unrelated edits.
- Original workspace verification: **123 unit/API tests**, **25 selected browser tests**, and **production build passed**. Six homepage visual baselines were updated at 320/768/1440 in light/dark themes; mobile source-dialog screenshots were inspected. `git diff --check` passed.
- Browser regressions include correct company/year/denominators, selected-category sources, accessible numeric descriptions, Close/Escape focus, pointer clicks that do not move focus, narrow dialogs, existing dependency-to-memo flow, history and export.
- Review corrected omitted report-name rendering and numeric accessibility. Source controls retain stable action names with descriptions referencing the visible values; opener capture uses `event.currentTarget` with a locally captured connected element on close.
- Temporary isolated-test origin mismatch (`127.0.0.1` versus Next request origin) was resolved by using `localhost:3200` in the temporary config. Production origin validation was unchanged.
- Existing user workspace remains uncommitted; isolated branch/worktree retained. This completes numerical source pins only. Original-document locators/highlighting (1b), comparison, navigation, measurement, accounts/sync and evaluated retrieval remain pending.

Learning walkthrough: `learning/03-metric-source/README.md`.
