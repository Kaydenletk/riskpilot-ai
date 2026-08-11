"use client";

// Debounced bridge from slider state to the math-only /api/score fast path.
// Guards: 250ms debounce, AbortController on supersede, and a request-id check
// so a slow early response can never overwrite a newer one — stale numbers are
// worse than no numbers in a risk tool.
import { useCallback, useEffect, useRef, useState } from "react";

import type { PortfolioRow } from "@/lib/portfolio-state";
import type { RiskFacts } from "@/lib/types";

export const SCORE_DEBOUNCE_MS = 250;

export type ScoreState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "scored"; facts: RiskFacts }
  | { kind: "error" };

export function useDebouncedScore(rows: readonly PortfolioRow[], enabled: boolean) {
  const [state, setState] = useState<ScoreState>({ kind: "idle" });
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fire = useCallback(async (current: readonly PortfolioRow[]) => {
    const id = ++requestId.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "pending" });
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          holdings: current.map((r) => ({ ticker: r.ticker, weight_pct: r.weightPct })),
        }),
        signal: controller.signal,
      });
      if (id !== requestId.current) return; // superseded while in flight
      if (res.ok) {
        const body = (await res.json()) as { facts: RiskFacts };
        if (id !== requestId.current) return;
        setState({ kind: "scored", facts: body.facts });
        return;
      }
      setState({ kind: "error" });
    } catch {
      if (id !== requestId.current) return; // abort of a superseded request
      setState({ kind: "error" });
    }
  }, []);

  // Key on VALUES, not array identity — callers may pass a freshly-mapped
  // array every render, and identity-keyed effects would loop.
  const rowsKey = rows.map((r) => `${r.ticker}:${r.weightPct}`).join(",");
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    if (!enabled || rowsKey === "") {
      setState({ kind: "idle" });
      return;
    }
    const timer = setTimeout(() => void fire(rowsRef.current), SCORE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rowsKey, enabled, fire]);

  const retry = useCallback(() => {
    if (rows.length > 0) void fire(rows);
  }, [rows, fire]);

  return { state, retry };
}
