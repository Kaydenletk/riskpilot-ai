"use client";

// SECONDARY, explicitly-separated panel: a real third-party (TradingView) live
// chart. Deliberately framed apart from the synthetic risk read above so the
// provenance is never ambiguous — the scored sparkline is OUR illustrative data;
// THIS is live market data, clearly badged. Loads client-side only.
import { useEffect, useRef } from "react";

import styles from "./live-context.module.css";

const WIDGET_SRC = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";

export function LiveContextPanel({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // clear any prior widget (symbol change / remount)
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbol: ticker.toUpperCase(),
      width: "100%",
      height: 200,
      locale: "en",
      dateRange: "12M",
      colorTheme: "light",
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [ticker]);

  return (
    <section className={`${styles.panel} stage stage-4`} aria-labelledby="live-context-h">
      <header className={styles.head}>
        <h2 id="live-context-h" className={`caption ${styles.title}`}>
          Live market context
        </h2>
        <span className={styles.badge}>LIVE · TradingView</span>
      </header>
      <p className={styles.note}>
        Real third-party market data, shown for context only. It is{" "}
        <strong>separate</strong> from the risk read above, which is computed on
        illustrative sample data.
      </p>
      <div className={styles.widget} ref={containerRef} />
      <noscript>
        <p className="disclaimer">Live chart requires JavaScript.</p>
      </noscript>
    </section>
  );
}
