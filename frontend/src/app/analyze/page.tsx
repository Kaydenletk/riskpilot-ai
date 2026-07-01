"use client";

import { useState } from "react";

import { Dashboard } from "@/components/dashboard/Dashboard";
import { Masthead } from "@/components/layout/Masthead";
import { computeBreakdown } from "@/lib/breakdown";
import { parseHoldings, type RowError } from "@/lib/parse-holdings";
import type { Holding, RiskReport } from "@/lib/types";

import styles from "./analyze.module.css";
import page from "../page.module.css";

const SAMPLE = `ticker,shares,sector,market_value
NVDA,40,Technology,3615.46
AMD,60,Technology,1223.75
MSFT,10,Technology,1612.28
KO,30,Consumer Staples,1722.63
JNJ,8,Healthcare,1248.13`;

type State =
  | { kind: "idle" }
  | { kind: "errors"; errors: RowError[] }
  | { kind: "scoring" }
  | { kind: "result"; report: RiskReport }
  | { kind: "offline"; holdings: Holding[] };

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onAnalyze() {
    const parsed = parseHoldings(text);
    if (!parsed.ok) {
      setState({ kind: "errors", errors: parsed.errors });
      return;
    }
    setState({ kind: "scoring" });
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ holdings: parsed.holdings }),
      });
      if (res.ok) {
        setState({ kind: "result", report: (await res.json()) as RiskReport });
        return;
      }
      // The server REJECTED the holdings — surface why, never the "validated" panel.
      if (res.status === 400 || res.status === 422) {
        const body = (await res.json()) as { errors?: string[]; symbols?: string[]; message?: string };
        const messages: string[] =
          body.symbols && body.symbols.length
            ? [`Not in the demo universe: ${body.symbols.join(", ")}. Only the vetted ticker list can be scored.`]
            : body.errors ?? [body.message ?? "The portfolio was rejected."];
        setState({ kind: "errors", errors: messages.map((message) => ({ row: 0, message })) });
        return;
      }
      // 503 / other engine-down status: the parse was valid, the engine is just absent.
    } catch {
      // network failure — same as engine-down: fall through to the offline panel
    }
    setState({ kind: "offline", holdings: parsed.holdings });
  }

  return (
    <div className={page.page}>
      <Masthead caption="analyze your own holdings · figures come from the engine" />

      <div className={`${styles.wrap} stage stage-2`}>
        <p className={styles.intro}>
          Paste your holdings as CSV — one row per position:{" "}
          <span className="num">ticker, shares, sector, market_value</span>. Nothing is stored.
          Risk numbers are computed by the engine, never invented here.
        </p>

        <div className={styles.box}>
          <label className={`caption ${styles.label}`} htmlFor="csv">
            Holdings CSV
          </label>
          <textarea
            id="csv"
            className={styles.textarea}
            value={text}
            spellCheck={false}
            placeholder={"NVDA,40,Technology,3615.46\nKO,30,Consumer Staples,1722.63"}
            onChange={(e) => setText(e.target.value)}
          />
          <div className={styles.row}>
            <button className={styles.btn} onClick={onAnalyze} disabled={state.kind === "scoring"}>
              {state.kind === "scoring" ? "Scoring…" : "Analyze portfolio"}
            </button>
            <button className={styles.linkBtn} onClick={() => setText(SAMPLE)}>
              load the sample
            </button>
          </div>

          {state.kind === "errors" && (
            <div className={styles.errors} role="alert">
              {state.errors.map((e, i) => (
                <p key={i} className={styles.errItem}>
                  {e.row > 0 ? `Row ${e.row}: ` : ""}
                  {e.message}
                </p>
              ))}
            </div>
          )}
        </div>

        {state.kind === "result" && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <Dashboard report={state.report} />
          </div>
        )}

        {state.kind === "offline" && <OfflinePanel holdings={state.holdings} />}
      </div>
    </div>
  );
}

function OfflinePanel({ holdings }: { holdings: Holding[] }) {
  const b = computeBreakdown(holdings);
  return (
    <section className={styles.offline}>
      <div className="caption">File validated · engine not connected</div>
      <p className={styles.intro}>
        Your {holdings.length} holdings parsed cleanly. Scoring (volatility, drawdown, risk score)
        needs the private risk engine connected — these exact allocation figures are computed
        here; the modeled risk numbers are not faked. Run the engine locally to see the full read:
      </p>
      <pre className={styles.code}>{`cp .env.example .env   # no OpenAI key needed
make install && make dev`}</pre>
      <div className="caption" style={{ marginBottom: 4 }}>Exact allocation (computed here, not modeled)</div>
      <div className={styles.breakdown}>
        <div className={styles.brow}>
          <span>Top-3 holdings weight</span>
          <span className="num">{b.concentrationTop3Pct}%</span>
        </div>
        <div className={styles.brow}>
          <span>Largest sector ({b.largestSector})</span>
          <span className="num">{b.largestSectorPct}%</span>
        </div>
        {b.sectors.map((s) => (
          <div key={s.sector} className={styles.brow} style={{ color: "var(--ink-soft)" }}>
            <span>{s.sector}</span>
            <span className="num">{s.pct}%</span>
          </div>
        ))}
      </div>
      <p className="disclaimer">
        Educational risk coaching, not financial advice. No buy/sell recommendations.
      </p>
    </section>
  );
}
