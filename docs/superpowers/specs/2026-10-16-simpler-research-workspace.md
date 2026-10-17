# Simpler RiskPilot research workspace

User request: make the existing localhost workspace straightforward and less confusing. Continue the authorized layout work in the current workspace.

Problem: large editorial introduction, duplicate navigation, default evidence desk and inconsistent save terminology compete with the beginner's next action.

Chosen design: company selection first; one recommended business overview, then growth/risks and optional question search. Main views are Explore, My notes and Saved sources. History and All documents are secondary. The source desk opens on request and closes with focus returning to the opening control. It remains accessible from saved sources and history. Notebook data/schema/API contracts remain unchanged.

Rejected alternatives: a mandatory wizard would clarify order but block revisiting sources and notes; keeping all panels visible reduces clicks but retains the original visual competition. Use progressive disclosure instead.

Saving: drafts auto-save as before. Save source bookmarks an evidence note; Save to history in My notes preserves an immutable copy. Remove the premature global Save research action. Source scope and browser-only persistence stay visible.

Acceptance: a new visitor sees Start here; source details are initially absent, can open/close and bookmark; saved sources reopen; notes and history persist across reload; company isolation and recovery stay intact; one H1; keyboard focus is retained; no overflow at mobile/tablet/desktop; dark theme and reduced motion work. Verify existing research flows plus an explicit first-visit/open/close test, unit tests and production build.

Status: implemented and verified. 107 frontend unit/API tests, 20 selected browser tests and the isolated production build passed. Six homepage visual baselines were regenerated; desktop and mobile screenshots were inspected. Review found a focus-loss regression when opening notes from a source; shared focus transition and a keyboard browser regression now cover it. This is a UX hypothesis based on inspection and user feedback, not a usability study proving lower confusion.
