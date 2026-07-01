// Server Component: fetches the report, renders the masthead, hands the report to
// the client Dashboard (which holds the Coach/Analyst view toggle).
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SearchPalette } from "@/components/search/SearchPalette";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { fetchSampleReport } from "@/lib/backend";
import { tickerPath } from "@/lib/seo";
import { fetchTickerUniverse } from "@/lib/ticker-backend";

import styles from "./page.module.css";

// ISR: prerender at build, refresh hourly. With a hosted backend the fetches
// below pick up live data on the cycle; with none, the fixture render repeats.
// Literal (not imported const): Next statically analyzes segment config.
export const revalidate = 3600;

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
        <span className="caption">{universe.length} instruments · type ⌘K to analyze any one</span>
      </div>
      <Dashboard report={report} />
      <nav aria-label="Browse the risk universe" className={styles.tickerNav}>
        <span className="caption">Browse all instruments:</span>
        <ul className={styles.tickerNavList}>
          {universe.map((o) => (
            <li key={o.ticker}>
              <a href={tickerPath(o.ticker)}>
                <span className="num">{o.ticker}</span> · {o.sector}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function Masthead() {
  return (
    <header className={`${styles.masthead} stage stage-1`}>
      <h1 className={styles.brand} style={{ margin: 0 }}>
        RiskPilot<span className={styles.brandAccent}>AI</span>
      </h1>
      <div className={styles.mastheadRight}>
        <div className="caption">risk coaching · explains the math · never invents numbers</div>
        <ThemeToggle />
      </div>
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
