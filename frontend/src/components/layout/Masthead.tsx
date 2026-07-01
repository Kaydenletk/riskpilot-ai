import Link from "next/link";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

import styles from "@/app/page.module.css";

export function Masthead({ caption }: { caption: string }) {
  return (
    <header className={`${styles.masthead} stage stage-1`}>
      <Link href="/" className={styles.brand} style={{ textDecoration: "none" }}>
        RiskPilot<span className={styles.brandAccent}>AI</span>
      </Link>
      <div className={styles.mastheadRight}>
        <Link href="/analyze" className="caption">Analyze your portfolio →</Link>
        <span className="caption">{caption}</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
