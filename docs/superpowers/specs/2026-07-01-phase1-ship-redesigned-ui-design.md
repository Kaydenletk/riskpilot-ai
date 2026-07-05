# Phase 1 — Ship the Redesigned UI to Production

**Date:** 2026-07-01
**Status:** Approved (design), pending spec review
**Part of:** RiskPilot AI investor-readiness sequence (phase 1 of 6)

## Context

The redesigned "condensed 2026" UI is complete on branch `redesign/condensed-2026-ui`
but not yet in production. Production (`riskpilot-coach.vercel.app`) still serves the
pre-redesign build. This phase ships the redesign — nothing more.

Verified current state (2026-07-01):

- Branch `redesign/condensed-2026-ui`: **21 commits ahead, 1 behind** `origin/main`.
- The redesign = 19 frontend commits (condensed Dashboard, verdict headline, number
  cards, sortable holdings table, theme toggle, Space Grotesk display font, vitest +
  playwright tooling). No backend changes.
- The 1-behind commit `7913c4e` adds **one line to `README.md`** ("live demo and
  reliability info"). No rebase conflict (verified via `git merge-tree`).
- Vercel project is linked: `frontend/.vercel/project.json` → project "frontend"
  (`prj_BUtH83H2iLDfzpTRmFFQKi1Jzm5D`). `frontend/vercel.json` sets framework `nextjs`.
- CI (`.github/workflows/ci.yml`) runs on PRs to `main`: backend `pytest -q` +
  `python -m riskpilot.eval.run`, frontend `npm run build`.
- Backend is a private Python service, NOT hosted on Vercel. Production renders the
  Dashboard from a committed snapshot; a `BackendOffline` fallback covers the ticker
  path. This phase does not change that — the snapshot is the phase 1–4 data source.
- Working tree has `M .gitignore` (adds `.gstack/`) — a legitimate tool-dir ignore to
  commit before the PR.

## Goal

Redesigned UI live in production, replacing the stale build. CI-gated, reversible.

## Non-Goals (explicitly out of scope for phase 1)

- No SEO files (robots/sitemap/manifest/OG/favicon) — phase 3.
- No caching / rendering-strategy changes — `force-dynamic` stays as-is — phase 4.
- No TradingView lazy-loading — phase 4.
- No trust-claim / README-metric edits beyond what the rebase pulls in — phase 2.
- No backend hosting — decided at phase 5.
- No code changes beyond the rebase and the `.gitignore` commit.

## Approach

Chosen (approved): **rebase onto `origin/main`, PR, squash-merge.** Rejected alternatives:
merge `origin/main` into the branch (messier history, a merge commit for one README
line); promote a Vercel preview without touching main (leaves main stale — main is the
production source of truth here).

## Execution Steps

Each step is a blocking gate. A failure stops the phase — do not proceed to the next gate.

1. **Commit the `.gitignore` change.** `git add .gitignore && git commit -m "chore: ignore .gstack/ tool dir"`. Tree clean before rebase.

2. **Rebase onto origin/main.** `git fetch origin`, then
   `git rebase origin/main`. Expected: clean (1-line README add). If unexpected
   conflict, resolve preserving the branch's README changes plus the incoming line, or
   stop and surface.

3. **Local pre-flight (mirror CI + more). Capture real output, not assumptions:**
   - Frontend: `cd frontend && npm ci && npm run build` (Next 15.5.19 prod build).
   - Frontend unit: `npm run test` (vitest).
   - Frontend e2e: `npm run e2e` (Playwright visual/presence, light + dark).
   - Backend: `cd backend && pip install -e ".[dev]" && pytest -q` and
     `python -m riskpilot.eval.run`.
   - All green is the gate. Any red → stop, diagnose, fix (systematic-debugging), re-run.

4. **Push + open PR** `redesign/condensed-2026-ui → main` via `gh pr create`.
   Comprehensive body: what the redesign changed (from commit history), test plan,
   note that backend stays private/snapshot. `git push --force-with-lease` (rebase
   rewrote history on the remote feature branch — force-with-lease is safe, plain force
   is not).

5. **Merge gate.** Wait for CI (`gh pr checks --watch`). Merge only when **both jobs
   green**. `gh pr merge --squash`. Squash keeps main history one-commit-per-feature-set.

6. **Verify production deploy.** Merge to main triggers Vercel production build.
   - Confirm the deployment via `vercel` CLI or `gh` deployment status / the Vercel
     dashboard: latest production deploy points at the squash-merge commit, build
     succeeded.
   - Smoke the live prod URL (Playwright, real HTTP): 200 OK; renders the redesigned
     Dashboard (verdict headline + number cards + condensed views), NOT the old UI;
     theme toggle present; `BackendOffline` fallback renders correctly on the ticker
     path (backend still private); no console errors.

7. **Rollback readiness (documented, executed only on failure).** If prod smoke fails:
   Vercel instant-rollback to the previous production deploy (dashboard or
   `vercel rollback`), and `git revert` the squash-merge commit on main. Confirm both
   levers are available before declaring the phase done.

## Error Handling

- Build/test/e2e red at step 3 → stop, fix, re-run. Never PR on red local.
- CI red at step 5 → diagnose the failing job's logs; real failure → fix + push; flake
  (timeout/runner/network) → re-enqueue. Never merge on red CI.
- Prod smoke red at step 6 → execute rollback (step 7) immediately, then diagnose.

## Verification (evidence required — no "should pass")

- `git rebase` clean; `git log main..HEAD` shows the expected 21→ commits + README line.
- Frontend build output (success), vitest count, Playwright pass count — all captured.
- Backend pytest + eval output captured.
- CI run URL, both jobs green.
- Production: HTTP 200, screenshot of redesigned Dashboard, no-console-error confirmation.
- Rollback levers confirmed available.

## Success Criteria

Production serves the redesigned UI, CI passed, and rollback is one command away. The
user comes back to a shipped redesign, not a half-open PR.
