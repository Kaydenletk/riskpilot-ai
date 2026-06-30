# UI System Research + Search & RAG Architecture

Research-backed (2026 sources). Three questions answered:
1. What's the best-fit UI system for this web app?
2. How to add a search bar (analyze any ticker)?
3. How would RAG apply here?

---

## 1. UI system — the verdict

**The 2026 fintech standard is: shadcn/ui (base) + Tremor (charts), on Tailwind.**
RiskPilot already sits on Tailwind with a custom token layer, so this is a small
step, not a rewrite.

### What the research says

- Leading fintech (**Mercury, Ramp, Brex**) **lead with a single trusted number**,
  avoid information overload, single-page where the metric set is finite. Color is
  **functional, not decorative** — red = problem, green = healthy, the rest neutral.
- Retail investors **will not tolerate** dense legacy-trading-platform UIs (compressed
  tables, jargon). The industry's biggest redesigns are about **radical simplification**
  + **progressive disclosure**.
- For component libraries: **shadcn/ui as the foundation, Tremor for data-viz**, is the
  recurring recommendation for custom fintech dashboards. shadcn = you own the code
  (copied in, not a dependency); Tremor = chart-first KPI cards/area/bar/donut that
  compose into your own layout and keep your Tailwind tokens intact.

### How RiskPilot already matches (and the gap)

| 2026 best practice | RiskPilot today | Action |
|---|---|---|
| Lead with one trusted number | ✓ the risk gauge | keep |
| Functional color (risk = warm, safe = cool) | ✓ semantic ramp | keep |
| Single-page, shareable | ✓ | keep |
| Progressive disclosure | ✓ Coach/Analyst toggle | keep |
| Minimal, neutral, bold type | ✓ Swiss/instrument | keep |
| **Chart-first data-viz library** | ✗ hand-rolled SVG gauge + bars | **adopt Tremor for new charts** |
| **shadcn primitives** (dialog, command, popover) | ✗ none yet | **add for the search bar** |

**Recommendation:** keep the custom gauge (it's the signature element — don't
commoditize it), but adopt **shadcn/ui primitives** for interactive UI (the search
command palette, dialogs, tooltips) and **Tremor** for any new standard charts
(price sparkline, sector donut, drawdown area). This is additive — the design system
(tokens, risk ramp, tabular numerals) stays the source of truth; the libraries fill
in the parts that are tedious to hand-build and are where bugs hide.

