// The X-Ray dashboard (Server Component). Hierarchy: hero gauge + verdict first,
// the deterministic "receipts" beside it, then the grounded AI explanation.
// Swiss/instrument direction; the gauge is the one expressive element.
import { AllocationBar } from "@/components/dashboard/AllocationBar";
import { GroundedText } from "@/components/dashboard/GroundedText";
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { fetchSampleReport } from "@/lib/backend";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  model: "AI-written · every figure verified against computed data",
  model_regenerated: "AI-written (regenerated after a guardrail catch) · figures verified",
  template_fallback: "Deterministic summary (AI fell back) · figures verified",
  demo_fixture: "Sample explanation · every figure verified against computed data",
};

export default async function Home() {
  let report;
  try {
    report = await fetchSampleReport();
  } catch {
    return <BackendOffline />;
  }

  const { facts, explanation, holdings, disclaimer, portfolio_name, as_of } = report;

  return (
    <div className={styles.page}>
      <header className={`${styles.masthead} stage stage-1`}>
        <div className={styles.brand}>
          RiskPilot<span className={styles.brandAccent}>AI</span>
        </div>
        <div className="caption">explains the math · never invents numbers</div>
      </header>

      {/* HERO: gauge + verdict (the 5-second read) */}
      <section className={`${styles.hero} stage stage-2`}>
        <RiskGauge score={facts.risk_score} band={facts.risk_band} />
        <div className={styles.verdict}>
          <div className="caption">{portfolio_name}</div>
          <h1 className={styles.headline}>
            This portfolio is{" "}
            <span style={{ color: `var(--risk-${bandKey(facts.risk_band)})` }}>
              {facts.risk_band}
            </span>
            .
          </h1>
          <p className={styles.lede}>
            Its top 3 holdings are{" "}
            <strong className="num">{facts.concentration_pct_top3}%</strong> of the book, and{" "}
            {facts.largest_sector} is the largest sector at{" "}
            <strong className="num">{facts.largest_sector_pct}%</strong>.
          </p>
        </div>
      </section>

      {/* TIER 2: the deterministic receipts */}
      <section className={`${styles.metrics} stage stage-3`}>
        <Metric label="Top-3 concentration" value={`${facts.concentration_pct_top3}%`} />
        <Metric label="Annualized volatility" value={`${facts.volatility_annualized_pct}%`} />
        <Metric label="Worst drawdown" value={`${facts.max_drawdown_pct}%`} />
        <Metric label="Holdings" value={`${facts.holdings_count}`} />
      </section>

      <section className={`${styles.allocation} stage stage-3`}>
        <AllocationBar holdings={holdings} />
      </section>

      {/* TIER 3: grounded AI explanation */}
      <section className={`${styles.explain} stage stage-4`}>
        <div className={styles.verified}>
          <span className={styles.check} aria-hidden>
            ✓
          </span>
          {SOURCE_LABEL[explanation.source] ?? "Figures verified against computed data"}
        </div>
        <p className={styles.summary}>
          <GroundedText text={explanation.summary} />
        </p>

        <div className={styles.cols}>
          <div>
            <div className="caption">Top risk factors</div>
            <ul className={styles.list}>
              {explanation.top_risk_factors.map((f) => (
                <li key={f}>
                  <GroundedText text={f} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="caption">Review checklist</div>
            <ul className={styles.list}>
              {explanation.review_checklist.map((q) => (
                <li key={q}>
                  <GroundedText text={q} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className="num">{holdings.length} holdings</span> · {as_of}
        <p className="disclaimer">{disclaimer}</p>
      </footer>
    </div>
  );
}

function bandKey(band: string): string {
  if (band === "aggressive") return "high";
  if (band === "moderate") return "mid";
  return "low";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.tile}>
      <div className="caption">{label}</div>
      <div className={`num ${styles.tileValue}`}>{value}</div>
    </div>
  );
}

function BackendOffline() {
  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.brand}>
          RiskPilot<span className={styles.brandAccent}>AI</span>
        </div>
        <div className="caption">explains the math · never invents numbers</div>
      </header>
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
