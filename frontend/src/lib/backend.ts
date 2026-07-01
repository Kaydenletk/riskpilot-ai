// SERVER-ONLY backend client. The browser never imports this — the shared secret
// and the private backend URL must never reach client code (no NEXT_PUBLIC_*).
import "server-only";

import demoReport from "./demo-report.json";
import type { Holding, RiskReport } from "./types";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
const SECRET = process.env.INTERNAL_SHARED_SECRET_FRONTEND ?? "dev-local-secret-change-me";

// Committed snapshot of the real computed report. Lets the dashboard render on
// Vercel with NO backend (DX no-key DEMO_MODE applied to deploy). When the Python
// service is hosted, the live report is preferred and this is the fallback.
const FIXTURE = demoReport as RiskReport;

export async function fetchSampleReport(): Promise<RiskReport> {
  try {
    const res = await fetch(`${BACKEND_URL}/report/sample`, {
      headers: { "x-internal-secret": SECRET },
      cache: "no-store",
      // Don't hang the page on a sleeping/absent backend — fall back fast.
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return (await res.json()) as RiskReport;
    }
  } catch {
    // backend unreachable / timed out / not hosted — use the committed fixture
  }
  return FIXTURE;
}

export type AnalyzeResult =
  | { ok: true; report: RiskReport }
  | { ok: false; reason: "engine_unavailable" }
  | { ok: false; reason: "unknown_tickers"; symbols: string[] };

// POSTs validated holdings to the private engine. The shared secret stays here
// (server-only). No fixture fallback: scoring arbitrary user holdings requires
// the real engine — we never fabricate numbers for a portfolio we can't compute.
// 4000ms (vs the 2500ms sample/ticker reads) because fresh scoring + the grounded
// explain pass is slower than returning the cached sample.
export async function analyzePortfolio(holdings: Holding[]): Promise<AnalyzeResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/report`, {
      method: "POST",
      headers: { "x-internal-secret": SECRET, "content-type": "application/json" },
      body: JSON.stringify({ holdings }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return { ok: true, report: (await res.json()) as RiskReport };
    }
    if (res.status === 422) {
      const body = (await res.json()) as { detail?: { symbols?: string[] } };
      return { ok: false, reason: "unknown_tickers", symbols: body.detail?.symbols ?? [] };
    }
  } catch {
    // engine absent / timed out — reported as unavailable, never faked
  }
  return { ok: false, reason: "engine_unavailable" };
}
