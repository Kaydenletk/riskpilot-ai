# Phase 5a — Host Backend on Railway + Wire Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the FastAPI backend deployable to Railway (bind injected `$PORT`, deterministic Dockerfile build + healthcheck), switch the frontend's static prerender to hourly ISR so a live backend's data is picked up, and ship a human-executed deploy runbook — all as one reviewable PR.

**Architecture:** Three localized changes plus docs: (A) Dockerfile CMD binds `${PORT:-${BACKEND_PORT:-8000}}` + `backend/railway.json` declares the Dockerfile builder and `/health` healthcheck; (B) home + ticker pages export `revalidate = 3600` and the three server fetches switch from `cache: "force-cache"` to `next: { revalidate: 3600 }` (fixture fallback unchanged); (C) `.env.example` documents the prod topology and `docs/DEPLOY_BACKEND.md` gives the human the exact authed deploy steps. No engine/math changes, no new UI.

**Tech Stack:** FastAPI + uvicorn (python:3.11-slim Docker), Railway (Dockerfile builder), Next.js 15.5.19 App Router ISR, vitest + Playwright.

## Global Constraints

- Repo root: `/Users/khanhle/Desktop/Desktop - Khanh’s MacBook Pro/💻 Dev-Projects/RiskPilot AI` (quote it — spaces + non-ASCII). Refer to it as `$REPO` below; frontend dir is `$REPO/frontend`.
- Branch: `feat/host-backend-railway` (current branch; spec committed at 03b67e7). Base: `main`.
- **No engine/math changes. No new frontend UI.** Only Dockerfile, railway.json, cache-mode/revalidate lines, comments, and docs change.
- Fixture fallback MUST be preserved: every server fetch keeps its `try/catch` + `AbortSignal.timeout(2500)` + fixture return. Public function signatures unchanged.
- **No secrets in the image or repo.** Dockerfile keeps `ENV DEMO_MODE=1` (safe local default); Railway sets `DEMO_MODE=0` + keys at runtime. Frontend env stays server-side only — never `NEXT_PUBLIC_*`.
- `export const revalidate = 3600` must be a **literal** in each page file (Next.js segment config is statically analyzed — do not import a shared constant).
- The actual Railway deploy + Vercel env vars are **human-executed** (runbook) — NOT a code task. Do not run `railway` or `vercel` commands.
- Baseline (verified 2026-07-01): 16 unit tests pass (`npm run test`), 4 e2e tests exist (`npm run e2e`, starts its own dev server), Docker 29.4.0 available.
- Test commands run from `$REPO/frontend` for npm, from `$REPO` for docker.
- Commit format: `<type>: <description>` (feat/fix/docs/chore). No attribution footers (disabled globally in user settings).

---

### Task 1: Railway-ready container (Dockerfile `$PORT` + railway.json)

**Files:**
- Modify: `backend/Dockerfile` (line 1 comment, line 17 CMD)
- Create: `backend/railway.json`

**Interfaces:**
- Consumes: existing `/health` endpoint in `backend/src/riskpilot/main.py:34` (returns `{"status":"ok","demo_mode":<bool>,"live_llm":<bool>,"version":"0.1.0"}`).
- Produces: a container that binds Railway's injected `$PORT` (falls back to `BACKEND_PORT`, then 8000 — docker-compose sets `BACKEND_PORT` and no `PORT`, so compose behavior is unchanged) and a `railway.json` that Task 4's runbook and the human deploy rely on.

- [ ] **Step 1: Fix the Dockerfile CMD and header comment**

In `backend/Dockerfile`, replace line 1:

```dockerfile
# Private Python math+LLM service. Deploys to Render/Fly.
```

with:

```dockerfile
# Private Python math+LLM service. Deploys to Railway (any Dockerfile host works).
```

and replace the CMD (line 17):

```dockerfile
CMD ["sh", "-c", "uvicorn riskpilot.main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000}"]
```

with:

```dockerfile
# Railway injects $PORT; docker-compose sets BACKEND_PORT (no PORT). Prefer
# $PORT so the Railway healthcheck can reach us; fall back for compose/local.
CMD ["sh", "-c", "uvicorn riskpilot.main:app --host 0.0.0.0 --port ${PORT:-${BACKEND_PORT:-8000}}"]
```

Everything else in the Dockerfile (including `ENV DEMO_MODE=1`, `BACKEND_PORT=8000`, `EXPOSE 8000`, and the DEMO_MODE comment above CMD) stays exactly as-is.

- [ ] **Step 2: Create `backend/railway.json`**

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

- [ ] **Step 3: Build the image**

```bash
cd "$REPO" && docker build -t riskpilot-backend backend/
```

Expected: build succeeds (exit 0).

- [ ] **Step 4: Verify `$PORT` binding (Railway mode)**

