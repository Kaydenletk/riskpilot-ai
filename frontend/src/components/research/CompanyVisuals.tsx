import { useId, useRef, useState } from "react";
import type { ResearchCompany } from "@/lib/research/corpus";
import {
  financialSummary,
  formatBillions,
  percentOf,
  type FinancialSnapshot,
} from "@/lib/research/financials";
import {
  buildMetricSource,
  type MetricSource,
  type MetricTarget,
} from "@/lib/research/metric-source";
import { MetricSourceDialog } from "./MetricSourceDialog";
import { Icon } from "./Icon";
import styles from "./visuals.module.css";

export function CompanyVisuals({
  company,
  facts,
  onDependency,
}: {
  company: ResearchCompany;
  facts: FinancialSnapshot;
  onDependency: (categoryId: string) => void;
}) {
  const metricId = useId();
  const [metricSource, setMetricSource] = useState<MetricSource | null>(null);
  const metricOpener = useRef<HTMLElement | null>(null);
  const openMetric = (target: MetricTarget, opener: HTMLElement) => {
    metricOpener.current = opener;
    setMetricSource(buildMetricSource(company, target));
  };
  const closeMetric = () => {
    const opener = metricOpener.current;
    setMetricSource(null);
    requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus();
    });
  };
  const summary = financialSummary(facts);
  const [selectedId, setSelectedId] = useState(summary.largest.id);
  const selected =
    facts.revenueMix.find((item) => item.id === selectedId) ?? summary.largest;
  const share = percentOf(selected.amount, summary.revenue);
  const growth = `${summary.growth >= 0 ? "+" : ""}${summary.growth.toFixed(1)}%`;
  const chartMax =
    Math.ceil(
      Math.max(...facts.revenueHistory.map((row) => row.amount)) / 50000,
    ) * 50000;
  const latestSource = company.evidence[0];
  return (
    <section
      className={styles.visuals}
      aria-label={`${company.name} visual overview`}
    >
      <header className={styles.overviewHeader}>
        <div>
          <span className={styles.eyebrow}>
            START HERE · THE BUSINESS AT A GLANCE
          </span>
          <h3>{company.name}, by the numbers.</h3>
        </div>
        <span className={styles.period}>FY{summary.year} · historical</span>
      </header>

      <div className={styles.metricGrid}>
        <article className={styles.metric}>
          <div className={styles.metricLabel}>
            <Icon name="layers" size={16} />
            Annual sales
          </div>
          <button
            type="button"
            className={styles.metricSourceValue}
            aria-label="Source for annual sales"
            aria-describedby={`${metricId}-sales`}
            onClick={(event) => openMetric({ kind: "sales" }, event.currentTarget)}
          >
            <strong id={`${metricId}-sales`}>
              {formatBillions(summary.revenue)}
            </strong>
            <span>
              View source <Icon name="external" size={12} />
            </span>
          </button>
          <p>
            {(summary.revenue / 1000).toFixed(1)} billion US dollars earned in
            sales
          </p>
        </article>
        <article className={styles.metric}>
          <div className={styles.metricLabel}>
            <Icon name="arrow" size={16} />
            Sales vs. last year
          </div>
          <button
            type="button"
            className={styles.metricSourceValue}
            aria-label="Source for sales growth"
            aria-describedby={`${metricId}-growth`}
            onClick={(event) => openMetric({ kind: "growth" }, event.currentTarget)}
          >
            <strong
              id={`${metricId}-growth`}
              className={summary.growth < 0 ? styles.negative : undefined}
            >
              {growth}
            </strong>
            <span>
              View calculation <Icon name="external" size={12} />
            </span>
          </button>
          <p>
            From {formatBillions(facts.revenueHistory.at(-2)!.amount)} to{" "}
            {formatBillions(summary.revenue)}
          </p>
        </article>
        <article className={styles.metric}>
          <div className={styles.metricLabel}>
            <Icon name="book" size={16} />
            Profit per $100 of sales
          </div>
          <button
            type="button"
            className={styles.metricSourceValue}
            aria-label="Source for profit per $100"
            aria-describedby={`${metricId}-profit`}
            onClick={(event) => openMetric({ kind: "profit" }, event.currentTarget)}
          >
            <strong
              id={`${metricId}-profit`}
              className={summary.profitPer100 < 0 ? styles.negative : undefined}
            >
              ${Math.abs(summary.profitPer100).toFixed(1)}
              <small>{summary.profitPer100 < 0 ? "lost" : "kept"}</small>
            </strong>
            <span>
              View calculation <Icon name="external" size={12} />
            </span>
          </button>
          <div className={styles.profitTrack} aria-hidden="true">
            <span
              style={{
                width: `${Math.min(100, Math.max(0, summary.profitPer100))}%`,
              }}
            />
          </div>
          <p>
            Net {summary.profitPer100 < 0 ? "loss" : "profit"} after expenses
            and taxes · not investor returns
          </p>
        </article>
      </div>

      <div className={styles.chartGrid}>
        <article className={styles.chartCard}>
          <header className={styles.cardHeader}>
            <span className={styles.step}>01</span>
            <div>
              <h4>Where does the money come from?</h4>
              <p>Each color is one part of annual sales.</p>
            </div>
          </header>
          <div className={styles.shareHeadline}>
            <button
              className={styles.shareValueButton}
              aria-label={`Explore dependencies: ${selected.label}`}
              onClick={() => onDependency(selected.id)}
            >
              <strong id={`${metricId}-share`}>
                {Math.round(share)}
                <span>%</span>
              </strong>
              <small>
                Explore dependencies <Icon name="arrow" size={12} />
              </small>
            </button>
            <div>
              <b>{selected.label}</b>
              <span>About ${Math.round(share)} of every $100 in sales</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.metricSourceLink}
            aria-label={`Source for ${selected.label} revenue share`}
            aria-describedby={`${metricId}-share`}
            onClick={(event) =>
              openMetric(
                { kind: "share", categoryId: selected.id },
                event.currentTarget,
              )
            }
          >
            View share calculation <Icon name="external" size={12} />
          </button>
          <div
            className={styles.stackedBar}
            role="group"
            aria-label="Revenue dependency triggers"
          >
            {facts.revenueMix.map((item, index) => (
              <button
                key={item.id}
                aria-label={`Open ${item.label} dependency map`}
                onClick={() => {
                  setSelectedId(item.id);
                  onDependency(item.id);
                }}
                className={styles[`series${index}`]}
                style={{
                  width: `${percentOf(item.amount, summary.revenue)}%`,
                  opacity: item.id === selected.id ? 1 : 0.45,
                }}
              />
            ))}
          </div>
          <div
            className={styles.mixLegend}
            role="group"
            aria-label="Explore revenue sources"
          >
            {facts.revenueMix.map((item, index) => (
              <button
                key={item.id}
                aria-pressed={selected.id === item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  onDependency(item.id);
                }}
              >
                <span
                  className={`${styles.swatch} ${styles[`series${index}`]}`}
                  aria-hidden="true"
                />
                <span>
                  {item.label}
                  <small>{formatBillions(item.amount)}</small>
                </span>
                <strong>
                  {percentOf(item.amount, summary.revenue).toFixed(1)}%
                </strong>
              </button>
            ))}
          </div>
          <p className={styles.chartTakeaway} aria-live="polite">
            <Icon name="layers" size={16} />
            <span>{selected.explanation}</span>
          </p>
          <small className={styles.chartFootnote}>
            Revenue share shows business dependence, not the chance of losing
            money.
          </small>
        </article>

        <article className={styles.chartCard}>
          <header className={styles.cardHeader}>
            <span className={styles.step}>02</span>
            <div>
              <h4>Are sales getting bigger?</h4>
              <p>Annual revenue · billions of US dollars</p>
            </div>
          </header>
          <div className={styles.trendHeadline}>
            <strong
              className={summary.growth < 0 ? styles.negative : undefined}
            >
              {growth}
            </strong>
            <span>
              FY{summary.year - 1} → FY{summary.year}
            </span>
          </div>
          <svg
            viewBox="0 0 400 200"
            className={styles.revenueChart}
            role="img"
            aria-labelledby={`revenue-title-${company.symbol} revenue-desc-${company.symbol}`}
          >
            <title id={`revenue-title-${company.symbol}`}>
              {`${company.name} annual revenue, FY${facts.revenueHistory[0].year}–FY${summary.year}`}
            </title>
            <desc id={`revenue-desc-${company.symbol}`}>
              {`${facts.revenueHistory.map((row) => `FY${row.year}: ${formatBillions(row.amount)}`).join("; ")}. Bars start at zero. These are company sales, not the stock price.`}
            </desc>
            {[0, chartMax / 2, chartMax].map((amount) => {
              const y = 158 - (amount / chartMax) * 118;
              return (
                <g key={amount}>
                  <line
                    x1="40"
                    x2="390"
                    y1={y}
                    y2={y}
                    className={styles.gridLine}
                  />
                  <text
                    x="30"
                    y={y + 4}
                    textAnchor="end"
                    className={styles.axisLabel}
                  >
                    {amount / 1000}
                  </text>
                </g>
              );
            })}
            {facts.revenueHistory.map((row, index) => {
              const height = (row.amount / chartMax) * 118;
              const x = 68 + index * 114;
              return (
                <g key={row.year}>
                  <rect
                    x={x}
                    y={158 - height}
                    width="62"
                    height={height}
                    rx="5"
                    className={
                      index === facts.revenueHistory.length - 1
                        ? styles.latestBar
                        : styles.pastBar
                    }
                  />
                  <text
                    x={x + 31}
                    y={148 - height}
                    textAnchor="middle"
                    className={styles.barValue}
                  >
                    {formatBillions(row.amount)}
                  </text>
                  <text
                    x={x + 31}
                    y="184"
                    textAnchor="middle"
                    className={styles.axisLabel}
                  >
                    FY{row.year}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className={styles.chartTakeaway}>
            <Icon name="arrow" size={16} />
            <span>
              {summary.growth >= 0 ? "Sales grew" : "Sales fell"}{" "}
              {Math.abs(summary.growth).toFixed(1)}% from the previous fiscal
              year.
            </span>
          </p>
          <small className={styles.chartFootnote}>
            Company revenue, not stock performance or a forecast.
          </small>
        </article>
      </div>

      <details className={styles.dataDetails}>
        <summary>
          <Icon name="book" size={15} />
          Source, dates & exact figures
          <Icon name="chevron" size={14} />
        </summary>
        <div className={styles.dataBody}>
          <p>
            {company.source} · {latestSource.period} · published{" "}
            {latestSource.filed}.
          </p>
          <p>
            {facts.sourceSection}. All exact amounts below are in millions of US
            dollars. Percentages are calculated from unrounded figures and
            rounded for display.
          </p>
          <a href={latestSource.url} target="_blank" rel="noopener noreferrer">
            Open original annual report <Icon name="external" size={14} />
          </a>
          <table>
            <caption>Revenue history</caption>
            <thead>
              <tr>
                <th scope="col">Fiscal year</th>
                <th scope="col">Revenue (USD millions)</th>
              </tr>
            </thead>
            <tbody>
              {facts.revenueHistory.map((row) => (
                <tr key={row.year}>
                  <th scope="row">FY{row.year}</th>
                  <td>{row.amount.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table>
            <caption>FY{summary.year} revenue breakdown</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Revenue (USD millions)</th>
              </tr>
            </thead>
            <tbody>
              {facts.revenueMix.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.label}</th>
                  <td>{row.amount.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            FY{summary.year} net income:{" "}
            {facts.netIncome.toLocaleString("en-US")} million USD. Profit per
            $100 = net income ÷ annual revenue × 100. “Other” groups the
            categories described above.
          </p>
          <p>
            FY means fiscal year; year-end dates differ between companies. These
            are selected historical figures, not live market data.
          </p>
        </div>
      </details>
      {metricSource && (
        <MetricSourceDialog pin={metricSource} onClose={closeMetric} />
      )}
    </section>
  );
}
