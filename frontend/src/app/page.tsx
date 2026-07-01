// Server Component: fetches the report, renders the masthead, hands the report to
// the client Dashboard (which holds the Coach/Analyst view toggle).
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SearchPalette } from "@/components/search/SearchPalette";
import { fetchSampleReport } from "@/lib/backend";
import { fetchTickerUniverse } from "@/lib/ticker-backend";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  let report;
  try {
    report = await fetchSampleReport();
  } catch {
    return <BackendOffline />;
  }

  const universe = await fetchTickerUniverse();

  return (
    <div className={styles.page}>
      <Masthead />
      <div className={`${styles.searchRow} stage stage-1`}>
        <SearchPalette universe={universe} />
        <span className="caption">
          {universe.length} instruments ·{" "}
          <span className="hover-hint">type ⌘K to analyze any one</span>
          <span className="touch-hint">tap to search any one</span>
        </span>
      </div>
      <Dashboard report={report} />
    </div>
  );
}

function Masthead() {
  return (
    <header className={`${styles.masthead} stage stage-1`}>
      <div className={styles.brand}>
        RiskPilot<span className={styles.brandAccent}>AI</span>
      </div>
      <div className="caption">risk coaching · explains the math · never invents numbers</div>
    </header>
  );
}

function BackendOffline() {
  return (
    <div className={styles.page}>
      <Masthead />
      <section className={styles.explain}>
        <p className={styles.summary}>
          The risk engine (a private Python service) isn&apos;t connected to this deployment
          yet. The frontend, topology, and the number-hallucination guardrail are live in the
          repo — run it locally to see the full X-Ray:
        </p>
        <pre className={styles.code}>
          {`git clone <repo> && cd "RiskPilot AI"
cp .env.example .env   # no OpenAI key needed
make install && make dev`}
        </pre>
        <p className="disclaimer">
          Educational risk coaching, not financial advice. No buy/sell recommendations.
          Illustrative sample data.
        </p>
      </section>
    </div>
  );
}
