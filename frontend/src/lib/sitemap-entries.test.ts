import { describe, expect, it } from "vitest";

import { sitemapEntries } from "./sitemap-entries";
import { fixtureUniverse } from "./ticker-backend";

describe("sitemapEntries", () => {
  it("includes the home page", () => {
    const urls = sitemapEntries().map((e) => e.url);
    expect(urls).toContain("https://riskpilot-coach.vercel.app");
  });

  it("includes every ticker in the universe, lowercased", () => {
    const entries = sitemapEntries();
    const universe = fixtureUniverse();
    for (const { ticker } of universe) {
      expect(entries.some((e) => e.url.endsWith(`/ticker/${ticker.toLowerCase()}`))).toBe(true);
    }
    expect(entries.length).toBe(universe.length + 1);
  });
});
