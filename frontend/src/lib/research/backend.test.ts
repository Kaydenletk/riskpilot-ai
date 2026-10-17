// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { searchResearch } from "./backend";
import { companies, corpusVersion } from "./corpus";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const valid = {
  engine: "python",
  symbol: "NVDA",
  corpusVersion,
  retrievalVersion: "test-v1",
  strategy: "lexical",
  evidenceIds: ["nvda-export"],
  abstentionReason: null,
  fallbackReason: null,
};

test("server bridge sends only a scoped question and validates compatible references", async () => {
  vi.stubEnv("RESEARCH_BACKEND_ENABLED", "1");
  const fetchMock = vi.fn().mockResolvedValue(Response.json(valid));
  vi.stubGlobal("fetch", fetchMock);
  expect(
    (await searchResearch(companies[0], "export restrictions", false)).engine,
  ).toBe("python");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    symbol: "NVDA",
    query: "export restrictions",
    semantic: false,
  });
});

test.each([
  { corpusVersion: "stale" },
  { evidenceIds: ["aapl-supply"] },
  { evidenceIds: ["nvda-export", "nvda-export"] },
  { symbol: "MSFT" },
  { abstentionReason: "unsupported_time" },
  { strategy: "invented" },
])(
  "incompatible service response falls back without exposing its references: %j",
  async (change) => {
    vi.stubEnv("RESEARCH_BACKEND_ENABLED", "1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ...valid, ...change })),
    );
    const result = await searchResearch(
      companies[0],
      "export restrictions",
      false,
    );
    expect(result.engine).toBe("offline");
    expect(result.evidenceIds[0]).toBe("nvda-export");
  },
);

test("network failure preserves offline search and unsupported-time abstention", async () => {
  vi.stubEnv("RESEARCH_BACKEND_ENABLED", "1");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
  const result = await searchResearch(
    companies[0],
    "current stock price",
    false,
  );
  expect(result.engine).toBe("offline");
  expect(result.evidenceIds).toEqual([]);
  expect(result.fallbackReason).toBe("service_unavailable");
});

test.each([
  "GPU price now",
  "What is the stock price now after Data Center growth?",
  "price today demand",
  "price next year revenue",
])("offline price boundary: %s", async (query) => {
  vi.stubEnv("RESEARCH_BACKEND_ENABLED", "0");
  expect(
    (await searchResearch(companies[0], query, false)).evidenceIds,
  ).toEqual([]);
});
