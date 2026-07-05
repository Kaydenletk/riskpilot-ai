import { test, expect } from "@playwright/test";

test("compare page renders one gauge column per recognized ticker", async ({ page }) => {
  await page.goto("/compare?t=NVDA,AMD,MSFT");
  await expect(page.getByText("Comparing 3 of 3 requested")).toBeVisible();
  await expect(page.getByText("Volatility").first()).toBeVisible();
});

test("unknown tickers are dropped", async ({ page }) => {
  await page.goto("/compare?t=NVDA,ZZZZ");
  await expect(page.getByText("Comparing 1 of 2 requested")).toBeVisible();
});
