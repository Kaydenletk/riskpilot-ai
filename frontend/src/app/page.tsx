// Server Component: fetches the report server-side and renders the X-Ray.
// M1 = correct hierarchy (hero risk score, then the receipts, then AI prose),
// stub styling. M2 = the radial gauge, allocation bar, guardrail chips.
import { fetchSampleReport } from "@/lib/backend";
import type { RiskFacts } from "@/lib/types";

export const dynamic = "force-dynamic";

function riskColor(band: RiskFacts["risk_band"]): string {
  if (band === "aggressive") return "var(--risk-high)";
  if (band === "moderate") return "var(--risk-mid)";
  return "var(--risk-low)";
}

export default async function Home() {
  let report;
  try {
    report = await fetchSampleReport();
  } catch {
    return <BackendOffline />;
  }

  const { facts, explanation, holdings, disclaimer, portfolio_name, as_of } = report;

  return (
    <section>
      {/* framing banner — recruiter understands what this is without clicking */}
      <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", margin: 0 }}>
        AI Portfolio Risk Coach — explains the math, never invents numbers.
      </p>

      {/* TIER 1 — the hero: risk score + plain verdict */}
      <header style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginTop: "0.5rem" }}>
        <div
          className="num"
          style={{ fontSize: "4.5rem", fontWeight: 700, color: riskColor(facts.risk_band), lineHeight: 1 }}
        >
          {facts.risk_score}
        </div>
        <div>
          <div style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.8rem" }}>
            {facts.risk_band} · risk score / 100
          </div>
          <div style={{ fontSize: "1.1rem" }}>
            {portfolio_name}: top 3 holdings are{" "}
            <span className="num">{facts.concentration_pct_top3}%</span> of the portfolio.
          </div>
        </div>
      </header>

      {/* TIER 2 — the receipts: deterministic metrics shown WITH the score */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.75rem",
          margin: "1.5rem 0",
        }}
      >
        <Metric label="Top-3 concentration" value={`${facts.concentration_pct_top3}%`} />
        <Metric label="Est. annual volatility" value={`${facts.volatility_annualized_pct}%`} />
        <Metric label="Worst historical drawdown" value={`${facts.max_drawdown_pct}%`} />
        <Metric label={`Largest sector (${facts.largest_sector})`} value={`${facts.largest_sector_pct}%`} />
        <Metric label="Holdings" value={`${facts.holdings_count}`} />
      </div>

      {/* TIER 3 — AI explanation (grounded) + checklist */}
      <article style={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 8, padding: "1rem" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginBottom: "0.5rem" }}>
          ✓ Every figure verified against computed data · source: {explanation.source}
        </div>
        <p style={{ marginTop: 0 }}>{explanation.summary}</p>
        <strong>Review checklist</strong>
        <ul>
          {explanation.review_checklist.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </article>

      <p className="num" style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
        {holdings.length} holdings · {as_of}
      </p>
      <p className="disclaimer">{disclaimer}</p>
    </section>
  );
}

// Shown when no backend is reachable (e.g. M1 Vercel deploy before the Python
// service is hosted). Tells the product story instead of looking broken.
function BackendOffline() {
  return (
    <section>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", margin: 0 }}>
        AI Portfolio Risk Coach — explains the math, never invents numbers.
      </p>
      <h1 style={{ marginTop: "0.5rem" }}>RiskPilot AI</h1>
      <p>
        The risk engine (a private Python service) isn&apos;t connected to this
        deployment yet. The frontend, topology, and the number-hallucination
        guardrail are live in the repo — run it locally to see the full X-Ray:
      </p>
      <pre
        className="num"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--rule)",
          borderRadius: 8,
          padding: "1rem",
          overflowX: "auto",
        }}
      >
        {`git clone <repo> && cd "RiskPilot AI"
cp .env.example .env   # no OpenAI key needed
make install && make dev`}
      </pre>
      <p style={{ fontSize: "0.9rem" }}>
        The headline artifact — a validator that rejects any number the LLM invents —
        lives in <code>backend/src/riskpilot/llm/number_guardrail.py</code>, proven by{" "}
        <code>backend/tests/test_number_guardrail.py</code>.
      </p>
      <p className="disclaimer">
        Educational risk coaching, not financial advice. No buy/sell
        recommendations. Illustrative sample data.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 8, padding: "0.75rem" }}>
      <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>{label}</div>
      <div className="num" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}
