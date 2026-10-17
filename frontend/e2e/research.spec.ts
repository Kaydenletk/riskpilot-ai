import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("research links evidence to a persistent personal understanding and immutable journal", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "NVIDIA",
      level: 1,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore evidence: How NVIDIA makes money" })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Evidence desk" }),
  ).toContainText("Item 1 · Business");
  await page.getByRole("button", { name: "Save source" }).click();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await page
    .getByLabel("How does this business make money?")
    .fill("It sells computing platforms and related software.");
  await page
    .getByLabel("What could change my mind?")
    .fill("A change in customer demand.");
  await page
    .getByRole("button", { name: "Save to history", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved to history");
  await page.reload();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await expect(
    page.getByLabel("How does this business make money?"),
  ).toHaveValue("It sells computing platforms and related software.");
  await page
    .getByLabel("How does this business make money?")
    .fill("A revised draft.");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByText("It sells computing platforms and related software.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Microsoft MSFT" }).click();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await expect(
    page.getByLabel("How does this business make money?"),
  ).toHaveValue("");
});

test("source search returns notes, while unsupported prices stay unanswered", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Question or claim to research")
    .fill("export restrictions China");
  await page
    .getByRole("button", { name: "Search sources", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Research results" }),
  ).toContainText("Export restrictions");
  await page
    .getByLabel("Question or claim to research")
    .fill("What is the current stock price?");
  await page
    .getByRole("button", { name: "Search sources", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Research results" }),
  ).toContainText("These notes cannot answer that question");
});

for (const width of [375, 768, 1440]) {
  test(`workspace stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await page
      .getByRole("button", { name: "Explore evidence: How NVIDIA makes money" })
      .click();
    await expect(
      page.getByRole("complementary", { name: "Evidence desk" }),
    ).toBeVisible();
  });
}

test("two tabs reconcile different companies without losing saved research", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const other = await context.newPage();
  await other.goto("/");
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await page
    .getByLabel("How does this business make money?")
    .fill("NVIDIA reasoning from tab one");
  await other.getByRole("button", { name: "Microsoft MSFT" }).click();
  await other.getByRole("button", { name: "2. My notes", exact: true }).click();
  await other
    .getByLabel("How does this business make money?")
    .fill("Microsoft reasoning from tab two");
  await page.reload();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await expect(
    page.getByLabel("How does this business make money?"),
  ).toHaveValue("NVIDIA reasoning from tab one");
  await page.getByRole("button", { name: "Microsoft MSFT" }).click();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await expect(
    page.getByLabel("How does this business make money?"),
  ).toHaveValue("Microsoft reasoning from tab two");
});

test("unreadable browser data stays recoverable instead of being overwritten", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("riskpilot-research-v1", "unreadable old notebook"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Export recovery backup" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await page
    .getByLabel("How does this business make money?")
    .fill("A new draft");
  expect(
    await page.evaluate(() => localStorage.getItem("riskpilot-research-v1")),
  ).toBe("unreadable old notebook");
});

test("export includes saved reasoning and deletion requires a deliberate second click", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await page
    .getByLabel("How does this business make money?")
    .fill("My own reasoning");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export research", exact: true })
    .click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.symbol).toBe("NVDA");
  expect(exported.notebook.business).toBe("My own reasoning");
  await page
    .getByRole("button", { name: "Delete this local notebook", exact: true })
    .click();
  await expect(
    page.getByLabel("How does this business make money?"),
  ).toHaveValue("My own reasoning");
  await page
    .getByRole("button", { name: "Confirm delete NVDA notebook", exact: true })
    .click();
  await expect(
    page.getByLabel("How does this business make money?"),
  ).toHaveValue("");
  await page.reload();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await expect(
    page.getByLabel("How does this business make money?"),
  ).toHaveValue("");
});

test("first visit has a clear start and source detail can close without losing context", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("START HERE · THE BUSINESS AT A GLANCE", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Evidence desk" }),
  ).toHaveCount(0);
  const overview = page.getByRole("button", {
    name: "Explore evidence: How NVIDIA makes money",
  });
  await overview.click();
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await page.getByRole("button", { name: "Close source", exact: true }).click();
  await expect(overview).toBeFocused();
  await page.getByRole("button", { name: /Saved sources/ }).click();
  await expect(
    page.getByRole("heading", { name: "How NVIDIA makes money" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect source", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Source details" }),
  ).toBeVisible();
});

test("moving from a source to notes places keyboard focus in the editor", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore evidence: How NVIDIA makes money" })
    .click();
  await page
    .getByRole("complementary", { name: "Evidence desk" })
    .getByRole("button", { name: "Write my notes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What I learned about NVIDIA" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  // The memo is now the first editor section; export is its first control.
  await expect(
    page.getByRole("button", { name: "Export Markdown", exact: true }),
  ).toBeFocused();
});

test("visual facts show sourced percentages and switch cleanly between companies", async ({
  page,
}) => {
  await page.goto("/");
  const overview = page.getByRole("region", { name: "NVIDIA visual overview" });
  await expect(overview).toContainText("$130.5B");
  await expect(overview).toContainText("+114.2%");
  await expect(overview).toContainText("$55.8");
  await overview
    .getByRole("group", { name: "Explore revenue sources", exact: true })
    .getByRole("button", { name: /Gaming/ })
    .click();
  await expect(
    overview
      .getByRole("group", { name: "Explore revenue sources", exact: true })
      .getByRole("button", { name: /Gaming/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("dialog", { name: "Gaming", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close dependencies", exact: true })
    .click();
  await expect(overview).toContainText("About $9 of every $100 in sales");
  await overview
    .getByText("Source, dates & exact figures", { exact: true })
    .click();
  await expect(
    overview.getByRole("table", { name: "Revenue history" }),
  ).toContainText("130,497");
  await expect(
    overview.getByRole("link", { name: "Open original annual report" }),
  ).toHaveAttribute("href", /sec.gov/);
  await page.getByRole("button", { name: "Microsoft MSFT" }).click();
  const microsoft = page.getByRole("region", {
    name: "Microsoft visual overview",
  });
  await expect(microsoft).toContainText("$281.7B");
  await expect(
    microsoft
      .getByRole("group", { name: "Explore revenue sources", exact: true })
      .getByRole("button", { name: /Productivity & Business/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Apple AAPL" }).click();
  await expect(
    page.getByRole("region", { name: "Apple visual overview" }),
  ).toContainText("$416.2B");
});

test("charts hydrate without browser errors and retain the OS dark preference", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Gaming.*8.7%/ }).click();
  expect(errors).toEqual([]);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await context.close();
});

test("revenue dependency becomes a personal memo that survives reload and preserves history", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Open Data Center dependency map",
      exact: true,
    })
    .click();
  const drawer = page.getByRole("dialog", { name: "Data Center", exact: true });
  await expect(drawer).toContainText("$115.2B");
  await expect(drawer).toContainText("88.3% of FY2025 sales");
  await expect(
    drawer.getByRole("region", { name: "Supporting drivers" }),
  ).toContainText("accelerated computing and AI");
  const exportRisk = drawer.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Export restrictions" }),
  });
  await exportRisk
    .getByRole("button", { name: "Add as Dealbreaker", exact: true })
    .click();
  await expect(
    exportRisk.getByRole("button", { name: "Add as Dealbreaker", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await drawer
    .getByRole("button", { name: "View my risk memo", exact: true })
    .click();
  const memo = page.getByRole("region", { name: "My risk memo", exact: true });
  await expect(memo).toContainText("Export restrictions");
  const reason = page.getByLabel(
    "Why I classified “Export restrictions” this way",
  );
  await reason.fill("I need to investigate access to overseas markets.");
  await page
    .getByRole("button", { name: "Save to history", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await expect(reason).toHaveValue(
    "I need to investigate access to overseas markets.",
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export Markdown", exact: true })
    .click();
  const download = await downloadPromise;
  const markdown = await readFile((await download.path())!, "utf8");
  expect(markdown).toContain("My classification: Dealbreaker");
  expect(markdown).toContain(
    "I need to investigate access to overseas markets.",
  );
  await memo.getByLabel("My classification").selectOption("manageable");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "My risk memo", exact: true }),
  ).toContainText("Dealbreaker");
  await page.getByRole("button", { name: "Apple AAPL", exact: true }).click();
  await page.getByRole("button", { name: "2. My notes", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "My risk memo", exact: true }),
  ).toContainText("No risks classified yet");
});

test("dependency drawer closes with Escape and restores focus to the revenue trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Explore dependencies: Data Center",
    exact: true,
  });
  await trigger.click();
  await expect(
    page.getByRole("dialog", { name: "Data Center", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
