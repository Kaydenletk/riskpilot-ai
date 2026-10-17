// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("RESEARCH_BACKEND_ENABLED", "0"));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const request = (body: unknown) =>
  new Request("http://localhost:3000/api/research", {
    method: "POST",
    body: JSON.stringify(body),
  });

test("source search needs no model and sends no personal data outside the server", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const response = await POST(
    request({
      symbol: "NVDA",
      query: "export restrictions China",
      useAi: false,
    }),
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.mode).toBe("source_notes");
  expect(body.evidenceIds[0]).toBe("nvda-export");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("unsupported queries abstain and invalid companies return an error", async () => {
  const response = await POST(
    request({ symbol: "NVDA", query: "current stock price", useAi: false }),
  );
  expect((await response.json()).evidenceIds).toEqual([]);
  expect(
    (
      await POST(
        request({ symbol: "UNKNOWN", query: "business", useAi: false }),
      )
    ).status,
  ).toBe(404);
});

test("requests reject hidden personal fields, huge inputs and foreign origins", async () => {
  expect(
    (
      await POST(
        request({ symbol: "NVDA", query: "business", thesis: "private" }),
      )
    ).status,
  ).toBe(400);
  expect(
    (await POST(request({ symbol: "NVDA", query: "x".repeat(501) }))).status,
  ).toBe(400);
  const foreign = new Request("http://localhost:3000/api/research", {
    method: "POST",
    headers: { origin: "https://other.example" },
    body: "{}",
  });
  expect((await POST(foreign)).status).toBe(403);
});

test("model responses with invented references fall back to retrieved notes", async () => {
  vi.stubEnv("RESEARCH_LIVE_AI", "1");
  vi.stubEnv("OPENAI_API_KEY", "unit-test-not-a-real-key");
  vi.stubEnv("OPENAI_MODEL", "configured-model");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  interpretation: "A claim",
                  evidenceIds: ["fake"],
                  unknowns: [],
                }),
              },
            },
          ],
        }),
      ),
    ),
  );
  const response = await POST(
    request({
      symbol: "NVDA",
      query: "export restrictions China",
      useAi: true,
    }),
  );
  const body = await response.json();
  expect(body.mode).toBe("source_fallback");
  expect(body.evidenceIds).not.toContain("fake");
});

test("opted-in model interpretation cites retrieved notes and receives no notebook fields", async () => {
  vi.stubEnv("RESEARCH_LIVE_AI", "1");
  vi.stubEnv("OPENAI_API_KEY", "unit-test-not-a-real-key");
  vi.stubEnv("OPENAI_MODEL", "configured-model");
  const provider = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                interpretation:
                  "The filing describes export restrictions as a business risk.",
                evidenceIds: ["nvda-export"],
                unknowns: ["Have the rules changed since this filing?"],
              }),
            },
          },
        ],
      }),
    ),
  );
  vi.stubGlobal("fetch", provider);
  const response = await POST(
    request({
      symbol: "NVDA",
      query: "export restrictions China",
      useAi: true,
    }),
  );
  expect((await response.json()).mode).toBe("ai");
  const providerBody = JSON.parse(provider.mock.calls[0][1].body);
  const context = JSON.parse(providerBody.messages[1].content);
  expect(Object.keys(context).sort()).toEqual(["company", "notes", "question"]);
  expect(
    context.notes.every((note: { id: string }) => note.id.startsWith("nvda-")),
  ).toBe(true);
});
