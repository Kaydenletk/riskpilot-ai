// Public surface. Browser -> this route (same-origin, no CORS) -> private backend.
import { NextResponse } from "next/server";

import { analyzePortfolio, fetchSampleReport } from "@/lib/backend";
import { MAX_HOLDINGS } from "@/lib/parse-holdings";
import type { Holding } from "@/lib/types";

export async function GET() {
  try {
    const report = await fetchSampleReport();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json(
      { error: "report_unavailable", message: "The risk service is temporarily unavailable." },
      { status: 503 },
    );
  }
}

function validateHoldings(value: unknown): { ok: true; holdings: Holding[] } | { ok: false; errors: string[] } {
  if (!value || typeof value !== "object" || !Array.isArray((value as { holdings?: unknown }).holdings)) {
    return { ok: false, errors: ["body must be { holdings: Holding[] }"] };
  }
  const raw = (value as { holdings: unknown[] }).holdings;
  if (raw.length === 0) return { ok: false, errors: ["holdings is empty"] };
  if (raw.length > MAX_HOLDINGS) return { ok: false, errors: [`too many holdings (max ${MAX_HOLDINGS})`] };

  const errors: string[] = [];
  const holdings: Holding[] = [];
  raw.forEach((h, i) => {
    const o = h as Record<string, unknown>;
    const ticker = typeof o.ticker === "string" ? o.ticker.trim().toUpperCase() : "";
    const sector = typeof o.sector === "string" ? o.sector.trim() : "";
    const shares = Number(o.shares);
    const market_value = Number(o.market_value);
    if (!ticker || !sector || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(market_value) || market_value <= 0) {
      errors.push(`holding ${i + 1} is invalid`);
      return;
    }
    holdings.push({ ticker, sector, shares, market_value });
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, holdings };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const v = validateHoldings(body);
  if (!v.ok) {
    return NextResponse.json({ error: "invalid_holdings", errors: v.errors }, { status: 400 });
  }
  const result = await analyzePortfolio(v.holdings);
  if (result.ok) return NextResponse.json(result.report);
  if (result.reason === "unknown_tickers") {
    return NextResponse.json(
      { error: "unknown_tickers", symbols: result.symbols, message: `Not in the demo universe: ${result.symbols.join(", ")}.` },
      { status: 422 },
    );
  }
  // mirror the GET envelope shape for the engine-down case
  return NextResponse.json(
    { error: "engine_unavailable", message: "The risk service is temporarily unavailable." },
    { status: 503 },
  );
}
