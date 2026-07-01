import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/analyze", "/compare?t=NVDA,AMD,MSFT,AAPL"];
const WIDTHS = [320, 768, 1440];
const THEMES = ["light", "dark"] as const;

for (const theme of THEMES) {
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      test(`snapshot ${route} @ ${width} ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => {
          try { localStorage.setItem("rp-theme", t); } catch {}
        }, theme);
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        // settle the gauge sweep + entrance animations
        await page.waitForTimeout(1100);
        await expect(page).toHaveScreenshot(
          `${route.replace(/[/?=,&]/g, "_")}-${width}-${theme}.png`,
          { fullPage: true, maxDiffPixelRatio: 0.02 },
        );
      });
    }
  }
}
