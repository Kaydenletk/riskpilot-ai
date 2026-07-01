// Server component: reads ?t=, resolves each ticker through the allow-list
// (unknowns dropped), renders the comparison.
import Link from "next/link";

import { CompareGrid } from "@/components/compare/CompareGrid";
import { parseCompare } from "@/lib/compare";
import { fetchTickerReport } from "@/lib/ticker-backend";
import type { TickerReport } from "@/lib/types";

import styles from "@/components/compare/compare.module.css";
import page from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const requested = parseCompare(t ?? null);
  const resolved = await Promise.all(requested.map((tk) => fetchTickerReport(tk)));
  const reports = resolved.filter((r): r is TickerReport => r !== null);

  return (
    <div className={page.page}>
      <header className={`${page.masthead} stage stage-1`}>
        <Link href="/" className={page.brand} style={{ textDecoration: "none" }}>
          RiskPilot<span className={page.brandAccent}>AI</span>
        </Link>
        <div className="caption">side-by-side risk comparison · illustrative data</div>
      </header>

      <div className={`${styles.wrap} stage stage-2`}>
        <div className={styles.head}>
          <div className="caption">
            Comparing {reports.length} of {requested.length} requested
          </div>
          <Link href="/" className="caption">← back to portfolio</Link>
        </div>

        {reports.length === 0 ? (
          <p className={styles.empty}>
            No recognized tickers to compare. Add some from the search palette on the home page.
          </p>
        ) : (
          <CompareGrid reports={reports} />
        )}

        <p className="disclaimer" style={{ marginTop: "var(--space-3)" }}>
          Educational risk coaching, not financial advice. No buy/sell recommendations.
          Illustrative sample data.
        </p>
      </div>
    </div>
  );
}
