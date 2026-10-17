# Research system milestone — execution scope

User authorized continuation on 2026-10-16. Continue in the existing workspace and preserve unrelated pending portfolio changes.

Goal: make the research layer independently testable, versioned, measurable and replaceable without redesigning the workspace.

- [x] Canonical, validated Python source catalogue; generated frontend offline snapshot with a content version.
- [x] Private FastAPI retrieval endpoint with company/period boundaries, explicit abstention reasons and no notebook fields.
- [x] Next.js bridge prefers a matching Python catalogue; falls back transparently to the offline snapshot when unavailable or incompatible.
- [x] Reproducible 30-case retrieval evaluation with direct, paraphrase, out-of-scope and unanswerable cases.
- [x] Optional prebuilt embedding index; no paid index build or semantic query without explicit configuration/opt-in; stale/incompatible indexes fail back to lexical retrieval.
- [x] Display source scope and retrieval status; document decisions, rejected alternatives, limitations and verification results.

Scope excludes full-filing crawling, account/cloud memory, autonomous trading and claims of improved investment outcomes. Customer discovery remains pending; technical tests cannot substitute for it.

Tradeoffs to assess: existing FastAPI vs all-Next; curated catalogue vs live crawling; offline mirror vs single runtime dependency; lexical baseline vs embeddings; prebuilt index vs per-request ingestion; deterministic workflow vs autonomous research agent. Each decision needs an operational consequence and a condition for reconsideration.

## Verification

- Backend: 121 tests passed, including 13 research-system tests.
- Frontend: 107 unit/API tests passed.
- Browser: 23 selected research, responsive/theme and legacy portfolio tests passed.
- Isolated Next.js production build passed. Production browser smoke verified a real private Python service, then offline fallback after stopping it; no page errors or mobile overflow.
- Catalogue snapshot and diagnostic report regenerate byte-for-byte. Scoped Python lint passed.
- Code review found online/offline price-boundary drift; a failing regression reproduced it, the boundary was aligned, and review confirmed the correction.
- No live paid provider calls, deployment or commits performed. Optional semantic quality remains unmeasured.

See [actual system decisions and tradeoffs](../../research/2026-10-16-system-decisions.md).
