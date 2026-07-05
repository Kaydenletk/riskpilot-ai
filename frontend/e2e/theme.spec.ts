import { test, expect } from "@playwright/test";

// Force light OS preference so the OS-aware initial theme is deterministic
// (the pre-paint script reads prefers-color-scheme when there's no stored value).
test.use({ colorScheme: "light" });

test("theme toggle flips and persists data-theme", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /Switch to dark theme/i }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("with OS dark preference and no stored choice, first load is dark", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await ctx.close();
});
