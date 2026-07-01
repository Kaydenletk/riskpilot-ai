import { expect, test } from "@playwright/test";

const widths = [320, 768, 1440];

test("landing renders verdict headline + theme toggle", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /switch to (dark|light) theme/i })).toBeVisible();
  // the deterministic verdict sentence contains "risk"
  await expect(page.getByText(/risk/i).first()).toBeVisible();
});

for (const w of widths) {
  test(`light @ ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: `e2e/__shots__/light-${w}.png`, fullPage: true });
  });

  test(`dark @ ${w}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("riskpilot-theme", "dark"));
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({ path: `e2e/__shots__/dark-${w}.png`, fullPage: true });
  });
}
