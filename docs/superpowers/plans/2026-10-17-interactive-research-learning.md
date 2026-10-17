# Interactive research — product engineering learning plan

User approved the supplied direction and asked to implement and teach together. Continue current local workspace; preserve unrelated pending changes. Existing curated FY2025 data remains the source boundary. The metaphysical framing is not used as evidence of user behavior or investment risk; UX improvements are hypotheses to test.

## Milestone 1 — Revenue → dependencies → personal risk memo (this session)

- [x] Add reviewed, company-scoped relationship mappings from revenue categories to growth/risk evidence IDs. Mark company-wide context and missing mapping explicitly. Never label two selected risks as exhaustive or as proven single points of failure.
- [x] Make revenue share and bar categories open a keyboard-accessible dependency dialog; show reported revenue separately from editorial links and the user's judgment. Original notes remain reachable.
- [x] Add per-risk user classifications: Dealbreaker / Manageable risk / Blindspot, with editable reason and removal. Capture source summary, period and catalogue version when assessed. These are personal labels, not model advice.
- [x] Make old local notebooks readable via additive default fields; preserve classifications and source context in immutable snapshots, JSON export and recovery flows. No IndexedDB/Zustand migration in this milestone.
- [x] Add a risk memo in My notes, generated from selected classifications without claiming generated opinions are the user's own reasoning. Allow Markdown download. Save to history works with a classified risk even if prose fields are empty.
- [x] Verify model/migration/snapshot/export invariants and real browser flow, reload, company isolation, keyboard, mobile and dark mode. Record test evidence and a short Vietnamese walkthrough tied to actual code.

Choice: a native modal dialog reuses the research page and provides focus containment/Escape. A separate stress-test page would introduce routing and imply numerical stress modelling not being built. Manual mappings are inspectable and predictable but limited to reviewed disclosure links; they are not a causal model or automatically exhaustive RAG.

Learning sequence: data contract → pure state transition → persistence/history → UI interaction → failure tests. Explain each boundary and its tradeoff in short updates, with a final walkthrough the user can reproduce.

## Milestone 2 — Precise evidence navigation (pending)

Source pinning for metrics and risk claims, with verified report anchors/excerpts and exact derivation for ratios. Highlight only evidence actually ingested/rendered. Opening an original external filing is not a guarantee of cross-browser text highlighting. Do not present paraphrases as verbatim original excerpts.

## Milestone 3 — Compare bottlenecks (pending)

Reviewed taxonomy across companies with explicit “not covered by this library” states. Similar labels do not establish equal exposure or severity. Compare disclosures, not invented risk probabilities.

## Milestone 4 — Workspace navigation and measurement (pending)

Cmd/Ctrl+K accessible navigation; opt-in/content-free product events with defined activation funnel. Evaluate need for IndexedDB using real size/performance evidence before migrating. No automatic external telemetry or public share links containing private notebook data.

## Milestone 5 — Product case study mode (pending)

Opt-in header annotations explain product hypotheses, tradeoffs and measured technical behavior. No unverified retention claims or invented recruiter attention statistics. Markdown export is local; public sharing needs an explicit privacy/account/storage design later.

## Milestone 1 verification record

- 117 frontend unit/API tests passed, including backward migration, captured-source preservation, company isolation, idempotent classification, nested snapshot independence and Markdown provenance.
- 26 selected browser tests passed, including 375px/1440px dependency-to-source-to-memo, focus return, Escape, reload, history immutability and Markdown download.
- Final production build passed outside the sandbox. Four production browser smoke cases passed after the sticky-header/copy polish. Six homepage visual snapshots were updated.
- Browser screenshots inspected; sticky Close and removal of redundant classification toast address issues found visually.
- No paid model calls, database migration, telemetry, public share publishing, commits or deployment.
- External review was attempted but the review agent hit its usage limit; remaining review was performed locally, with additional regression cases.

Walkthrough: `learning/02-risk-memo/README.md`. Remaining milestones stay pending; this record does not claim the whole plan is implemented.
