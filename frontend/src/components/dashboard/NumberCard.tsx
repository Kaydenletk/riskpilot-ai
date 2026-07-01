import { Sparkline } from "@/components/ticker/Sparkline";

import styles from "./number-card.module.css";

interface NumberCardProps {
  label: string;
  value: string;
  spark?: number[];
  sparkScore?: number;
}

// Number-first card: the figure is the headline, the label demoted to caption,
// an optional in-cell sparkline carries trend without prose.
export function NumberCard({ label, value, spark, sparkScore = 50 }: NumberCardProps) {
  return (
    <div className={styles.card}>
      <div className={`num ${styles.value}`}>{value}</div>
      <div className="caption">{label}</div>
      {spark && spark.length > 1 && (
        <div className={styles.spark}>
          <Sparkline values={spark} score={sparkScore} width={220} height={40} />
        </div>
      )}
    </div>
  );
}
