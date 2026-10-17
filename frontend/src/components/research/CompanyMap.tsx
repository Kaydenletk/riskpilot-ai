import type { ResearchCompany, EvidenceNote } from "@/lib/research/corpus";
import type { Notebook } from "@/lib/research/notebook";
import { Icon } from "./Icon";
import styles from "./research.module.css";
import { SourceSearch } from "./SourceSearch";
import { CompanyVisuals } from "./CompanyVisuals";

export function CompanyMap({
  company,
  notebook,
  explore,
  liveAiAvailable,
  onUnderstand,
  onDependency,
}: {
  company: ResearchCompany;
  notebook: Notebook;
  explore: (note: EvidenceNote) => void;
  liveAiAvailable: boolean;
  onUnderstand: () => void;
  onDependency: (categoryId: string) => void;
}) {
  return (
    <>
      {company.financials && (
        <CompanyVisuals
          key={`visuals-${company.symbol}`}
          company={company}
          facts={company.financials}
          onDependency={onDependency}
        />
      )}
      <section className={styles.businessCard}>
        <div className={styles.cardEyebrow}>
          <Icon name="grid" size={15} />
          HOW THE BUSINESS WORKS
        </div>
        <h3>How does {company.name} make money?</h3>
        <p>{company.description}</p>
        <button
          className={styles.primaryButton}
          aria-label={`Explore evidence: ${company.evidence[0].title}`}
          onClick={() => explore(company.evidence[0])}
        >
          Read the business overview <Icon name="arrow" size={16} />
        </button>
      </section>
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>THEN EXPLORE</span>
          <h3>Growth and risks</h3>
        </div>
        <span>Select a topic to read its source</span>
      </div>
      <div className={styles.topicGrid}>
        {company.evidence.slice(1).map((note) => (
          <button
            key={note.id}
            className={styles.topicCard}
            aria-label={`Explore evidence: ${note.title}`}
            onClick={() => explore(note)}
          >
            <div className={styles.topicTop}>
              <span
                className={
                  note.topic === "growth" ? styles.growthIcon : styles.riskIcon
                }
              >
                <Icon
                  name={note.topic === "growth" ? "leaf" : "shield"}
                  size={18}
                />
              </span>
              <span>{note.topic === "growth" ? "GROWTH" : "RISK"}</span>
              {notebook.exploredIds.includes(note.id) && (
                <Icon name="check" size={14} />
              )}
            </div>
            <h4>{note.title}</h4>
            <p>{note.question}</p>
            <span className={styles.topicBottom}>
              Read source <Icon name="arrow" size={16} />
            </span>
          </button>
        ))}
      </div>
      <SourceSearch
        key={company.symbol}
        company={company}
        explore={explore}
        liveAiAvailable={liveAiAvailable}
      />
      <section className={styles.nextStep}>
        <span>
          <Icon name="spark" size={21} />
        </span>
        <div>
          <h3>Next: write what you learned</h3>
          <p>
            Keep notes about the business, its risks and your open questions.
          </p>
        </div>
        <button onClick={() => onUnderstand()}>
          Write my notes
          <Icon name="arrow" size={16} />
        </button>
      </section>
    </>
  );
}
