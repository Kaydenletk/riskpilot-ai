import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { SectorBars } from "@/components/charts/SectorBars";
import { buildVerdict } from "@/lib/verdict";
import type { RiskReport } from "@/lib/types";

import styles from "./hero-xray.module.css";

// The product IS the hero visual: live sample report in a glass card.
export function HeroXray({ report }: { report: RiskReport }) {
  return (
    <aside className={`glass ${styles.card}`} aria-label="Live sample risk X-Ray">
      <div className="caption">Sample portfolio · live from the engine</div>
      <div className={styles.top}>
        <div className={styles.gauge}>
          <RiskGauge score={report.facts.risk_score} band={report.facts.risk_band} size={150} />
        </div>
        <p className={styles.verdict}>{buildVerdict(report.facts)}</p>
      </div>
      <SectorBars holdings={report.holdings} />
    </aside>
  );
}
