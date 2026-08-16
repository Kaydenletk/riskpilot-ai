// Fake-timer tests for the simulator's fetch discipline: debounce, supersede,
// stale-response discard. fetch is mocked — no network.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { PortfolioRow } from "@/lib/portfolio-state";

import { SCORE_DEBOUNCE_MS, useDebouncedScore } from "./useDebouncedScore";

const row = (ticker: string, weightPct: number): PortfolioRow => ({
  ticker,
  weightPct,
  locked: false,
});

const FACTS = { risk_score: 61 };

function okResponse(facts: unknown = FACTS) {
  return {
    ok: true,
    json: async () => ({ facts }),
  } as Response;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test("debounces: one fetch for rapid successive row changes", async () => {
  const fetchMock = vi.fn().mockResolvedValue(okResponse());
  vi.stubGlobal("fetch", fetchMock);

  const { rerender } = renderHook(
    ({ rows }) => useDebouncedScore(rows, true),
    { initialProps: { rows: [row("NVDA", 60), row("KO", 40)] } },
  );
  rerender({ rows: [row("NVDA", 55), row("KO", 45)] });
  rerender({ rows: [row("NVDA", 50), row("KO", 50)] });

  await act(async () => {
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS + 10);
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
  expect(body.holdings).toEqual([
    { ticker: "NVDA", weight_pct: 50 },
    { ticker: "KO", weight_pct: 50 },
  ]);
});

const STABLE_ROWS = [row("NVDA", 60), row("KO", 40)];

test("scored state carries facts", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse()));

  const { result } = renderHook(() => useDebouncedScore(STABLE_ROWS, true));
  await act(async () => {
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS + 10);
  });

  expect(result.current.state).toEqual({ kind: "scored", facts: FACTS });
});

test("stale response never overwrites a newer one", async () => {
  // First request resolves LATE with old facts; second resolves fast with new.
  let resolveFirst: (r: Response) => void = () => {};
  const first = new Promise<Response>((resolve) => (resolveFirst = resolve));
  const fetchMock = vi
    .fn()
    .mockReturnValueOnce(first)
    .mockResolvedValueOnce(okResponse({ risk_score: 99 }));
  vi.stubGlobal("fetch", fetchMock);

  const { result, rerender } = renderHook(
    ({ rows }) => useDebouncedScore(rows, true),
    { initialProps: { rows: [row("NVDA", 60), row("KO", 40)] } },
  );
  await act(async () => {
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS + 10);
  });
  rerender({ rows: [row("NVDA", 30), row("KO", 70)] });
  await act(async () => {
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS + 10);
  });

  // late arrival of the superseded request
  await act(async () => {
    resolveFirst(okResponse({ risk_score: 12 }));
  });

  expect(result.current.state).toEqual({
    kind: "scored",
    facts: { risk_score: 99 },
  });
});

test("network failure surfaces error state and retry refires", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error("down"))
    .mockResolvedValueOnce(okResponse());
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useDebouncedScore(STABLE_ROWS, true));
  await act(async () => {
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS + 10);
  });
  expect(result.current.state).toEqual({ kind: "error" });

  await act(async () => {
    result.current.retry();
  });
  expect(result.current.state).toEqual({ kind: "scored", facts: FACTS });
});

test("disabled → idle, no fetch", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useDebouncedScore(STABLE_ROWS, false));
  await act(async () => {
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS + 10);
  });

  expect(fetchMock).not.toHaveBeenCalled();
  expect(result.current.state).toEqual({ kind: "idle" });
});
