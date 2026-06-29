// Public surface. Browser -> this route (same-origin, no CORS) -> private backend.
import { NextResponse } from "next/server";

import { fetchSampleReport } from "@/lib/backend";

export async function GET() {
  try {
    const report = await fetchSampleReport();
    return NextResponse.json(report);
  } catch {
    // Don't leak backend internals to the client.
    return NextResponse.json(
      { error: "report_unavailable", message: "The risk service is temporarily unavailable." },
      { status: 503 },
    );
  }
}