```bash
docker run --rm -d -e PORT=9000 -p 9000:9000 --name rp-port-test riskpilot-backend
sleep 3 && curl -fsS http://localhost:9000/health
docker rm -f rp-port-test
```

Expected: `{"status":"ok","demo_mode":true,"live_llm":false,"version":"0.1.0"}` (200 on port **9000** proves `$PORT` wins; `demo_mode:true` proves no secrets baked in).

- [ ] **Step 5: Verify `BACKEND_PORT` fallback (compose mode)**

```bash
docker run --rm -d -e BACKEND_PORT=8500 -p 8500:8500 --name rp-compat-test riskpilot-backend
sleep 3 && curl -fsS http://localhost:8500/health
docker rm -f rp-compat-test
```

Expected: same JSON, 200 on port **8500** (no `PORT` set → `BACKEND_PORT` still honored → docker-compose unbroken).

- [ ] **Step 6: Commit**

```bash
cd "$REPO"
git add backend/Dockerfile backend/railway.json
git commit -m "feat: bind Railway \$PORT in backend container + railway.json healthcheck"
```

---

### Task 2: ISR revalidation (pages + server fetches)

**Files:**
- Modify: `frontend/src/app/page.tsx` (add segment config after imports, ~line 10)
- Modify: `frontend/src/app/ticker/[symbol]/page.tsx` (add segment config after imports, ~line 13)
- Modify: `frontend/src/lib/backend.ts:20-23` (fetchSampleReport cache option + comment)
- Modify: `frontend/src/lib/ticker-backend.ts:37-38,59-60` (both fetches' cache option + comment)

**Interfaces:**
- Consumes: existing `fetchSampleReport(): Promise<RiskReport>`, `fetchTickerUniverse(): Promise<TickerOption[]>`, `fetchTickerReport(ticker: string): Promise<TickerReport | null>` — signatures unchanged.
- Produces: pages that still prerender at build (fixture if no backend reachable) and now refresh hourly, picking up the live Railway backend's data once the human sets Vercel env vars.

- [ ] **Step 1: Add `revalidate` to the home page**

In `frontend/src/app/page.tsx`, after the imports (after `import styles from "./page.module.css";`), add:

```tsx
// ISR: prerender at build, refresh hourly. With a hosted backend the fetches
// below pick up live data on the cycle; with none, the fixture render repeats.
// Literal (not imported const): Next statically analyzes segment config.
export const revalidate = 3600;
```

- [ ] **Step 2: Add `revalidate` to the ticker page**

In `frontend/src/app/ticker/[symbol]/page.tsx`, after the imports (after `import styles from "../../page.module.css";`), add the same block:

```tsx
// ISR: prerender at build, refresh hourly. With a hosted backend the fetches
// below pick up live data on the cycle; with none, the fixture render repeats.
// Literal (not imported const): Next statically analyzes segment config.
export const revalidate = 3600;
```

`generateStaticParams` (line 16) stays exactly as-is.

- [ ] **Step 3: Switch `fetchSampleReport` to per-fetch revalidation**

In `frontend/src/lib/backend.ts`, replace lines 20–23:

```ts
      // force-cache (not no-store) so the route can prerender statically. With no
      // backend the fetch throws/times out and the committed fixture is returned;
      // when a backend is hosted, phase 5 switches this to a revalidating strategy.
      cache: "force-cache",
```

with:

```ts
      // ISR: revalidate hourly so a hosted backend's data is picked up, while
      // still allowing static prerender at build. With no backend the fetch
      // throws/times out and the committed fixture is returned.
      next: { revalidate: 3600 },
```

The `headers`, `signal: AbortSignal.timeout(2500)`, `try/catch`, and `return FIXTURE;` stay exactly as-is.

- [ ] **Step 4: Switch both fetches in `ticker-backend.ts`**

In `frontend/src/lib/ticker-backend.ts`, in `fetchTickerUniverse` replace lines 37–38:

```ts
      // force-cache (not no-store) so ticker routes prerender; fixture fallback on failure.
      cache: "force-cache",
```

with:

```ts
      // ISR: revalidate hourly (live backend picked up on the cycle); fixture fallback on failure.
      next: { revalidate: 3600 },
```

and in `fetchTickerReport` replace lines 59–60 (identical text) with the same replacement. Everything else (headers, signal, try/catch, 404 → null, fixture returns) stays exactly as-is.

- [ ] **Step 5: Run unit tests**

```bash
cd "$REPO/frontend" && npm run test
```

Expected: `Tests  16 passed (16)`.

- [ ] **Step 6: Verify the production build prerenders with ISR**

```bash
cd "$REPO/frontend" && npm run build
```

Expected: build succeeds; route table shows `/` and `/ticker/[symbol]` as prerendered (`●`/`○`) with a revalidate interval (`1h`), and 11 ticker paths generated. If any route flips to dynamic (`ƒ`), the segment config is wrong — stop and fix.

- [ ] **Step 7: Run e2e**

```bash
cd "$REPO/frontend" && npm run e2e
```

Expected: all Playwright tests pass (starts its own dev server on :3000; if one is already running it reuses it).

- [ ] **Step 8: Commit**

```bash
cd "$REPO"
git add frontend/src/app/page.tsx "frontend/src/app/ticker/[symbol]/page.tsx" frontend/src/lib/backend.ts frontend/src/lib/ticker-backend.ts
git commit -m "feat: hourly ISR — pages revalidate + server fetches use next.revalidate"
```

---

### Task 3: Prod topology docs (.env.example + deploy runbook)

**Files:**
- Modify: `.env.example` (backend + frontend section comments)
- Create: `docs/DEPLOY_BACKEND.md`

**Interfaces:**
- Consumes: Task 1's `railway.json` + `$PORT` behavior; Task 2's ISR semantics (runbook explains the hourly refresh); `/health` JSON shape from `backend/src/riskpilot/main.py:34`.
- Produces: the runbook the human executes; `.env.example` documents which vars map to Railway vs Vercel in prod.

- [ ] **Step 1: Update `.env.example` prod topology comments**

In `.env.example`, replace the backend section header comment (the two lines):

```bash
# ── Backend (Python math+LLM service — PRIVATE, never public) ───────────────
# Default-on when OPENAI_API_KEY is empty. Serves fixture reports, no key needed.
```

with:

```bash
# ── Backend (Python math+LLM service — PRIVATE, never public) ───────────────
# Prod: these live as Railway service variables (DEMO_MODE=0 + a funded key).
# See docs/DEPLOY_BACKEND.md. Locally, DEMO_MODE default-on when
# OPENAI_API_KEY is empty — serves fixture reports, no key needed.
```

and replace the frontend section header comment (the two lines):

```bash
# ── Frontend (Next.js — the ONLY public surface) ────────────────────────────
# Server-side only. Private URL of the Python service. Browser never sees this.
```

with:

```bash
# ── Frontend (Next.js — the ONLY public surface) ────────────────────────────
# Prod: these live as Vercel env vars (BACKEND_INTERNAL_URL = the Railway URL).
# Server-side only. Private URL of the Python service. Browser never sees this
# (never NEXT_PUBLIC_*). See docs/DEPLOY_BACKEND.md.
```

All variable lines and other comments stay exactly as-is.

- [ ] **Step 2: Create `docs/DEPLOY_BACKEND.md`**

````markdown
# Deploy the Backend to Railway (human-executed runbook)

Phase 5a: host the FastAPI risk engine on Railway with the **live** guardrailed
LLM (`DEMO_MODE=0`), then point the Vercel frontend at it. The committed
fixture remains the automatic fallback — a Railway outage degrades to the
snapshot, never a hard error.

Everything here needs YOUR authed CLIs (`railway`, `vercel`); nothing is
automated. ~15 minutes.

## Prerequisites

- Railway account + CLI: `npm i -g @railway/cli` (or `brew install railway`)
- A funded OpenAI API key
- Vercel CLI authed to the `riskpilot-coach` project

## 1. Create the Railway service

```bash
cd backend/
railway login
railway init        # or `railway link` to an existing project
```

`backend/railway.json` pins the Dockerfile builder and the `/health`
healthcheck — no dashboard build config needed. The container binds Railway's
injected `$PORT` automatically.

## 2. Set the service variables

```bash
railway variables --set "DEMO_MODE=0" \
  --set "OPENAI_API_KEY=<funded key>" \
  --set "OPENAI_MODEL=gpt-5.5" \
  --set "INTERNAL_SHARED_SECRET=$(openssl rand -hex 32)"
```

Copy the generated `INTERNAL_SHARED_SECRET` — step 4 needs the same value.
Never commit any of these.

## 3. Deploy + smoke test

```bash
railway up
railway domain        # generate/show the public URL
curl -fsS https://<railway-url>/health
```

Expected: `{"status":"ok","demo_mode":false,"live_llm":true,"version":"0.1.0"}`.
`demo_mode:false, live_llm:true` = the guardrailed live LLM is on. If the
deploy healthcheck fails, the container isn't binding `$PORT` — check the
deploy logs before anything else.

Authenticated smoke (should be 200 with the secret, 401 without):

```bash
curl -fsS -H "x-internal-secret: <secret>" https://<railway-url>/report/sample | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" https://<railway-url>/report/sample   # → 401
```

## 4. Point Vercel at it

Server-side env vars only (NOT `NEXT_PUBLIC_*`):

```bash
vercel env add BACKEND_INTERNAL_URL production          # https://<railway-url>
vercel env add INTERNAL_SHARED_SECRET_FRONTEND production   # same secret as step 2
vercel --prod   # redeploy so the build picks them up
```

## 5. Verify prod

- Dashboard explanation shows `explanation.source: model` (or
  `model_regenerated`) — not `demo_fixture`.
- The `BackendOffline` panel no longer renders.
- Pages revalidate hourly (ISR): backend data changes appear within an hour,
  or immediately on the next `vercel --prod`.

## Rollback

Unset the two Vercel env vars (`vercel env rm ...`) and redeploy — prod
returns to the committed fixture snapshot. The Railway service can stay up or
be paused; nothing else depends on it.
````

- [ ] **Step 3: Commit**

```bash
cd "$REPO"
git add .env.example docs/DEPLOY_BACKEND.md
git commit -m "docs: Railway deploy runbook + prod topology in .env.example"
```

---

### Task 4: Full verification + PR

**Files:**
- None created/modified (verification + PR only).

**Interfaces:**
- Consumes: all prior tasks' commits on `feat/host-backend-railway`.
- Produces: the reviewable PR the spec requires; the human executes `docs/DEPLOY_BACKEND.md` after merge.

- [ ] **Step 1: Backend tests still green (no engine changes — sanity)**

```bash
cd "$REPO/backend" && . .venv/bin/activate && pytest -q
```

Expected: all pass. (If `.venv` is missing, run `make install` from `$REPO` first.)

- [ ] **Step 2: Frontend suite green**

```bash
cd "$REPO/frontend" && npm run test && npm run build
```

Expected: 16 unit tests pass; build prerenders `/` + 11 tickers with `1h` revalidate.

- [ ] **Step 3: Diff review against the spec**

```bash
cd "$REPO" && git diff main...HEAD --stat
```

Expected files ONLY: the spec doc, this plan, `backend/Dockerfile`, `backend/railway.json`, `frontend/src/app/page.tsx`, `frontend/src/app/ticker/[symbol]/page.tsx`, `frontend/src/lib/backend.ts`, `frontend/src/lib/ticker-backend.ts`, `.env.example`, `docs/DEPLOY_BACKEND.md`. Anything else = scope creep — stop.

- [ ] **Step 4: Push + open PR**

```bash
cd "$REPO"
git push -u origin feat/host-backend-railway
gh pr create --base main --title "Phase 5a: host backend on Railway + wire live + hourly ISR" --body "$(cat <<'EOF'
## Summary
- Backend container binds Railway's injected `$PORT` (compose `BACKEND_PORT` fallback kept) + `railway.json` pins the Dockerfile builder and `/health` healthcheck
- Home + ticker pages now use hourly ISR (`revalidate = 3600`); the three server fetches switch `force-cache` → `next: { revalidate: 3600 }` — fixture fallback (`try/catch` + 2.5s timeout) unchanged
- `docs/DEPLOY_BACKEND.md`: human-executed runbook (Railway service + secrets + Vercel env) — no secrets in this PR; `.env.example` documents the prod topology

Spec: `docs/superpowers/specs/2026-07-01-phase5a-host-backend-railway-design.md`

## Test plan
- [x] `docker build backend/` + `docker run -e PORT=9000` → `/health` 200 on 9000 (Railway mode)
- [x] `docker run -e BACKEND_PORT=8500` → `/health` 200 on 8500 (compose mode unbroken)
- [x] `npm run test` — 16 unit tests green
- [x] `npm run build` — `/` + 11 tickers prerender with `1h` revalidate
- [x] `npm run e2e` — Playwright green
- [x] backend `pytest -q` green (no engine changes)
- [ ] Post-merge (human, runbook): Railway `/health` → `demo_mode:false, live_llm:true`; prod `explanation.source` = `model`
EOF
)"
```

Expected: PR URL printed.

---

## Self-Review (done at plan time)

- **Spec coverage:** A (Dockerfile `$PORT` + railway.json + no baked secrets) → Task 1. B (Vercel env via runbook — no fetch-topology code change — + `.env.example` docs) → Tasks 3/1. C (ISR: page `revalidate` + per-fetch `next.revalidate`, keep `generateStaticParams`, keep fallback) → Task 2. D (runbook with the 6 spec steps incl. smoke + verify) → Task 3. Verification section (docker `$PORT` proof, build prerender, unit+e2e, human post-deploy) → Tasks 1/2/4 + runbook. No gaps.
- **Placeholder scan:** all steps carry exact file contents/commands; runbook uses `<railway-url>`/`<funded key>` placeholders intentionally (human secrets, must not be committed).
- **Type consistency:** no new types; public fetch signatures unchanged everywhere they're mentioned.
