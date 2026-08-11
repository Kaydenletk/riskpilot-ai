import { test, expect } from "@playwright/test";

// The builder flow: add via typeahead, weights auto-balance, run → report or
// offline panel. Route-stubbed where determinism matters (no Python backend
// required in CI).

async function addHolding(page: import("@playwright/test").Page, ticker: string) {
  const input = page.getByRole("combobox", { name: /add a holding/i });
  await input.fill(ticker);
  await page.getByRole("option", { name: new RegExp(`^${ticker}`) }).click();
}

test("builder adds holdings and auto-balances to 100", async ({ page }) => {
  await page.goto("/analyze");
  await addHolding(page, "NVDA");
  await addHolding(page, "KO");
  await addHolding(page, "JNJ");
  await expect(page.getByText(/^Total 100%$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Run the X-Ray" })).toBeEnabled();
});

test("run button disabled below 3 holdings with reason", async ({ page }) => {
  await page.goto("/analyze");
  await addHolding(page, "NVDA");
  await expect(page.getByRole("button", { name: "Run the X-Ray" })).toBeDisabled();
  await expect(page.getByText(/add at least 3 holdings/i)).toBeVisible();
});

test("engine down shows offline panel with retry", async ({ page }) => {
  await page.route("**/api/report", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "engine_unavailable", message: "down" }),
    }),
  );
  await page.goto("/analyze?p=NVDA:40,KO:30,JNJ:30");
  await page.getByRole("button", { name: "Run the X-Ray" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /isn't reachable/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("portfolio URL cold-load restores rows", async ({ page }) => {
  await page.goto("/analyze?p=NVDA:40,KO:30,JNJ:30");
  await expect(page.getByText(/^Total 100%$/)).toBeVisible();
  await expect(page.getByLabel("NVDA weight percent")).toHaveValue("40");
});

test("unknown tickers get a remove-and-continue path", async ({ page }) => {
  await page.route("**/api/report", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        error: "unknown_tickers",
        symbols: ["KO"],
        message: "Not in the demo universe: KO.",
      }),
    }),
  );
  await page.goto("/analyze?p=NVDA:40,KO:30,JNJ:30");
  await page.getByRole("button", { name: "Run the X-Ray" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /demo universe/i })).toBeVisible();
  await page.getByRole("button", { name: /Remove KO and continue/ }).click();
  // KO row gone, remaining rebalanced to 100
  await expect(page.getByLabel("KO weight percent")).toHaveCount(0);
  await expect(page.getByText(/^Total 100%$/)).toBeVisible();
});
