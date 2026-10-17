import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`dependency drawer stays usable and preserves focus at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const trigger = page.getByRole("button", {
      name: "Explore dependencies: Data Center",
      exact: true,
    });
    await trigger.click();
    const drawer = page.getByRole("dialog", {
      name: "Data Center",
      exact: true,
    });
    await expect(drawer).toBeVisible();
    expect(
      await drawer.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await page.keyboard.press("Shift+Tab");
    expect(
      await drawer.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    const exportRisk = drawer
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", { name: "Export restrictions" }),
      });
    await exportRisk
      .getByRole("button", { name: "Flag as Blindspot", exact: true })
      .click();
    await expect(exportRisk).toContainText("Saved to My notes · Blindspot");
    await page.screenshot({
      path: `e2e/__shots__/dependencies-${width}.png`,
      fullPage: true,
    });
    await exportRisk
      .getByRole("button", { name: "Read disclosure", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Source details", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Close source", exact: true })
      .click();
    await expect(trigger).toBeFocused();
    await page
      .getByRole("button", { name: "2. My notes", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "My risk memo", exact: true }),
    ).toContainText("Blindspot");
    await page.screenshot({
      path: `e2e/__shots__/memo-${width}.png`,
      fullPage: true,
    });
  });
}
