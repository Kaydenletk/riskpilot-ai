# Phase 1 — Ship the Redesigned UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the redesigned "condensed 2026" UI (branch `redesign/condensed-2026-ui`) to production on Vercel, CI-gated and reversible.

**Architecture:** This is a ship/ops plan, not code authoring. Rebase the feature branch onto `origin/main`, verify green locally (mirroring CI), open a PR, merge on green CI, then verify the Vercel production deploy renders the redesign. No application code changes beyond a `.gitignore` commit and the rebase.

**Tech Stack:** git, GitHub CLI (`gh`), Next.js 15.5.19 (frontend), Python 3.11 + pytest (backend), Vercel (deploy), Playwright (smoke).

## Global Constraints

- Repo root: `/Users/khanhle/Desktop/Desktop - Khanh’s MacBook Pro/💻 Dev-Projects/RiskPilot AI` (path contains spaces + non-ASCII — always quote it).
- Feature branch: `redesign/condensed-2026-ui`. Base/prod branch: `main`. Remote: `origin` → `github.com/Kaydenletk/riskpilot-ai`.
- Vercel project already linked: `frontend/.vercel/project.json` → project "frontend" (`prj_BUtH83H2iLDfzpTRmFFQKi1Jzm5D`). Production source of truth = `main`.
- Backend is private, NOT deployed. Production renders Dashboard from a committed snapshot; ticker path uses the `BackendOffline` fallback. Do NOT change this in phase 1.
- CI (`.github/workflows/ci.yml`) gates PRs to `main`: backend `pytest -q` + `python -m riskpilot.eval.run`; frontend `npm run build`.
- Evidence discipline: every gate requires captured real output. Never claim "should pass." A red gate STOPS the phase.
- Out of scope (do NOT touch): SEO files, caching/`force-dynamic`, TradingView, trust-claim/README metrics beyond the rebase, backend hosting.
- Rebase rewrites feature-branch history → push with `--force-with-lease` (never plain `--force`).

---

### Task 1: Commit the `.gitignore` change, clean the tree

**Files:**
- Modify: `.gitignore` (already has working change adding `.gstack/`)

**Interfaces:**
- Consumes: nothing.
- Produces: a clean working tree — precondition for a safe rebase (Task 2).

- [ ] **Step 1: Confirm the only working change is the `.gitignore` `.gstack/` line**

Run: `git -C "$REPO" status --short && git -C "$REPO" diff .gitignore`
Expected: `M .gitignore` only; diff shows exactly `+.gstack/` added. If ANY other unexpected modification appears, STOP and surface it — do not commit blind.

- [ ] **Step 2: Commit it**

Run:
```bash
git -C "$REPO" add .gitignore
git -C "$REPO" commit -m "chore: ignore .gstack/ tool dir"
```
Expected: one commit created, `1 file changed`.

- [ ] **Step 3: Verify tree clean**

Run: `git -C "$REPO" status --short`
Expected: empty output (clean tree).

---

### Task 2: Rebase the feature branch onto `origin/main`

**Files:** none (git history operation).

**Interfaces:**
- Consumes: clean tree from Task 1.
- Produces: `redesign/condensed-2026-ui` rebased on top of `origin/main` (includes the 1-line README commit `7913c4e`), ready for a conflict-free PR.

- [ ] **Step 1: Fetch latest origin**

Run: `git -C "$REPO" fetch origin`
Expected: fetch completes; `origin/main` up to date.

- [ ] **Step 2: Re-confirm the delta before rebasing**

Run: `git -C "$REPO" log HEAD..origin/main --oneline`
Expected: exactly one commit `7913c4e Update README with live demo and reliability info`. If more commits appear, pause and re-read them before proceeding (the plan assumed one trivial commit).

- [ ] **Step 3: Rebase**

Run: `git -C "$REPO" rebase origin/main`
Expected: `Successfully rebased and updated refs/heads/redesign/condensed-2026-ui`. 

If a conflict occurs (expected: none): it will be in `README.md`. Resolve by KEEPING the feature branch's README content AND incorporating the incoming "live demo and reliability info" line from `7913c4e`. Then `git -C "$REPO" rebase --continue`. If the conflict is anywhere unexpected, run `git -C "$REPO" rebase --abort` and surface it.

- [ ] **Step 4: Verify the rebase result**

Run: `git -C "$REPO" log --oneline -3 && git -C "$REPO" rev-list --left-right --count origin/main...HEAD`
Expected: top commits are the feature branch's; left-right count shows `0` behind (left) and the full ahead count (right) — branch is now strictly ahead of `origin/main`.

