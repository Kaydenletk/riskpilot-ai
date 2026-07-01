import { test, expect } from "@playwright/test";

test("parse errors show before any scoring", async ({ page }) => {
  await page.goto("/analyze");
  await page.getByLabel("Holdings CSV").fill("NVDA,oops,Technology,100");
  await page.getByRole("button", { name: "Analyze portfolio" }).click();
  // Filter out the Next.js route announcer (also role="alert") by requiring content.
  await expect(page.getByRole("alert").filter({ hasText: /shares/i })).toContainText(/shares/i);
});

test("valid sample renders dashboard or the offline panel", async ({ page }) => {
  await page.goto("/analyze");
  await page.getByRole("button", { name: "load the sample" }).click();
  await page.getByRole("button", { name: "Analyze portfolio" }).click();
  // Without the engine the offline panel appears; with it, the Coach/Analyst toggle.
  await expect(
    page.getByText(/engine not connected/i).or(page.getByRole("tab", { name: /Coach/ })),
  ).toBeVisible();
});
