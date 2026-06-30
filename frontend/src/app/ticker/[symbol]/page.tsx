// Server Component for a single-ticker read. Resolves the symbol through the
// allow-list: anything outside the universe → notFound() (the injection/Scope-A
// boundary — a bad "ticker" never reaches a model call).
import Link from "next/link";
import { notFound } from "next/navigation";

import { TickerView } from "@/components/ticker/TickerView";
import { fetchTickerReport } from "@/lib/ticker-backend";

import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const report = await fetchTickerReport(symbol);
  if (!report) notFound();

  return (
    <div className={styles.page}>
      <header className={`${styles.masthead} stage stage-1`}>
        <Link href="/" className={styles.brand} style={{ textDecoration: "none" }}>
          RiskPilot<span className={styles.brandAccent}>AI</span>
        </Link>
        <div className="caption">single-instrument risk read · explains the math</div>
      </header>
      <TickerView report={report} />
    </div>
  );
}
