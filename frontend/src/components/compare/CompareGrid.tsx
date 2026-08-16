// Side-by-side instrument comparison. Pure presentation over resolved reports.
// Each metric row tints the WORST value warm and the BEST cool so the eye can
// scan one metric across all tickers. "Worse" direction per metric:
//   volatility — higher is worse;  drawdown — more negative (smaller) is worse;
//   beta — higher absolute beta is worse (more market-amplified).
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { riskVar } from "@/lib/risk-color";
import type { TickerReport } from "@/lib/types";

import styles from "./compare.module.css";

type MetricKey = "vol" | "dd" | "beta";

// Returns the "worse" score for a metric value — higher = worse, for tinting.
function worseScore(key: MetricKey, r: TickerReport): number {
  if (key === "vol") return r.facts.volatility_annualized_pct;
  if (key === "dd") return -r.facts.max_drawdown_pct; // dd is <=0; deeper = larger positive
  return Math.abs(r.facts.beta);
}

// Tint class for a cell: warm if it's the worst across reports, cool if best.
// Only tints when there's a real spread (>1 report and max !== min).
function tintStyle(key: MetricKey, r: TickerReport, reports: TickerReport[]): React.CSSProperties {
  if (reports.length < 2) return {};
  const scores = reports.map((x) => worseScore(key, x));
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  if (max === min) return {};
  const me = worseScore(key, r);
  if (me === max) return { background: "var(--risk-high-soft)" };
  if (me === min) return { background: "var(--risk-low-soft)" };
  return {};
}

// Inline bar width (0-100) for a metric cell — normalized to the row's
// largest "worse" magnitude across compared tickers. Reuses worseScore so
// the longest bar always lines up with the tinted, highest-risk cell.
function barWidth(key: MetricKey, r: TickerReport, reports: TickerReport[]): number {
  if (reports.length === 0) return 0;
  const max = Math.max(...reports.map((x) => worseScore(key, x)));
  if (max <= 0) return 0;
  return Math.max(0, (worseScore(key, r) / max) * 100);
}

// Decorative-only inline bar beneath a metric row; the number in the row
// above remains the accessible source of truth.
function MetricBar({ pct }: { pct: number }) {
  return (
    <span className={styles.bar} aria-hidden>
      <span className={styles.barFill} style={{ width: `${pct}%` }} />
    </span>
  );
}

export function CompareGrid({ reports }: { reports: TickerReport[] }) {
  const cols = Math.max(1, reports.length);
  return (
    <div className={styles.grid} style={{ ["--cols" as string]: cols }}>
      {reports.map((r) => (
        <div key={r.ticker} className={`glass ${styles.col}`}>
          <div className={`num ${styles.ticker}`} style={{ color: riskVar(r.facts.risk_band) }}>
            {r.ticker}
          </div>
          <RiskGauge score={r.facts.risk_score} band={r.facts.risk_band} size={170} />
          <ul className={styles.facts}>
            <li className={styles.fact} style={tintStyle("vol", r, reports)}>
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Volatility</span>
                <span className="num">{r.facts.volatility_annualized_pct}%</span>
              </div>
              <MetricBar pct={barWidth("vol", r, reports)} />
            </li>
            <li className={styles.fact} style={tintStyle("dd", r, reports)}>
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Worst drawdown</span>
                <span className="num">{r.facts.max_drawdown_pct}%</span>
              </div>
              <MetricBar pct={barWidth("dd", r, reports)} />
            </li>
            <li className={styles.fact} style={tintStyle("beta", r, reports)}>
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Beta</span>
                <span className="num">{r.facts.beta.toFixed(2)}</span>
              </div>
              <MetricBar pct={barWidth("beta", r, reports)} />
            </li>
            <li className={styles.fact}>
              <div className={styles.factRow}>
                <span className={styles.factLabel}>Sector</span>
                <span>{r.facts.sector}</span>
              </div>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}
