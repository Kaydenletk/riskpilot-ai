import { test, expect } from "@playwright/test";

// What-if simulator on the home sample report. /api/score and /api/report are
// route-stubbed — deterministic, no Python backend needed in CI.

const SCORED_FACTS = {
  risk_score: 61,
  risk_band: "moderate",
  concentration_pct_top3: 62.1,
  volatility_annualized_pct: 24.9,
  max_drawdown_pct: -28.4,
  largest_sector: "Technology",
  largest_sector_pct: 55.0,
  holdings_count: 5,
};

const WHATIF_REPORT = {
  portfolio_name: "Your portfolio",
  as_of: "synthetic illustrative data",
  holdings: [],
  facts: SCORED_FACTS,
  explanation: {
    summary: "Trimming the top position lowers concentration risk meaningfully.",
    top_risk_factors: [],
    review_checklist: [],
    source: "template_fallback",
  },
  disclaimer: "Educational risk coaching, not financial advice.",
};

test("slider change scores the what-if via /api/score", async ({ page }) => {
  await page.route("**/api/score", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, holdings: [], facts: SCORED_FACTS, score_version: "v1" }),
    }),
  );
  await page.goto("/");
  const panel = page.getByRole("region", { name: /what if/i });
  await expect(panel).toBeVisible();
  await panel.locator('input[type="range"]').first().press("ArrowRight");
  await expect(panel.getByText("61", { exact: true })).toBeVisible();
  await expect(panel.getByText(/Concentration/i)).toBeVisible();
});

test("explain-this-version fetches guardrailed prose on demand", async ({ page }) => {
  await page.route("**/api/score", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, holdings: [], facts: SCORED_FACTS, score_version: "v1" }),
    }),
  );
  await page.route("**/api/report", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(WHATIF_REPORT),
        })
      : route.fallback(),
  );
  await page.goto("/");
  const panel = page.getByRole("region", { name: /what if/i });
  await panel.locator('input[type="range"]').first().press("ArrowRight");
  await panel.getByRole("button", { name: /Explain this version/ }).click();
  await expect(panel.getByText(/Explaining your what-if/i)).toBeVisible();
  await expect(panel.getByText(/Trimming the top position/)).toBeVisible();
  // editing again invalidates the prose
  await panel.locator('input[type="range"]').first().press("ArrowRight");
  await expect(panel.getByText(/Explaining your what-if/i)).toHaveCount(0);
});

test("score failure grays the panel, report stays intact", async ({ page }) => {
  await page.route("**/api/score", (route) => route.abort());
  await page.goto("/");
  const panel = page.getByRole("region", { name: /what if/i });
  await panel.locator('input[type="range"]').first().press("ArrowRight");
  await expect(panel.getByRole("alert")).toContainText(/report above is untouched/i);
  await expect(panel.getByRole("button", { name: "Retry" })).toBeVisible();
  // the report above still renders its verdict
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
});
