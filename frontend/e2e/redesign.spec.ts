import { expect, test } from "@playwright/test";

const widths = [320, 768, 1440];

test("landing renders verdict headline + theme toggle", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /switch to (dark|light) theme/i })).toBeVisible();
  // the deterministic verdict sentence contains "risk"
  await expect(page.getByText(/risk/i).first()).toBeVisible();
  // exactly one semantic <h1> for SEO (retag, not a visual change)
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toBeVisible();
});

test("reduced motion still shows all content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Reveal-wrapped sections (how-it-works' step panels) start at opacity:0
  // and only flip visible once their IntersectionObserver fires on scroll.
  // Under prefers-reduced-motion the global kill-switch zeroes the
  // opacity/transform transition duration (see globals.css), so once the
  // observer fires the content should be immediately (not gradually)
  // visible — never permanently stuck hidden. Scroll the section into view
  // and confirm both the heading and the first Reveal-wrapped step panel
  // actually reach full opacity.
  const heading = page.getByRole("heading", { name: "The AI never does the math." });
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toBeVisible();

  const firstStepReveal = page.locator("#how-it-works li").first().locator("> div").first();
  await expect(firstStepReveal.getByRole("heading", { name: "Python computes" })).toBeVisible();
  await expect
    .poll(async () => firstStepReveal.evaluate((el) => getComputedStyle(el).opacity))
    .toBe("1");
});

for (const w of widths) {
  test(`light @ ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: `e2e/__shots__/light-${w}.png`, fullPage: true });
  });

  test(`dark @ ${w}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("rp-theme", "dark"));
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({ path: `e2e/__shots__/dark-${w}.png`, fullPage: true });
  });
}
