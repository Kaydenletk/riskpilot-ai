import { companies, type ResearchCompany } from "@/lib/research/corpus";
import type { Notebooks } from "@/lib/research/notebook";
import { Icon } from "./Icon";
import styles from "./research.module.css";

export function ResearchSidebar({
  view,
  symbol,
  notebooks,
  selectCompany,
  setView,
}: {
  view: string;
  symbol: string;
  notebooks: Notebooks;
  selectCompany: (company: ResearchCompany) => void;
  setView: (view: "map" | "journal" | "sources") => void;
}) {
  return (
    <aside className={styles.sidebar} aria-label="Workspace navigation">
      <a href="/" className={styles.brand}>
        <span className={styles.brandIcon}>
          <Icon name="compass" size={25} />
        </span>
        RiskPilot<span className={styles.brandDot}>.</span>
      </a>
      <span className={styles.brandCaption}>
        Company research, made clearer
      </span>
      <div className={styles.sectionLabel}>CHOOSE A COMPANY</div>
      <div className={styles.companyList}>
        {companies.map((item) => (
          <button
            key={item.symbol}
            aria-label={`${item.name} ${item.symbol}`}
            aria-pressed={symbol === item.symbol}
            className={`${styles.companyItem} ${symbol === item.symbol ? styles.companyActive : ""}`}
            onClick={() => selectCompany(item)}
          >
            <span
              className={styles.smallMonogram}
              style={{ color: item.color }}
            >
              {item.monogram}
            </span>
            <span>
              {item.name}
              <small>{item.symbol}</small>
            </span>
            {symbol === item.symbol && <span className={styles.activeDot} />}
          </button>
        ))}
      </div>
      <div className={styles.sideDivider} />
      <nav className={styles.nav} aria-label="Reference and history">
        <button
          aria-label="History"
          aria-current={view === "journal" ? "page" : undefined}
          className={`${styles.navItem} ${view === "journal" ? styles.navActive : ""}`}
          onClick={() => setView("journal")}
        >
          <Icon name="clock" />
          History
          <span className={styles.navCount}>
            {notebooks[symbol]?.snapshots.length ?? 0}
          </span>
        </button>
        <button
          aria-current={view === "sources" ? "page" : undefined}
          className={`${styles.navItem} ${view === "sources" ? styles.navActive : ""}`}
          onClick={() => setView("sources")}
        >
          <Icon name="layers" />
          All documents
        </button>
      </nav>
      <div className={styles.sideBottom}>
        <div className={styles.sideProfile}>
          <Icon name="book" size={18} />
          <span>
            Your notes<small>Stored on this browser</small>
          </span>
        </div>
      </div>
    </aside>
  );
}
