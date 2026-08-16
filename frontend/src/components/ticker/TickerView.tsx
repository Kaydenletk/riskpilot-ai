// The single-ticker risk read. Reuses the dashboard's gauge + grounded-text so
// the design system stays coherent. Two clearly-separated data stories:
//   1. PRIMARY — the synthetic scored series (gauge, facts, sparkline). One
//      source of truth: the sparkline IS the series the score is computed from.
//   2. SECONDARY — TradingView live context, badged + framed apart.
import Link from "next/link";

import { GroundedText } from "@/components/dashboard/GroundedText";
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import type { TickerReport } from "@/lib/types";

import { LiveContextPanel } from "./LiveContextPanel";
import { Sparkline } from "./Sparkline";
import styles from "./ticker-view.module.css";

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n}`;
}

// Prefill for the "size it in a portfolio" deep link: the ticker at a deliberately
// concentrated 40% beside two nearest-vol peers — the resulting report demonstrates
// the concentration coaching immediately.
function sizingHref(ticker: string, peers: string[]): string {
  const [a, b] = peers;
  if (!a || !b) return "/analyze";
  return `/analyze?p=${ticker}:40,${a}:30,${b}:30`;
}

export function TickerView({ report }: { report: TickerReport }) {
  const { ticker, facts, spark, explanation, disclaimer, context } = report;

  const stats = [
    { label: "Volatility (annualized)", value: `${facts.volatility_annualized_pct}%` },
    { label: "Worst drawdown (sample)", value: `${facts.max_drawdown_pct}%` },
    { label: "Beta vs. market", value: signed(facts.beta).replace("+", "") },
    { label: "Sector", value: facts.sector, plain: true },
  ];

  return (
    <div className={styles.wrap}>
      <nav className={`${styles.crumb} stage stage-1`}>
        <Link href="/">← Portfolio X-Ray</Link>
        <span className="caption">single-instrument read</span>
      </nav>

      <header className={`${styles.header} stage stage-1`}>
        <div>
          <h1 className={`num ${styles.ticker}`}>{ticker}</h1>
          <div className="caption">{facts.sector} · synthetic illustrative data</div>
        </div>
      </header>

      <section className={`${styles.primary} stage stage-2`}>
        <div className={styles.gaugeCol}>
          <RiskGauge score={facts.risk_score} band={facts.risk_band} />
        </div>

        <div className={styles.factsCol}>
          <dl className={styles.stats}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <dt className="caption">{s.label}</dt>
                <dd className={s.plain ? styles.statPlain : `num ${styles.statNum}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={`${styles.chartCard} stage stage-3`} aria-labelledby="scored-series-h">
        <header className={styles.chartHead}>
          <h2 id="scored-series-h" className={`caption ${styles.chartTitle}`}>
            Scored price path
          </h2>
          <span className="caption">the exact series the score is computed from</span>
        </header>
        <Sparkline values={spark} score={facts.risk_score} />
      </section>

      {context && (
        <section className={`${styles.context} stage stage-3`} aria-labelledby="context-h">
          <h2 id="context-h" className={`caption ${styles.contextTitle}`}>
            In context
          </h2>
          <dl className={styles.contextGrid}>
            <div className={styles.contextCell}>
              <dt className="caption">Volatility vs {context.sector}</dt>
              <dd className="num">
                {facts.volatility_annualized_pct}%{" "}
                <span className={styles.contextRef}>vs {context.sector_median_volatility_pct}% median</span>
              </dd>
            </div>
            <div className={styles.contextCell}>
              <dt className="caption">Beta vs sector</dt>
              <dd className="num">
                {facts.beta}{" "}
                <span className={styles.contextRef}>vs {context.sector_median_beta} median</span>
              </dd>
            </div>
            <div className={styles.contextCell}>
              <dt className="caption">Universe rank</dt>
              <dd className="num">
                more volatile than {context.universe_volatility_percentile}%{" "}
                <span className={styles.contextRef}>of {""}the universe</span>
              </dd>
            </div>
          </dl>
          {context.peers.length > 0 && (
            <div className={styles.peersRow}>
              <span className="caption">Closest {context.sector} peers:</span>
              {context.peers.map((p) => (
                <Link key={p} href={`/ticker/${p}`} className={`num ${styles.peerChip}`}>
                  {p}
                </Link>
              ))}
              <Link
                href={`/compare?t=${[ticker, ...context.peers.slice(0, 3)].join(",")}`}
                className={styles.contextAction}
              >
                Compare side by side →
              </Link>
              <Link href={sizingHref(ticker, context.peers)} className={styles.contextAction}>
                Size it in a portfolio →
              </Link>
            </div>
          )}
        </section>
      )}

      <section className={`${styles.read} stage stage-3`} aria-labelledby="read-h">
        <h2 id="read-h" className={`caption ${styles.readTitle}`}>
          The read
        </h2>
        <p className={styles.summary}>
          <GroundedText text={explanation.summary} />
        </p>

        <h3 className={`caption ${styles.subhead}`}>A few things worth checking</h3>
        <ul className={styles.checklist}>
          {explanation.review_checklist.map((q, i) => (
            <li key={i}>
              <GroundedText text={q} />
            </li>
          ))}
        </ul>
      </section>

      <LiveContextPanel ticker={ticker} />

      <p className={`disclaimer ${styles.disclaimer}`}>{disclaimer}</p>
    </div>
  );
}
