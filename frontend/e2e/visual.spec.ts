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
        // Reveal-wrapped sections (e.g. how-it-works) only flip visible once
        // their IntersectionObserver fires, which never happens for content
        // below the fold when Playwright's `fullPage: true` captures via
        // captureBeyondViewport — that mode screenshots the full scrollable
        // area WITHOUT ever scrolling it into view, so the IO never triggers
        // and those sections render blank. Sweep the page top-to-bottom in
        // small steps first (so IO has a chance to observe each section),
        // then scroll back to top and let entrance transitions settle.
        await page.evaluate(async () => {
          const step = window.innerHeight / 2;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(1100);
        await expect(page).toHaveScreenshot(
          `${route.replace(/[/?=,&]/g, "_")}-${width}-${theme}.png`,
          { fullPage: true, maxDiffPixelRatio: 0.02 },
        );
      });
    }
  }
}
