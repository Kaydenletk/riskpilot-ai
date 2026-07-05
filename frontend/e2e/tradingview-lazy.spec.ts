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
  await expect.poll(() => tvRequests.length, { timeout: 5000 }).toBeGreaterThan(0);
});
