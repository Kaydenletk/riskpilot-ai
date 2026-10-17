import { Icon } from "./Icon";
import styles from "./research.module.css";
import { companies } from "@/lib/research/corpus";

export function SourceLibrary() {
  return (
    <section className={styles.viewSection}>
      <span className={styles.eyebrow}>KNOW WHAT YOU’RE READING</span>
      <h3>A small library. A clear paper trail.</h3>
      <p>
        Manually curated summaries of selected FY2025 filings. These are
        historical research materials, not the latest filings or a complete risk
        assessment.
      </p>
      <div className={styles.evidenceList}>
        {companies.map((item) => (
          <article key={item.symbol}>
            <span className={styles.topicTag}>
              {item.symbol} · {item.period}
            </span>
            <h4>{item.source}</h4>
            <p>
              {item.evidence.length} source notes · report published{" "}
              {item.evidence[0].filed}
            </p>
            <a
              className={styles.textButton}
              href={item.evidence[0].url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original document
              <Icon name="external" size={14} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
