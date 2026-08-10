// Public surface for the what-if simulator. Browser -> this route (same-origin,
// no CORS) -> the private, math-only /score engine path. No LLM in this path,
// so it's safe to call on every slider drag. zod validates the body BEFORE the
// engine ever sees it; a down/absent engine returns 503 (matching /api/report's
// convention) — numbers are never fabricated for a portfolio we can't compute.
import { NextResponse } from "next/server";

import { scorePortfolio } from "@/lib/backend";
import { weightedPortfolio } from "@/lib/portfolio-schema";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const parsed = weightedPortfolio.safeParse(
    (body as { holdings?: unknown } | null)?.holdings,
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const result = await scorePortfolio(parsed.data);
  if (result.ok) return NextResponse.json(result);
  if (result.reason === "unknown_tickers") {
    return NextResponse.json(result, { status: 422 });
  }
  if (result.reason === "invalid") {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result, { status: 503 });
}
