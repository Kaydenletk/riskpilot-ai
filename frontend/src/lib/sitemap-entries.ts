import type { MetadataRoute } from "next";

import { CANONICAL_ORIGIN, tickerPath } from "./seo";
import { fixtureUniverse } from "./ticker-backend";

// Pure enumeration of the sitemap: home + one entry per allow-listed ticker.
// Kept separate from app/sitemap.ts so it is unit-testable without Next's
// file-convention machinery.
export function sitemapEntries(): MetadataRoute.Sitemap {
  const home: MetadataRoute.Sitemap[number] = {
    url: CANONICAL_ORIGIN,
    changeFrequency: "weekly",
    priority: 1,
  };
  const tickers: MetadataRoute.Sitemap = fixtureUniverse().map((o) => ({
    url: `${CANONICAL_ORIGIN}${tickerPath(o.ticker)}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return [home, ...tickers];
}
