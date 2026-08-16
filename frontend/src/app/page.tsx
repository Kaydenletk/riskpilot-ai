// Server Component: fetches the report, renders the masthead, hands the report to
// the client Dashboard (which holds the Coach/Analyst view toggle).
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Hero } from "@/components/home/Hero";
import { HeroXray } from "@/components/home/HeroXray";
import { HowItWorks } from "@/components/home/HowItWorks";
import { InstrumentIndex } from "@/components/home/InstrumentIndex";
import { WhatIfTeaser } from "@/components/home/WhatIfTeaser";
import { Masthead } from "@/components/layout/Masthead";
import { SearchWithCompare } from "@/components/search/SearchWithCompare";
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
      <Masthead caption="risk coaching · explains the math · never invents numbers" />
      <Hero card={<HeroXray report={report} />} />
      <div className={`${styles.searchRow} stage stage-2`}>
        <SearchWithCompare universe={universe} />
        <span className="caption">
          {universe.length} instruments
          <span className="fine-pointer-only"> · type ⌘K to analyze any one</span>
        </span>
      </div>
      <section id="sample" className="stage stage-3">
        <div className="caption" style={{ marginBottom: "var(--space-2)" }}>
          Sample portfolio — live from the engine
        </div>
        <Dashboard report={report} />
      </section>
      <WhatIfTeaser />
      <HowItWorks />
      <InstrumentIndex universe={universe} />
    </div>
  );
}

function BackendOffline() {
  return (
    <div className={styles.page}>
      <Masthead caption="risk coaching · explains the math · never invents numbers" />
      <Hero />
      <section className={`glass ${styles.explain}`}>
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
