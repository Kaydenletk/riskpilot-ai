import { expect, test } from "@playwright/test";
for (const width of [375, 1440]) {
  test(`profit source preserves focus and dependencies at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => localStorage.setItem("rp-theme", "dark"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const opener = page.getByRole("button", { name: "Source for profit per $100", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Profit per $100 of sales", exact: true });
    await expect(dialog).toBeVisible();
    const inputs = dialog.getByRole("table", { name: "Reported inputs" });
    await expect(inputs).toContainText("72,880");
    await expect(inputs).toContainText("130,497");
    await expect(dialog.getByText("72,880 ÷ 130,497 × 100", { exact: true })).toBeVisible();
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `/tmp/metric-source-${width}-dark.png`, fullPage: true });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(opener).toBeFocused();
    await page.getByRole("button", { name: "Explore dependencies: Data Center", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Data Center", exact: true })).toBeVisible();
  });
}
test("all companies expose annual inputs and restore Close focus", async ({ page }) => {
  await page.goto("/");
  for (const [company, revenue] of [["NVIDIA NVDA", "130,497"], ["Microsoft MSFT", "281,724"], ["Apple AAPL", "416,161"]]) {
    await page.getByRole("button", { name: company, exact: true }).click();
    const opener = page.getByRole("button", { name: "Source for annual sales", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Annual sales", exact: true });
    await expect(dialog.getByRole("table", { name: "Reported inputs" })).toContainText(revenue);
    await dialog.getByRole("button", { name: "Close metric source", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});
test("growth denominator and selected share are traceable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Source for sales growth", exact: true }).click();
  const growth = page.getByRole("dialog", { name: "Sales growth", exact: true });
  await expect(growth.getByText("(130,497 − 60,922) ÷ 60,922 × 100", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open Gaming dependency map", exact: true }).click();
  await page.getByRole("button", { name: "Close dependencies", exact: true }).click();
  await page.getByRole("button", { name: "Source for Gaming revenue share", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Gaming revenue share", exact: true }).getByText("11,350 ÷ 130,497 × 100", { exact: true })).toBeVisible();
});
test("a narrow selected Microsoft share keeps reported inputs inside the dialog", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Microsoft MSFT", exact: true }).click();
  await page.getByRole("button", { name: "Open Intelligent Cloud dependency map", exact: true }).click();
  await page.getByRole("button", { name: "Close dependencies", exact: true }).click();
  await page.getByRole("button", { name: "Source for Intelligent Cloud revenue share", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Intelligent Cloud revenue share", exact: true });
  await expect(dialog.getByRole("table", { name: "Reported inputs" })).toContainText("281,724");
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

test("metric action descriptions expose their visible numbers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Source for annual sales", exact: true })).toHaveAccessibleDescription("$130.5B");
  await expect(page.getByRole("button", { name: "Source for sales growth", exact: true })).toHaveAccessibleDescription("+114.2%");
  await expect(page.getByRole("button", { name: "Source for profit per $100", exact: true })).toHaveAccessibleDescription(/\$55\.8\s*kept/);
  await expect(page.getByRole("button", { name: "Source for Data Center revenue share", exact: true })).toHaveAccessibleDescription("88%");
});
test("source Close restores the clicked opener even when click does not focus it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "NVIDIA NVDA", exact: true }).focus();
  const opener = page.getByRole("button", { name: "Source for annual sales", exact: true });
  await opener.dispatchEvent("click");
  await page.getByRole("button", { name: "Close metric source", exact: true }).click();
  await expect(opener).toBeFocused();
});
