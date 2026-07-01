// Persona B — "The Overtrader". Reframes the SAME computed facts as plain-language
// coaching that bends the emotional arc DOWN: lands anxious -> understood -> calmer
// -> one reflective action. No new numbers (still grounded); jargon translated;
// the discipline prompt is prominent, not buried. Never says buy/sell.
import { riskInkVar, riskVar, type RiskBand } from "@/lib/risk-color";
import type { RiskReport } from "@/lib/types";

import { RiskGauge } from "./RiskGauge";
import { TrustStrip } from "./TrustStrip";
import styles from "./coach-view.module.css";

function verdictLine(band: RiskBand): string {
  if (band === "aggressive")
    return "You're running hot. This portfolio would swing hard in a downturn.";
  if (band === "moderate")
    return "You're taking real risk, but it's not extreme. Worth watching.";
  return "You're playing it fairly safe right now.";
}

function whyLine(report: RiskReport): string {
  const f = report.facts;
  return `Mostly because ${f.concentration_pct_top3}% of your money sits in just your top 3 holdings, and ${f.largest_sector_pct}% is in ${f.largest_sector} alone. When a lot rides on a few names, good days are great and bad days hurt more.`;
}

interface PlainStat {
  label: string;
  value: string;
  plain: string;
}

function plainStats(report: RiskReport): PlainStat[] {
  const f = report.facts;
  return [
    {
      label: "Concentration",
      value: `${f.concentration_pct_top3}%`,
      plain: "share of your money in your top 3 holdings. Higher means more riding on fewer bets.",
    },
    {
      label: "Volatility",
      value: `${f.volatility_annualized_pct}%`,
      plain: "how much the value tends to swing in a year. Higher means a bumpier ride.",
    },
    {
      label: "Worst dip so far",
      value: `${f.max_drawdown_pct}%`,
      plain: "the deepest drop from a high point in this sample. Illustrative, not a prediction.",
    },
  ];
}

export function CoachView({ report }: { report: RiskReport }) {
  const { facts, explanation, disclaimer } = report;

  return (
    <div className={styles.coach}>
      {/* lands anxious -> immediate plain verdict + the gauge as support, not the star */}
      <section className={`${styles.lead} stage stage-2`}>
        <div className={styles.gaugeSmall}>
          <RiskGauge score={facts.risk_score} band={facts.risk_band} />
        </div>
        <div>
          <div className="caption">Your read right now</div>
          <h1 className={styles.verdict} style={{ color: riskVar(facts.risk_band) }}>
            {verdictLine(facts.risk_band)}
          </h1>
          <p className={styles.why}>{whyLine(report)}</p>
        </div>
      </section>

      {/* one calming, honest takeaway — the reframe from the AI, in plain words */}
      <section className={`${styles.takeaway} stage stage-3`}>
        <div className="caption">What this means for you</div>
        <p>{explanation.summary}</p>
      </section>

      {/* jargon translated inline — B half-understood these before */}
      <section className={`${styles.stats} stage stage-3`}>
        {plainStats(report).map((s) => (
          <div key={s.label} className={styles.stat}>
            <div className={styles.statHead}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={`num ${styles.statValue}`} style={{ color: riskInkVar(facts.risk_band) }}>
                {s.value}
              </span>
            </div>
            <p className={styles.statPlain}>{s.plain}</p>
          </div>
        ))}
      </section>

      {/* the discipline / FOMO moment — prominent for B, not buried last */}
      <section className={`${styles.prompt} stage stage-4`}>
        <div className={styles.promptIcon} aria-hidden>
          ◆
        </div>
        <div>
          <div className={styles.promptTitle}>Before your next trade, sit with these:</div>
          <ul className={styles.questions}>
            {explanation.review_checklist.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className={styles.promptFoot}>
            No app can tell you what to buy or sell — and this one won&apos;t. The goal is a
            calmer, more deliberate you.
          </p>
        </div>
      </section>

      <footer>
        <TrustStrip source={explanation.source} holdingsCount={facts.holdings_count} />
        <p className="disclaimer" style={{ marginTop: "var(--space-3)" }}>
          {disclaimer}
        </p>
      </footer>
    </div>
  );
}
