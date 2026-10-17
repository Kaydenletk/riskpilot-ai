# Visual company overview — UI design system application

User requested visual, beginner-readable information instead of long text, explicitly invoking ui-design-system. Implemented in the current research workspace; no live market feed or recommendation model added.

## Information hierarchy

Company selection → three headline figures → revenue composition → three-year sales chart → original figures/sources on demand → existing research topics and notes. Explore now starts with the selected company as its H1, without the previous marketing introduction. Secondary notes/history/source workflows remain available.

- Annual sales: USD billions, with the unit spelled out underneath.
- Sales growth: `(FY2025 revenue − FY2024 revenue) / FY2024 revenue × 100`.
- Profit per $100 of sales: GAAP net income / revenue × 100; accounting profit, not investor return or cash flow.
- Revenue mix: category revenue / same-year total. Interactive buttons show the selected share and a short plain-language explanation.
- Revenue history: actual annual totals, zero-based bars, FY labels, USD-billion axis. Not a price chart or forecast.

No score estimates “safety”, readiness, comprehension or loss probability. Rounded percentages use original integer amounts as denominators. Screen-reader chart descriptions and an expandable exact-data table expose the same information without requiring color or hover.

## Source record

Checked against the original reports on 2026-10-16. All raw figures below are USD millions. Chart dates inherit the company's FY2025 report metadata in the validated catalogue.

| Company | FY2023 / FY2024 / FY2025 revenue | FY2025 net income | FY2025 revenue groups |
|---|---|---:|---|
| NVIDIA | 26,974 / 60,922 / 130,497 | 72,880 | Data Center 115,186; Gaming 11,350; Other markets 3,961 |
| Microsoft | 211,915 / 245,122 / 281,724 | 101,832 | Productivity and Business Processes 120,810; Intelligent Cloud 106,265; More Personal Computing 54,649 |
| Apple | 383,285 / 391,035 / 416,161 | 112,010 | iPhone 209,586; Services 109,158; Other products 97,417 |

NVIDIA's groups are end markets, Microsoft's are reportable segments, Apple's are product categories. They are not a common cross-company classification. NVIDIA Other combines Professional Visualization 1,878, Automotive 1,694 and OEM/Other 389. Apple Other combines Mac 33,708, iPad 28,023 and Wearables/Home/Accessories 35,686. Group definitions are disclosed in the chart and raw-data view.

Original sources: [NVIDIA FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1045810/000104581025000023/nvda-20250126.htm), Consolidated Statements of Income and Note16 Revenue by End Market; [Microsoft FY2025 Annual Report](https://www.microsoft.com/investor/reports/ar25/), Income Statements and Note18; [Apple FY2025 10-K](https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm), Consolidated Statements of Operations and Note2.

## Tokens and component contract

The ui-design-system token generator was run with brand `#245b43`, modern style. The implementation adopts its primary DEFAULT color, 8/16/24/32px spacing choices and 8/16px radii while retaining existing workspace semantic light/dark tokens. It does not replace the application-wide theme with all generated defaults.

`visuals.module.css` defines chart-primary/secondary/tertiary and track colors; dark mode supplies brighter series. Labels, numeric percentages, button selection borders and table data communicate category values without depending on color. Small SVG/CSS charts avoid adding a chart-library runtime dependency. No animation is required for comprehension or interaction.

Data originates in `backend/src/riskpilot/research/data/catalog.json`, is validated by FinancialSnapshot, and is exported into the existing frontend snapshot. Exactly three consecutive years and two or three revenue groups are supported by this layout; larger input is rejected rather than silently clipped/uncolored. All categories must reconcile exactly with the latest annual total, IDs are unique, amounts are positive integer USD millions and reporting years must match the source-note snapshot.

Adding these figures changes the catalogue hash, so previously built embedding indexes must be regenerated before semantic retrieval can use them. HTTP requests do not trigger paid rebuilds. Numerical chart data is not automatically turned into searchable evidence notes: existing source search still operates on selected prose summaries. Enriching indexed evidence with structured numerical facts is a separate retrieval change.

## Tradeoffs and remaining questions

Showing selected financial facts quickly can improve orientation, but it cannot communicate the entire business or establish investment suitability. Revenue composition is not profitability by category or risk probability. Larger or faster-growing companies are not automatically better investments. Historical periods are intentionally retained to match the current research packs; no current-data claim is made.

A three-group mix is readable for a beginner but aggregates detail. Full group descriptions and exact amounts stay available. Interactive selection is supported by keyboard buttons, while the revenue trend remains directly labeled rather than requiring hover. Responsive layouts stack cards on narrow screens.

This is a design hypothesis, not evidence of improved retention or comprehension. Next usability check: ask a beginner to identify the largest business line, explain sales versus profit, and distinguish historical growth from expected stock returns without opening long-form notes.

## Verification

123 backend tests, 110 frontend unit/API tests, 22 selected browser tests and the isolated production build passed. The catalogue and diagnostic baseline regenerate byte-for-byte; scoped Python lint passed. Six homepage snapshots were updated and mobile/light/dark screenshots inspected. Review confirmed the three-company figures, zero baselines, category denominators, layout/schema bounds and error-free hydration. Production smoke verified all three companies, category selection and exact source tables, with no page errors or mobile overflow. The pre-existing Vercel speed-insights script endpoint returns404 under local production; it is unrelated to the chart runtime. Unit checks cover calculations, revenue reconciliation, fiscal periods and unsupported chart input lengths. Browser checks cover category selection, company switching, exact source tables, source links, preserved notebook workflows, keyboard focus, responsive layouts, hydration and dark preference.
