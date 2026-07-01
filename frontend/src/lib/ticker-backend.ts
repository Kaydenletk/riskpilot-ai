// SERVER-ONLY ticker client. Same topology as backend.ts: the browser never
// imports this — the shared secret and private URL stay server-side.
//
// Allow-list discipline is preserved even with NO backend: the committed
// fixtures ARE the searchable universe, and any ticker outside them returns
// null (404 upstream). A malicious "ticker" can never reach the model — the
// same Scope-A boundary the Python service enforces.
import "server-only";

import fixtures from "./ticker-fixtures.json";
import type { TickerOption, TickerReport } from "./types";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
const SECRET = process.env.INTERNAL_SHARED_SECRET_FRONTEND ?? "dev-local-secret-change-me";

interface Fixtures {
  universe: TickerOption[];
  reports: Record<string, TickerReport>;
}

const FIXTURES = fixtures as Fixtures;

export function fixtureUniverse(): TickerOption[] {
  return FIXTURES.universe;
}

// The fixture-mode allow-list. Normalizing here keeps the boundary identical to
// the backend's (uppercase, trimmed) so behavior matches with or without it.
function fixtureReport(symbol: string): TickerReport | null {
  return FIXTURES.reports[symbol] ?? null;
}

export async function fetchTickerUniverse(): Promise<TickerOption[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/tickers`, {
      headers: { "x-internal-secret": SECRET },
      // force-cache (not no-store) so ticker routes prerender; fixture fallback on failure.
      cache: "force-cache",
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return (await res.json()) as TickerOption[];
    }
  } catch {
    // backend absent — the committed universe is the source of truth
  }
  return fixtureUniverse();
}

// Returns null for anything outside the universe (the allow-list / injection
// boundary). The caller renders a "not in the universe" state, never a model call.
export async function fetchTickerReport(ticker: string): Promise<TickerReport | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/analyze/${encodeURIComponent(symbol)}`, {
      headers: { "x-internal-secret": SECRET },
      // force-cache (not no-store) so ticker routes prerender; fixture fallback on failure.
      cache: "force-cache",
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return (await res.json()) as TickerReport;
    }
    if (res.status === 404) {
      return null; // upstream allow-list rejected it
    }
  } catch {
    // backend absent — fall through to the committed fixtures
  }
  return fixtureReport(symbol);
}
