# RiskPilot

**Your investing second brain: understand the business, inspect the evidence, and keep your own perspective.**

RiskPilot now opens into a guided research workspace rather than a portfolio risk dashboard. The core loop is **Choose a company → Explore sources → My notes → Save to history**. It helps beginners keep track of what they understand, what the sources support, and what remains unknown.

## Try it locally

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. The research workspace and bundled source search run without a Python backend, account or API key. When available, the existing private Python service handles retrieval; version mismatch or service failure switches to the bundled library with a visible status. Existing portfolio experiments remain at `/portfolio`, `/analyze`, `/compare` and `/ticker/[symbol]`.

The public Vercel deployment has not been updated by this rebuild.

## What works

- Switch between NVIDIA, Microsoft and Apple research packs.
- Scan sourced annual-sales, growth and profit figures; explore an interactive revenue mix and a zero-based three-year sales chart.
- Open revenue dependencies, classify disclosed risks with your own judgment and build a source-linked risk memo with Markdown export.
- Explore business, growth and disclosed-risk topics with source context beside them.
- Search curated notes using a question or claim. Unsupported questions return an explicit limited-corpus response.
- Inspect original filing links and reporting dates; bookmark notes into personal evidence.
- Write your own understanding, risks, unknowns, personal context and conditions that could change your mind.
- Save immutable research snapshots and revisit earlier reasoning in the decision journal.
- Persist drafts on this browser; export the notebook or deliberately delete it.
- Sync notebook changes between tabs and preserve unreadable browser data for recovery.
- Responsive desktop/mobile layouts, keyboard-accessible controls and light/dark themes.

## Source scope and honest limits

The library contains **12 manually curated, paraphrased notes from FY2025 documents**, not complete filings, live market data or the latest reports. Every note includes company, source URL, section, reporting period and publication date. Open the original source to inspect its full context.

Default retrieval is a small lexical baseline with normalization, simple query handling and company isolation. The Python service also supports an explicitly built embedding index and optional hybrid search; live embedding quality has not been evaluated. A retrieved note is relevant context, not a verdict that a claim is true. Missing results mean this library cannot answer, not that no evidence exists anywhere.

The visual overview adds selected FY2023–FY2025 revenue history and FY2025 revenue composition/net income from those same reports. See [visual design and data provenance](docs/design/2026-10-16-visual-company-overview.md).

There are no price forecasts, buy/sell recommendations, suitability assessments, portfolio math or investment-readiness scores in the new workspace. Topic counts show pages opened, not comprehension. User research and willingness to pay remain unvalidated.

## Optional live AI explanation

Set these server-side variables in `frontend/.env.local`, or use the existing root environment loaded by `make dev`:

```dotenv
RESEARCH_LIVE_AI=1
OPENAI_API_KEY=your_key
OPENAI_MODEL=a_model_available_to_your_account
```

Restart the server. The question form will offer an explicit checkbox to send **the current question and retrieved public source notes** to OpenAI. Personal notebook fields and journal history are excluded. Without opt-in, search makes no model request.

The server validates output shape and reference IDs against retrieved notes. This does **not** prove semantic correctness. If the provider fails or references are invalid, the UI falls back to source notes with an explanatory notice. Live inference has a per-process concurrency/request limiter; a shared limiter is needed for multi-instance public production use. A live paid model call was not part of the verification run.

## Local memory

Notebook data is versioned under `riskpilot-research-v1` in localStorage. Snapshots do not silently expire. Browser storage limits, private browsing or clearing site data can remove persistence; export is the backup mechanism. Quota/write failures keep the current draft in memory and show a warning. Invalid saved data is preserved until deliberate reset, with a recovery export.

Tabs read the latest stored collection before mutations and listen for storage changes. Concurrent edits to the same field use last-write-wins; this is not a collaborative editor or cloud sync. A shared browser profile is not a private account boundary.

## Validation

```bash
cd frontend
npm test
npx tsc --noEmit
npx playwright test e2e/research.spec.ts e2e/theme.spec.ts e2e/redesign.spec.ts e2e/whatif.spec.ts
NEXT_DIST_DIR=.next-verify npm run build
```

The separate build directory keeps verification from replacing the running dev server's output. Unit/API checks cover company isolation, unsupported queries, source metadata, notebook validation, snapshot preservation, private-field rejection and invalid-model-reference fallback. Browser checks cover the end-to-end research loop, reload, multiple tabs, recovery, responsive layouts and preserved portfolio interactions.

## Code and learning map

| Path | Responsibility |
|---|---|
| `frontend/src/components/research/ResearchWorkspace.tsx` | Coordinates selected company, research views and user actions |
| `frontend/src/components/research/CompanyMap.tsx` | Guided business/growth/risk exploration |
| `frontend/src/components/research/EvidenceDesk.tsx` | Source context and saved evidence |
| `frontend/src/components/research/SourceSearch.tsx` | Question form, abortable requests and results |
| `frontend/src/components/research/UnderstandingEditor.tsx` | User-authored reasoning |
| `frontend/src/components/research/ResearchJournal.tsx` | Immutable snapshot history |
| `frontend/src/components/research/useResearchNotebook.ts` | Browser persistence, tab reconciliation and recovery |
| `backend/src/riskpilot/research/` | Canonical catalogue, private retrieval API, index/export CLI and diagnostics |
| `frontend/src/lib/research/backend.ts` | Service bridge, version validation and offline fallback |
| `frontend/src/lib/research/corpus.ts` | Generated catalogue types and offline retrieval baseline |
| `frontend/src/lib/research/notebook.ts` | Schema, validation, snapshots and export |
| `frontend/src/app/api/research/route.ts` | Validated retrieval and optional model explanation |

See [system decisions and tradeoffs](docs/research/2026-10-16-system-decisions.md), [architecture and learning exercises](docs/RESEARCH_WORKSPACE.md), [UX research](docs/2026-10-16-investment-risk-ux-research.md) and [product/learning roadmap](docs/superpowers/plans/2026-10-16-riskpilot-evidence-first-roadmap.md).

The legacy Python portfolio engine is still documented in [DATA_SOURCE.md](DATA_SOURCE.md), [RELIABILITY.md](docs/RELIABILITY.md) and [COMPLIANCE.md](COMPLIANCE.md). Those describe the earlier portfolio product, not the new research pipeline. Licensed under [MIT](LICENSE).
