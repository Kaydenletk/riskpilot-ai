import type { ResearchCompany } from "@/lib/research/corpus";
import type {
  Notebook,
  RiskAssessment,
  RiskStance,
} from "@/lib/research/notebook";
import { corpusVersion } from "@/lib/research/corpus";
import {
  exportRiskMemo,
  stanceHelp,
  stanceLabels,
} from "@/lib/research/risk-memo";
import { Icon } from "./Icon";
import styles from "./decision.module.css";

export function RiskMemo({
  company,
  assessments,
  onChange,
  onRemove,
  onExplore,
  notebook,
}: {
  company: ResearchCompany;
  assessments: Record<string, RiskAssessment>;
  onChange?: (
    id: string,
    patch: { stance?: RiskStance; reason?: string },
  ) => void;
  onRemove?: (id: string) => void;
  onExplore?: () => void;
  notebook?: Notebook;
}) {
  const entries = Object.entries(assessments);
  function download() {
    if (!notebook) return;
    const url = URL.createObjectURL(
      new Blob([exportRiskMemo(company, notebook)], {
        type: "text/markdown;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `riskpilot-${company.symbol.toLowerCase()}-risk-memo.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className={styles.memo} aria-label="My risk memo">
      <header className={styles.memoHeader}>
        <div>
          <span className={styles.eyebrow}>BUILT FROM YOUR CHOICES</span>
          <h3>My risk memo</h3>
        </div>
        {notebook && (
          <button onClick={download}>
            <Icon name="download" size={15} />
            Export Markdown
          </button>
        )}
      </header>
      <p className={styles.muted}>
        Your classifications and captured source notes. Add your reason; the app
        does not decide whether a risk is acceptable for you.
      </p>
      {entries.length ? (
        <>
          <div className={styles.memoCounts}>
            {(["dealbreaker", "manageable", "blindspot"] as const).map(
              (stance) => (
                <span key={stance}>
                  <b>
                    {
                      entries.filter(([, item]) => item.stance === stance)
                        .length
                    }
                  </b>
                  {stanceLabels[stance]}
                </span>
              ),
            )}
          </div>
          {entries.map(([id, item]) => (
            <article className={styles.memoEntry} key={id}>
              <header>
                <h4>{item.source.title}</h4>
                <span>{stanceLabels[item.stance]}</span>
              </header>
              {onChange && (
                <label className={styles.stanceSelect}>
                  My classification
                  <select
                    value={item.stance}
                    onChange={(event) =>
                      onChange(id, { stance: event.target.value as RiskStance })
                    }
                  >
                    {Object.entries(stanceLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className={styles.muted}>{stanceHelp[item.stance]}</p>
              {onChange ? (
                <label className={styles.reasonLabel}>
                  Why I classified “{item.source.title}” this way
                  <textarea
                    rows={2}
                    maxLength={5000}
                    value={item.reason}
                    placeholder="What would I need to see to accept or reconsider this risk?"
                    onChange={(event) =>
                      onChange(id, { reason: event.target.value })
                    }
                  />
                </label>
              ) : (
                <p>{item.reason || "No reason recorded."}</p>
              )}
              <details>
                <summary>Captured source context</summary>
                <p>{item.source.summary}</p>
                <small>
                  {item.source.period} · {item.source.section}
                </small>
                <a
                  href={item.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open original report <Icon name="external" size={13} />
                </a>
                <p className={styles.footnote}>
                  Captured catalogue: {item.corpusVersion.slice(0, 23)}…
                  {item.corpusVersion !== corpusVersion
                    ? " · library has changed since this capture"
                    : ""}
                </p>
              </details>
              {onRemove && (
                <button
                  className={styles.removeButton}
                  onClick={() => onRemove(id)}
                >
                  Remove from memo
                </button>
              )}
            </article>
          ))}
        </>
      ) : (
        <div className={styles.memoEmpty}>
          <Icon name="shield" size={24} />
          <p>
            No risks classified yet. Open a revenue category or risk disclosure
            and choose Dealbreaker, Manageable risk or Blindspot.
          </p>
          {onExplore && (
            <button onClick={onExplore}>
              Explore dependencies <Icon name="arrow" size={15} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