**Do NOT:** adopt a heavy template, switch to MUI/Ant (they fight Tailwind and look
generic), or auto-default to dark mode (the research notes dark mode suits dense
trading terminals; RiskPilot's coaching tone is better in the current light
instrument look — offer dark as an option later, don't default).

---

## 2. Search bar — analyze any ticker

### The UX (from the research)

Robinhood-style **predictive search as you type** is the expected pattern: type
`NVDA`, see suggestions instantly, pick one, get the analysis. Pair with **curated
collections** (trending, sectors, top names) so new users discover beyond what they
know. Implement with **shadcn's `Command` (cmdk) component** — a keyboard-first
command palette, the modern standard for this.

```
  [ ⌘K  Search a stock or ETF…              ]   <- shadcn Command / cmdk
        ↓ types "nv"
  ┌─────────────────────────────────────────┐
  │  NVDA   NVIDIA Corp        Technology    │  <- predictive, as-you-type
  │  NVDic  ...                              │
  │  ── Trending ──                          │
  │  AAPL   SPY   TSLA   ...                 │  <- curated collections
  └─────────────────────────────────────────┘
        ↓ pick NVDA
  full single-ticker risk read (gauge + coach/analyst views)
```

### The hard part: where does the data come from?

This is the real architecture decision, and it collides with an existing project
constraint (the eng review's data-licensing + the "synthetic dataset" call).

**Two honest scopes:**

**Scope A — fixed universe (v1, recommended).** Search is limited to the tickers in
the committed dataset (the ~15 names + index). Typing anything else returns "not in
the demo universe — try NVDA, AAPL, SPY…". The ticker allow-list is ALSO the
prompt-injection defense the eng review flagged (A27): a "ticker" of
`ignore previous instructions` never reaches the model because it's not in the set.
- Pros: zero new data/licensing risk, the math stays correct + reproducible, ships now.
- Cons: not "any" stock — bounded to the demo set. Honestly labeled.

**Scope B — live single-ticker (later).** Search any real ticker → fetch its history
from a license-clean source (Stooq/Tiingo/Alpha Vantage free tier) → compute the same
risk math on the fly → analyze. This is the "analyze whatever they want" version.
- Pros: the real product.
- Cons: needs a live data provider (rate limits, key, ToS), a per-ticker compute path,
  caching so a scraper can't run your bill up, and graceful handling of bad/illiquid
  tickers. This is a multi-day feature, not a v1 add.

**Recommendation:** ship **Scope A** now (search the demo universe, real instant UX,
zero risk), and write **Scope B** into the roadmap as the "live data" milestone. The
search BAR and the single-ticker analysis VIEW are identical in both scopes — only
the data source swaps — so Scope A is real progress toward Scope B, not throwaway.

### What "single-ticker analysis" computes

For one ticker (vs the whole portfolio), the risk_engine already has the pieces:
annualized volatility, max drawdown, and (new) beta vs the index. Plus sector, a
price sparkline (Tremor area chart), and the guardrailed LLM explanation in plain
words. Reuses the entire existing pipeline — the portfolio is just N=1.

---

## 3. RAG — how it applies here

RAG = retrieve authoritative documents at query time, inject them into the prompt,
so the LLM answers grounded in real sources (and **citable + auditable**) instead of
from memory. This is exactly the deferred "RAG Research Assistant" feature, and it
fits RiskPilot's thesis perfectly: the project is already about **grounding the LLM**.

### The pipeline (standard 2026 shape)

```
  INGEST (offline, once)
    SEC filings / risk-factor sections / earnings notes
      -> chunk (semantic chunking: split on meaning, not fixed size)
      -> embed (OpenAI embeddings)
      -> store in Postgres + pgvector   <- already in the original stack!

  QUERY (at request time)
    user asks "why is NVDA risky?"
      -> embed the question
      -> pgvector similarity search -> top-k relevant chunks
      -> (optional) cross-encoder rerank for precision
      -> inject chunks into the prompt
      -> LLM answers, CITING the chunks
      -> the number-hallucination guardrail still runs on the output
```

### Why it fits RiskPilot specifically

- **pgvector was already in the original stack** (we dropped it from v1 because there
  was nothing to retrieve — RAG is exactly what brings it back, with a real job).
- **The guardrail composes with RAG**: RAG grounds the *prose/claims* in source docs;
  the number-guardrail still ensures any *number* traces to computed facts. Two layers
  of grounding — a strong story: "my LLM is grounded in both my own math AND cited
  source documents, and I can prove neither hallucinates."
- **Citations = auditability**, which is the compliance/maturity angle the CEO review
  prized. "Here's why this stock is risky, and here's the 10-K risk-factor section it
  came from" is far stronger than a freestyle answer.

### Scope (honest)

RAG is a **multi-week** feature (ingestion pipeline, chunking, embeddings, retrieval
eval). The research is blunt: production RAG needs good retrieval + evaluation +
transparency, not just "embed and pray." So:

- **v1 (if you want a RAG demo soon):** a TINY fixed corpus — 3-5 real 10-K
  risk-factor sections committed to the repo, embedded once, retrieved at query time.
  Proves the pattern end-to-end, cited, with the guardrail on top. Small + honest.
- **Later:** a real ingestion pipeline over many filings, reranking, a retrieval eval
  number in the README (like the hallucination-rate number — "retrieval precision @5").

**Recommendation:** RAG is the right *next-after-search* feature, but it's bigger than
search. Do search first (Scope A — ships now), then RAG over a tiny committed corpus
(proves the pattern), then expand both. Each step is real and shippable.

---

## Suggested build order

1. **shadcn/ui + Tremor adoption** (small) — add the primitives + chart lib, keep the
   custom gauge. Foundation for everything below.
2. **Search bar, Scope A** (fixed universe) — instant ticker search over the demo set,
   single-ticker analysis view, ticker allow-list = injection defense.
3. **Beta + single-ticker math** — round out the per-ticker risk read.
4. **RAG over a tiny committed corpus** — bring pgvector back, retrieve + cite + guardrail.
5. **Scope B (live data)** + **real RAG ingestion** — the full "analyze anything" product.

Each is independently shippable and demoable. None throws away the prior step.

---

## Sources

- [Top 10 Fintech UX Design Practices 2026 — Onething](https://www.onething.design/post/top-10-fintech-ux-design-practices-2026)
- [Fintech Design Trends 2026 — Outcrowd](https://www.outcrowd.io/blog/fintech-design-trends-2026)
- [Fintech design guide / patterns that build trust 2026 — Eleken](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- [Trading App Design: UI, UX & System Architecture 2026 — Lollypop](https://lollypop.design/blog/2026/june/trading-app-design/)
- [How the Robinhood UI balances simplicity and strategy](https://worldbusinessoutlook.com/how-the-robinhood-ui-balances-simplicity-and-strategy-on-mobile/)
- [shadcn/ui](https://ui.shadcn.com/) · [Tremor (React analytics components)](https://www.shadcn.io/template/tremorlabs-tremor)
- [Best React Component Libraries 2026 — DesignRevision](https://designrevision.com/blog/best-react-component-libraries)
- [RAG Architecture for Financial Services — White Oak Intel](https://whiteoakintel.com/blog/rag-architecture-deep-dive/)
- [LLM-RAG Financial Data Analysis System (arXiv)](https://arxiv.org/pdf/2504.06279)
- [FinDER: Financial QA + RAG eval (arXiv)](https://arxiv.org/pdf/2504.15800)
- [RAG Explained: 10 Steps to Production 2026](https://decodethefuture.org/en/rag/)
