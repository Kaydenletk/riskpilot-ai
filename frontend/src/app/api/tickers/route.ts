// Public surface for search suggestions. Browser -> this route (same-origin,
// no CORS, no secret) -> private backend (with secret) or committed fixtures.
// Returns ONLY the allow-listed universe — never accepts a free-text symbol.
import { NextResponse } from "next/server";

import { fetchTickerUniverse } from "@/lib/ticker-backend";

export async function GET() {
  try {
    const universe = await fetchTickerUniverse();
    return NextResponse.json(universe);
  } catch {
    return NextResponse.json(
      { error: "universe_unavailable", message: "Search is temporarily unavailable." },
      { status: 503 },
    );
  }
}
