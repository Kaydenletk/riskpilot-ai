// SERVER-ONLY backend client. The browser never imports this — the shared secret
// and the private backend URL must never reach client code (no NEXT_PUBLIC_*).
import "server-only";

import type { RiskReport } from "./types";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
const SECRET = process.env.INTERNAL_SHARED_SECRET_FRONTEND ?? "dev-local-secret-change-me";

export async function fetchSampleReport(): Promise<RiskReport> {
  const res = await fetch(`${BACKEND_URL}/report/sample`, {
    headers: { "x-internal-secret": SECRET },
    // M2: cache the sample report so the live LLM fires ~once, not per visitor.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`backend ${res.status}`);
  }
  return (await res.json()) as RiskReport;
}
