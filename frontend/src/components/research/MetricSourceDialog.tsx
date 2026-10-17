import { useEffect, useId, useRef } from "react";
import type { CSSProperties } from "react";
import type { MetricSource } from "@/lib/research/metric-source";
import { Icon } from "./Icon";
import styles from "./decision.module.css";

const tableStyle: CSSProperties = {
  width: "100%",
  marginTop: 16,
  borderCollapse: "collapse",
  textAlign: "left",
};

const cellStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid var(--rp-line)",
};

export function MetricSourceDialog({
  pin,
  onClose,
}: {
  pin: MetricSource;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.drawer}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.drawerContent}>
        <header className={styles.drawerHeader}>
          <span className={styles.eyebrow}>METRIC SOURCE · {pin.symbol}</span>
          <button aria-label="Close metric source" onClick={onClose}>
            <Icon name="close" />
            Close
          </button>
        </header>

        <h2 id={titleId}>{pin.title}</h2>
        <div className={styles.revenuePill}>
          <strong>{pin.display}</strong>
          <span>
            {pin.basis === "derived"
              ? "App calculation from reported inputs"
              : "Reported annual figure; display converted to billions"}
          </span>
        </div>

        <section className={styles.drawerSection} aria-labelledby={`${titleId}-inputs`}>
          <h3 id={`${titleId}-inputs`}>Inputs used for this number</h3>
          <p className={styles.muted}>
            Transcribed reported figures, not the original document layout.
            Highlighted rows are the inputs used above. Amounts are in millions
            of US dollars.
          </p>
          <table style={tableStyle}>
            <caption style={{ textAlign: "left" }}>Reported inputs</caption>
            <thead>
              <tr>
                <th scope="col" style={cellStyle}>Reported item</th>
                <th scope="col" style={cellStyle}>Fiscal year</th>
                <th scope="col" style={cellStyle}>USD millions</th>
              </tr>
            </thead>
            <tbody>
              {pin.rows.map((row) => (
                <tr key={row.id} style={{ background: "var(--rp-soft)" }}>
                  <th scope="row" style={cellStyle}>{row.label}</th>
                  <td style={cellStyle}>{row.year}</td>
                  <td style={{ ...cellStyle, fontVariantNumeric: "tabular-nums" }}>
                    {row.amount.toLocaleString("en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.drawerSection} aria-labelledby={`${titleId}-calculation`}>
          <h3 id={`${titleId}-calculation`}>
            {pin.basis === "derived"
              ? "How the app calculates it"
              : "How the app formats it"}
          </h3>
          <p style={{ overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>
            {pin.formula}
          </p>
          <p className={styles.muted}>
            Inputs are used before rounding. Profit per $100 of sales describes
            company income; it is not an investor return.
          </p>
        </section>

        <section className={styles.drawerSection} aria-labelledby={`${titleId}-report`}>
          <h3 id={`${titleId}-report`}>Original report</h3>
          <p>{pin.source.report}</p>
          <p>
            {pin.source.period} · Published {pin.source.published}
          </p>
          <p className={styles.muted}>{pin.source.section}</p>
          <a
            href={pin.source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original annual report <Icon name="external" size={14} />
          </a>
        </section>

        <p className={styles.footnote}>Catalogue version: {pin.corpusVersion}</p>
      </div>
    </dialog>
  );
}
