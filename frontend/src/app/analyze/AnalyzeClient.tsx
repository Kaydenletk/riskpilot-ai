"use client";

// Client shell for /analyze: builder state machine + URL/localStorage sync.
// All risk math happens in the engine — this file only moves rows around and
// renders whatever the engine (or its absence) sends back.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PortfolioBuilder } from "@/components/analyze/PortfolioBuilder";
import { PreviewRail } from "@/components/analyze/PreviewRail";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { weightedPortfolio } from "@/lib/portfolio-schema";
import {
  parsePortfolio,
  removeHolding,
  serializePortfolio,
  type PortfolioRow,
} from "@/lib/portfolio-state";
import type { RiskReport, TickerOption } from "@/lib/types";

import styles from "./analyze.module.css";

const LAST_PORTFOLIO_KEY = "rp-last-portfolio";
const URL_SYNC_DEBOUNCE_MS = 300;

// One-click starting point for first-timers: teaches the builder by showing a
// filled state instead of explaining an empty one. Tech-heavy on purpose — the
// resulting report demonstrates the concentration coaching immediately.
const EXAMPLE_PORTFOLIO = "NVDA:30,AAPL:20,MSFT:15,AMZN:15,KO:10,JNJ:10";

type Phase =
  | { kind: "builder" }
  | { kind: "scoring" }
  | { kind: "result"; report: RiskReport }
  | { kind: "rejected"; symbols: string[]; message: string }
  | { kind: "offline" };

export function AnalyzeClient({ universe }: { universe: TickerOption[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [rows, setRows] = useState<PortfolioRow[]>(() => parsePortfolio(params.get("p") ?? ""));
  const [phase, setPhase] = useState<Phase>({ kind: "builder" });
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [resumeAvailable, setResumeAvailable] = useState(false);

  // Offer resume only when the URL didn't already carry a portfolio.
  useEffect(() => {
    if (rows.length === 0) {
      try {
        const stored = localStorage.getItem(LAST_PORTFOLIO_KEY);
        if (stored && parsePortfolio(stored).length > 0) setResumeAvailable(true);
      } catch {
        // storage blocked — resume chip just never appears
      }
    }
    // run once on mount; `rows` here is the initial URL-derived value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the portfolio shareable: rows -> ?p=, debounced so typing in a weight
  // field doesn't spam history (replace, not push — back button stays sane).
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const serialized = serializePortfolio(rows);
      router.replace(serialized ? `/analyze?p=${serialized}` : "/analyze", { scroll: false });
    }, URL_SYNC_DEBOUNCE_MS);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [rows, router]);

  const run = useCallback(
    async (current: PortfolioRow[]) => {
      const weighted = current.map((r) => ({ ticker: r.ticker, weight_pct: r.weightPct }));
      const parsed = weightedPortfolio.safeParse(weighted);
      if (!parsed.success) {
        // Shouldn't happen — the state lib keeps rows valid — but never send
        // a body we know the engine will reject.
        setBuilderError(parsed.error.issues[0]?.message ?? "Portfolio is invalid.");
        return;
      }
      setBuilderError(null);
      setPhase({ kind: "scoring" });
      try {
        const res = await fetch("/api/report", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ weighted: parsed.data }),
        });
        if (res.ok) {
          const report = (await res.json()) as RiskReport;
          try {
            localStorage.setItem(LAST_PORTFOLIO_KEY, serializePortfolio(current));
          } catch {
            // storage blocked — resume just won't be offered next visit
          }
          setPhase({ kind: "result", report });
          return;
        }
        if (res.status === 422 || res.status === 400) {
          const body = (await res.json()) as { symbols?: string[]; message?: string; errors?: string[] };
          setPhase({
            kind: "rejected",
            symbols: body.symbols ?? [],
            message:
              body.message ?? body.errors?.join("; ") ?? "The engine rejected this portfolio.",
          });
          return;
        }
      } catch {
        // network failure — same as engine-down
      }
      setPhase({ kind: "offline" });
    },
    [],
  );

  function resumeLast() {
    try {
      const stored = localStorage.getItem(LAST_PORTFOLIO_KEY);
      if (stored) setRows(parsePortfolio(stored));
    } catch {
      // ignore
    }
    setResumeAvailable(false);
  }

  if (phase.kind === "result") {
    return (
      <div className="stage stage-2">
        <div className={styles.resultBar}>
          <span className="caption">Your portfolio · {phase.report.as_of}</span>
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => setPhase({ kind: "builder" })}
          >
            ← Edit portfolio
          </button>
        </div>
        <Dashboard report={phase.report} />
      </div>
    );
  }

  // Rendered once and reused below — the two-column grid (builder + live
  // preview rail) only applies in the plain "builder" phase; scoring/rejected/
  // offline keep the builder full-width, exactly as before this task.
  const portfolioBuilder = (
    <PortfolioBuilder
      universe={universe}
      rows={rows}
      onRowsChange={(next) => {
        setRows(next);
        if (phase.kind !== "builder") setPhase({ kind: "builder" });
      }}
      onRun={run}
      error={builderError}
    />
  );

  return (
    <div className="stage stage-2">
      {phase.kind === "builder" && rows.length === 0 && (
        <div className={styles.starterRow}>
          <button
            type="button"
            className={styles.starterBtn}
            onClick={() => setRows(parsePortfolio(EXAMPLE_PORTFOLIO))}
          >
            Try an example portfolio →
          </button>
          {resumeAvailable && (
            <div className={styles.resumeChip}>
              <button type="button" className={styles.resumeBtn} onClick={resumeLast}>
                Resume last portfolio →
              </button>
              <button
                type="button"
                className={styles.dismissBtn}
                aria-label="Dismiss"
                onClick={() => setResumeAvailable(false)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {phase.kind === "builder" ? (
        <div className={styles.builderGrid}>
          {portfolioBuilder}
          <PreviewRail rows={rows} universe={universe} />
        </div>
      ) : (
        portfolioBuilder
      )}

      {phase.kind === "scoring" && (
        <div className={styles.skeleton} aria-label="Scoring your portfolio" role="status">
          <div className={styles.skelBlock} />
          <div className={styles.skelBlock} style={{ width: "70%" }} />
          <div className={styles.skelRow}>
            <div className={styles.skelBlock} />
            <div className={styles.skelBlock} />
            <div className={styles.skelBlock} />
          </div>
        </div>
      )}

      {phase.kind === "rejected" && (
        <div className={`glass ${styles.panel}`} role="alert">
          <p className={styles.panelText}>{phase.message}</p>
          {phase.symbols.length > 0 && (
            <button
              type="button"
              className={styles.panelBtn}
              onClick={() => {
                setRows(phase.symbols.reduce((acc, s) => removeHolding(acc, s), rows));
                setPhase({ kind: "builder" });
              }}
            >
              Remove {phase.symbols.join(", ")} and continue
            </button>
          )}
        </div>
      )}

      {phase.kind === "offline" && (
        <div className={`glass ${styles.panel}`} role="alert">
          <p className={styles.panelText}>
            The risk engine isn&apos;t reachable right now. Your holdings are safe in the URL —
            nothing was lost.
          </p>
          <button type="button" className={styles.panelBtn} onClick={() => run(rows)}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
