// Goal-fit read: how the CURRENT mix lines up with the STATED goal, drawn as
// pictures (orientation split bar + goal-sector context bars). Every number is
// an engine fact from report.goal_fit — nothing is computed here (mirror of
// the SectorBars discipline). Educational framing only, never a buy list.
import {
  FIT_BAND_LABELS,
  fitBandInkVar,
  fitBandVar,
  GOAL_LABELS,
  orientationSplit,
  suggestionsHeading,
} from "@/lib/goal-fit";
import type { GoalFit } from "@/lib/types";

import styles from "./goal-fit-panel.module.css";

export function GoalFitPanel({ goalFit }: { goalFit: GoalFit }) {
  const split = orientationSplit(goalFit);
  const heading = suggestionsHeading(goalFit.goal);

  return (
    <section
      className={`glass ${styles.panel} stage stage-3`}
      aria-label={`Goal fit for your ${GOAL_LABELS[goalFit.goal].toLowerCase()} portfolio`}
    >
      <div className={styles.head}>
        <span className="caption">Goal fit · {GOAL_LABELS[goalFit.goal]} portfolio</span>
        <span
          className={`num ${styles.bandPill}`}
          style={{ color: fitBandInkVar(goalFit.fit_band) }}
        >
          <span
            className={styles.bandDot}
            style={{ background: fitBandVar(goalFit.fit_band) }}
            aria-hidden
          />
          {goalFit.fit_score}/100 · {FIT_BAND_LABELS[goalFit.fit_band]}
        </span>
      </div>

      {/* the picture: one stacked bar, income share vs growth share. Only the
          track is role="img" — the legend below carries real text (including
          the yield proxy) that must stay exposed to assistive tech. */}
      <div className={styles.split}>
        <div
          className={styles.splitTrack}
          role="img"
          aria-label={`${goalFit.income_orientation_pct}% of the portfolio sits in income-oriented sectors, ${goalFit.growth_orientation_pct}% in growth-oriented sectors`}
        >
          <span className={styles.splitIncome} style={{ width: `${split.incomePct}%` }} />
          <span className={styles.splitGrowth} style={{ width: `${split.growthPct}%` }} />
        </div>
        <div className={styles.splitLegend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotIncome}`} aria-hidden />
            Income-oriented <strong className="num">{goalFit.income_orientation_pct}%</strong>
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotGrowth}`} aria-hidden />
            Growth-oriented <strong className="num">{goalFit.growth_orientation_pct}%</strong>
          </span>
          <span className={`${styles.legendItem} ${styles.yieldProxy}`}>
            Illustrative yield proxy{" "}
            <strong className="num">~{goalFit.income_yield_proxy_pct}%</strong>
          </span>
        </div>
      </div>

      {/* Engine contract: sector_suggestions is empty for the "balanced" goal
          (goal.py _suggestions_for), which is also the only goal with an empty
          heading — the two gates must stay in step. */}
      {goalFit.sector_suggestions.length > 0 && heading && (
        <div className={styles.suggestions}>
          <div className={`caption ${styles.suggestionsHead}`}>{heading}</div>
          <ul className={styles.sectorList}>
            {goalFit.sector_suggestions.map((s) => (
              <li key={s.sector} className={styles.sectorRow}>
                <span className={`caption ${styles.sectorName}`}>{s.sector}</span>
                <span className={styles.sectorTrack}>
                  <span className={styles.sectorFill} style={{ width: `${s.current_pct}%` }} />
                </span>
                <span className={`num ${styles.sectorPct}`}>{s.current_pct}% now</span>
                <span className={`num ${styles.sectorYield}`}>
                  ~{s.typical_yield_pct}% typical yield
                </span>
                <span className={`caption ${styles.examples}`}>
                  e.g. {s.example_tickers.join(" · ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="disclaimer">
            Sector context is educational — typical yields are illustrative proxies over the
            synthetic demo universe, not live market data, and nothing here is a
            recommendation to buy or sell.
          </p>
        </div>
      )}
    </section>
  );
}
