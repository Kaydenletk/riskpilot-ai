import { SectorBars } from "@/components/charts/SectorBars";
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { riskInkVar } from "@/lib/risk-color";
import { buildVerdict } from "@/lib/verdict";
import type { RiskReport } from "@/lib/types";

import styles from "./hero-xray.module.css";

// The product IS the hero visual: live sample report in a glass card.
// Composition: caption → full-width verdict (band-colored, the headline of the
// card) → hairline → gauge beside sector bars. The verdict never fights the
// gauge for a half-column.
export function HeroXray({ report }: { report: RiskReport }) {
  return (
    <aside className={`glass ${styles.card}`} aria-label="Live sample risk X-Ray">
      <div className="caption">Sample portfolio · live from the engine</div>
      <p className={styles.verdict} style={{ color: riskInkVar(report.facts.risk_band) }}>
        {buildVerdict(report.facts)}
      </p>
      <div className={styles.data}>
        <div className={styles.gauge}>
          <RiskGauge score={report.facts.risk_score} band={report.facts.risk_band} size={120} />
        </div>
        <div className={styles.bars}>
          <SectorBars holdings={report.holdings} />
        </div>
      </div>
    </aside>
  );
}
