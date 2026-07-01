// SERVER-ONLY backend client. The browser never imports this — the shared secret
// and the private backend URL must never reach client code (no NEXT_PUBLIC_*).
import "server-only";

import demoReport from "./demo-report.json";
import type { RiskReport } from "./types";

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
      // ISR: revalidate hourly so a hosted backend's data is picked up, while
      // still allowing static prerender at build. With no backend the fetch
      // throws/times out and the committed fixture is returned.
      next: { revalidate: 3600 },
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