---

### Task 3: Frontend pre-flight — build + unit + e2e

**Files:** none (verification only). Working dir: `frontend/`.

**Interfaces:**
- Consumes: rebased branch from Task 2.
- Produces: evidence the frontend prod build + tests are green locally before opening the PR.

- [ ] **Step 1: Clean install (lockfile in sync post-rebase)**

Run: `cd "$REPO/frontend" && npm ci`
Expected: install completes with no errors. If `npm ci` errors on lockfile mismatch, run `npm install`, and note the lockfile changed (would need committing before PR).

- [ ] **Step 2: Production build (mirrors CI)**

Run: `cd "$REPO/frontend" && npm run build`
Expected: `next build` completes; "Compiled successfully"; route table printed; exit 0. Capture the output. Any build error → STOP, diagnose (superpowers:systematic-debugging), fix, re-run.

- [ ] **Step 3: Unit tests (vitest)**

Run: `cd "$REPO/frontend" && npm run test`
Expected: all vitest suites pass (verdict, breakdown, etc.); exit 0. Capture pass count.

- [ ] **Step 4: E2E (Playwright, light + dark)**

Run: `cd "$REPO/frontend" && npx playwright install --with-deps chromium && npm run e2e`
Expected: `redesign.spec.ts` passes in both themes; exit 0. Capture pass count. (First run installs the browser; subsequent runs skip it.)

- [ ] **Step 5: If Task 3 Step 1 changed the lockfile, commit it**

Only if `npm install` was needed:
```bash
git -C "$REPO" add frontend/package-lock.json
git -C "$REPO" commit -m "chore: sync frontend lockfile"
```
Expected: committed, or skipped if `npm ci` succeeded cleanly.

---

### Task 4: Backend pre-flight — pytest + eval (mirror CI)

**Files:** none (verification only). Working dir: `backend/`.

**Interfaces:**
- Consumes: rebased branch.
- Produces: evidence the backend jobs CI will run are green locally (catch failures before CI does).

- [ ] **Step 1: Install backend (editable, dev extras)**

