import { ImageResponse } from "next/og";

import { fetchTickerReport } from "@/lib/ticker-backend";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ticker risk read — RiskPilot AI";

export default async function TickerOg({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const report = await fetchTickerReport(symbol);

  // Unknown symbol → branded default card (never throw from an OG route).
  const heading = report ? report.ticker : "RiskPilot AI";
  const score = report ? `${Math.round(report.facts.risk_score)}/100` : "";
  const sub = report
    ? `${report.facts.risk_band} · ${report.facts.sector} · vol ~${Math.round(
        report.facts.volatility_annualized_pct,
      )}%`
    : "Portfolio risk math you can verify.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 32, color: "#7c9cff", fontWeight: 700 }}>
          RiskPilot AI · risk read
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 16 }}>{heading}</div>
        {score ? <div style={{ fontSize: 56, marginTop: 8 }}>Risk score {score}</div> : null}
        <div style={{ fontSize: 32, color: "#a3a3a3", marginTop: 24 }}>{sub}</div>
      </div>
    ),
    size,
  );
}
