import { expect, test } from "@playwright/test";

const widths = [320, 768, 1440];

test("research workspace renders headline + theme toggle", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /switch to (dark|light) theme/i }),
  ).toBeVisible();
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

  // The new workspace reveals evidence and the editor directly, even with
  // reduced motion. No scroll-triggered animation may hide the task.
  await page
    .getByRole("button", { name: "Explore evidence: How NVIDIA makes money" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Source details" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await expect(
    page.getByLabel("How does this business make money?"),
  ).toBeVisible();
});

for (const w of widths) {
  test(`light @ ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({
      path: `e2e/__shots__/light-${w}.png`,
      fullPage: true,
    });
  });

  test(`dark @ ${w}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("rp-theme", "dark"));
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({
      path: `e2e/__shots__/dark-${w}.png`,
      fullPage: true,
    });
  });
}
