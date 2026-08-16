import styles from "./distribution-strip.module.css";

// Where this ticker sits in the universe: a band from calm to wild with a
// marker at its percentile. Reads in one glance what a sentence had to say.
export function DistributionStrip({ percentile }: { percentile: number }) {
  const clamped = Math.max(0, Math.min(100, percentile));
  return (
    <div
      className={styles.strip}
      role="img"
      aria-label={`More volatile than ${clamped}% of the universe`}
    >
      <span className={`caption ${styles.end}`}>calmer</span>
      <span className={styles.band}>
        <span className={styles.marker} style={{ left: `${clamped}%` }} />
      </span>
      <span className={`caption ${styles.end}`}>wilder</span>
    </div>
  );
}