Run: `cd "$REPO/backend" && python -m pip install -e ".[dev]"`
Expected: install succeeds. (Use the repo's Python — `.python-version` pins it.)

- [ ] **Step 2: Run pytest (DEMO_MODE, no OpenAI key)**

Run: `cd "$REPO/backend" && pytest -q`
Expected: all tests pass; exit 0. Capture the summary line (e.g. `52 passed`).

- [ ] **Step 3: Run the reliability eval on fixtures**

Run: `cd "$REPO/backend" && python -m riskpilot.eval.run`
Expected: eval runs on fixtures, prints its metrics, exit 0. Capture output. (This is the same command CI runs — phase 6 will expand its case count; phase 1 only confirms it runs green.)

---

### Task 5: Push and open the PR

**Files:** none (PR body drafted from commit history).

**Interfaces:**
- Consumes: green pre-flight from Tasks 3–4.
- Produces: an open PR `redesign/condensed-2026-ui → main` with CI running.

- [ ] **Step 1: Push the rebased branch**

Run: `git -C "$REPO" push --force-with-lease origin redesign/condensed-2026-ui`
Expected: push succeeds. `--force-with-lease` protects against clobbering an unseen remote update; if it rejects, someone pushed to the branch — fetch, re-inspect, re-rebase, do NOT plain-force.

- [ ] **Step 2: Draft the PR body from the commit range**

Run: `git -C "$REPO" log main..HEAD --oneline`
Use the output to write the PR body. Body must include: summary of what the redesign changed (condensed Dashboard, verdict headline, number cards, sortable holdings table, theme toggle, Space Grotesk font, vitest+playwright tooling); a note that the backend stays private/snapshot (no backend change); and a test plan listing the pre-flight results from Tasks 3–4.

- [ ] **Step 3: Create the PR**

Run:
```bash
cd "$REPO" && gh pr create --base main --head redesign/condensed-2026-ui \
  --title "Ship condensed 2026 UI redesign to production" \
  --body "<body from Step 2>"
```
Expected: PR URL printed. Capture it.

---

### Task 6: CI-gated squash-merge

**Files:** none.

**Interfaces:**
- Consumes: open PR from Task 5.
- Produces: the redesign merged to `main`, triggering the Vercel production build.

- [ ] **Step 1: Watch CI to completion**

Run: `cd "$REPO" && gh pr checks --watch`
Expected: both jobs (`backend`, `frontend`) report `pass`. 

If a job fails: pull its log with `gh run view <run-id> --log-failed`. Real failure → fix on the branch, push (`--force-with-lease` not needed for a normal follow-up commit), re-watch. Flake (timeout/runner/network) → `gh run rerun <run-id> --failed`. Never proceed on red.

- [ ] **Step 2: Squash-merge**

Run: `cd "$REPO" && gh pr merge --squash --delete-branch=false`
Expected: PR merged; main now has the squash commit. (Keep the branch — later phases may reference it; do not auto-delete.)

- [ ] **Step 3: Sync local main**

Run: `git -C "$REPO" checkout main && git -C "$REPO" pull origin main`
Expected: local `main` fast-forwards to the squash-merge commit. Capture the commit hash — production should deploy this.

---

### Task 7: Verify the Vercel production deploy

**Files:** none (live verification).

**Interfaces:**
- Consumes: merged `main` from Task 6.
- Produces: confirmation production serves the redesign, with rollback confirmed available.

- [ ] **Step 1: Confirm the production deployment picked up the merge commit**

Run: `cd "$REPO/frontend" && vercel ls --prod 2>/dev/null | head` (or check the Vercel dashboard for project "frontend").
Expected: the latest production deployment references the Task 6 squash-merge commit and shows state `Ready`. If the CLI is not authenticated, use the dashboard and record the deployment URL + status. If the build is still in progress, wait for `Ready` before smoke-testing.

- [ ] **Step 2: Smoke the live production URL (real HTTP via Playwright)**

Drive `https://riskpilot-coach.vercel.app` (the README's prod URL — confirm it's the project's production domain in Step 1). Assert:
- HTTP 200 on `/`.
- The redesigned Dashboard renders: verdict headline present, number cards present, condensed Coach/Analyst views (NOT the pre-redesign layout).
- Theme toggle present in the masthead.
- Ticker path `/ticker/<symbol>` renders the redesigned TickerView, and where the backend is unavailable the `BackendOffline` fallback copy renders cleanly (no crash).
- No console errors.

Capture a screenshot of `/` and the console-clean confirmation.

Expected: all assertions pass. Any failure → go to Step 4 (rollback) immediately.

- [ ] **Step 3: Confirm rollback levers are available (do not execute)**

Run: `cd "$REPO/frontend" && vercel rollback --help >/dev/null 2>&1 && echo "vercel rollback available"` and confirm the previous production deploy is still listed in `vercel ls --prod`. Also confirm `git revert <merge-commit>` is possible on `main` (clean tree).
Expected: both levers confirmed available. Record them.

- [ ] **Step 4: Rollback (ONLY if Step 2 failed)**

If and only if the prod smoke failed:
```bash
cd "$REPO/frontend" && vercel rollback   # instant-revert to previous prod deploy
git -C "$REPO" revert <squash-merge-commit>   # revert the merge on main, then push
```
Then diagnose the failure (superpowers:systematic-debugging) before retrying the phase. If Step 2 passed, SKIP this step.

- [ ] **Step 5: Phase-complete evidence summary**

Record: rebase clean; frontend build + N vitest + M playwright green; backend K pytest + eval green; CI run URL green; merge commit hash; prod deployment `Ready` on that commit; prod HTTP 200 + redesigned-Dashboard screenshot + console-clean; rollback levers confirmed. This is the phase 1 done-definition.

---

## Self-Review

**Spec coverage:** every spec execution step maps to a task — commit `.gitignore` (T1), rebase (T2), local pre-flight frontend (T3) + backend (T4), push + PR (T5), CI-gated squash-merge (T6), prod verify + rollback readiness (T7). Non-goals restated in Global Constraints. ✓

**Placeholder scan:** no TBD/TODO; the only conditional (`<body from Step 2>`, `<run-id>`, `<squash-merge-commit>`) are runtime values the executor fills from captured output, not unspecified work. Acceptable — the source of each is named. ✓

**Type/command consistency:** branch name, repo path handling (`git -C "$REPO"`), `--force-with-lease`, squash-merge, and the CI job names (`backend`, `frontend`) are consistent across tasks and match `ci.yml`. ✓

**Note for executor:** set `REPO="/Users/khanhle/Desktop/Desktop - Khanh’s MacBook Pro/💻 Dev-Projects/RiskPilot AI"` at the start of the session so `git -C "$REPO"` and `cd "$REPO/..."` resolve. `vercel`/`gh` auth may prompt — if unauthenticated, fall back to the dashboard/web and record evidence manually.
