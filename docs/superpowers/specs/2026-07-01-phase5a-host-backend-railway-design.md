# Phase 5a — Host the Backend on Railway + Wire Live

**Date:** 2026-07-01
**Status:** Approved (design), pending spec review
**Part of:** RiskPilot AI investor-readiness sequence (phase 5a of 6; 5b = CSV upload)

## Context

The Python risk engine (FastAPI) has never been hosted — prod (`riskpilot-coach.vercel.app`)
renders from committed snapshots. Verified state (`main` c52ab50):

- Backend is deploy-ready: `backend/Dockerfile` (python:3.11-slim, `pip install -e .`,
  uvicorn), `/health` endpoint, env-driven `config.py`
  (`DEMO_MODE`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `INTERNAL_SHARED_SECRET`).
- **Dockerfile CMD binds `${BACKEND_PORT:-8000}`** — Railway injects `$PORT`, so the
  container must listen on `$PORT`. This needs a fix (see A).
- Frontend already prefers a live backend: `backend.ts` / `ticker-backend.ts` fetch
  `process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000"` then fall back to the
  committed fixture. **No Vercel env vars are set** → prod always uses the fixture.
- Phase 4 set those fetches to `cache: "force-cache"` for static prerender. With a live
  backend + ISR, they must participate in revalidation (see C).
- The Next server authenticates to the backend with `x-internal-secret` =
  `INTERNAL_SHARED_SECRET_FRONTEND`, which must equal the backend's
  `INTERNAL_SHARED_SECRET`.

## Decisions (approved)

- **Host:** Railway (builds the existing Dockerfile).
- **Prod LLM:** **Live** — `DEMO_MODE=0` + a funded `OPENAI_API_KEY`. Real
  hallucination-guardrail demo.
- **Execution split:** I prepare all code + config + a deploy runbook as a reviewable
  PR. **The human runs the authed Railway deploy** (`railway up`, secrets) and sets the
  Vercel env vars — Railway is not wired into this session.
- **ISR:** now that a live backend exists, home + ticker revalidate hourly (the phase-4
  handoff). Replaces "fully static, no revalidate."

## Goal

The FastAPI engine runs on Railway with the live guardrailed LLM; the Vercel frontend
prefers it (fixture remains the fallback); static pages revalidate hourly.

## Non-Goals

- No CSV upload (phase 5b).
- No engine/math changes.
- No new frontend UI (the prefer-live plumbing already exists).

## Design

### A. Railway-ready container

- Fix the Dockerfile CMD to bind Railway's injected `$PORT` (fall back to 8000 for
  local): `uvicorn riskpilot.main:app --host 0.0.0.0 --port ${PORT:-8000}`. This stays
  compatible with docker-compose (which sets `BACKEND_PORT`/no `PORT`) — so also accept
  `${PORT:-${BACKEND_PORT:-8000}}`.
- Add `backend/railway.json` (or `railway.toml`) declaring the Dockerfile builder and a
  `/health` healthcheck path, so Railway builds deterministically.
- Do NOT bake secrets into the image — they come from Railway env at runtime (the
  Dockerfile's `ENV DEMO_MODE=1` default stays as the safe local default; Railway sets
  `DEMO_MODE=0`).

### B. Wire the frontend to the live backend

- No frontend code change to the fetch topology — it already reads
  `BACKEND_INTERNAL_URL` + `INTERNAL_SHARED_SECRET_FRONTEND`. The runbook sets these as
  **Vercel env vars** (server-side, never `NEXT_PUBLIC_*`):
  - `BACKEND_INTERNAL_URL` = the Railway service URL
  - `INTERNAL_SHARED_SECRET_FRONTEND` = the shared secret (= backend's
    `INTERNAL_SHARED_SECRET`)
- Update `.env.example` / docs to describe the prod topology (Railway URL, live mode).

### C. ISR revalidation (phase-4 handoff)

- Add `export const revalidate = 3600;` to `app/page.tsx` and
  `app/ticker/[symbol]/page.tsx`. Keep `generateStaticParams`.
- Change the server fetches from `cache: "force-cache"` to
  `next: { revalidate: 3600 }` (per-fetch revalidation) so a hosted backend's data is
  picked up on the hourly cycle while still allowing static prerender at build. Keep the
  `try/catch` + `AbortSignal.timeout(2500)` fixture fallback (covers a backend blip).
- Net: pages prerender at build (from live backend if reachable, else fixture) and
  refresh hourly.

### D. Deploy runbook (human-executed, in the PR)

A `docs/DEPLOY_BACKEND.md` with exact steps:
1. `railway login`, `railway init` (or link) in `backend/`.
2. Set service vars: `DEMO_MODE=0`, `OPENAI_API_KEY=<funded key>`,
   `OPENAI_MODEL=<pin>`, `INTERNAL_SHARED_SECRET=<random>`.
3. `railway up` → get the service URL.
4. Smoke: `curl $URL/health` → `{"status":"ok","demo_mode":false,"live_llm":true}`.
5. Set Vercel env (`BACKEND_INTERNAL_URL`, `INTERNAL_SHARED_SECRET_FRONTEND`) via
   `vercel env add` (production), then redeploy the frontend.
6. Verify prod: the dashboard now shows `explanation.source: model` (not
   `demo_fixture`), and the `BackendOffline` path no longer triggers.

## Error handling

- Backend unreachable → frontend falls back to the committed fixture (existing behavior),
  so a Railway outage degrades gracefully to the snapshot, not a hard error.
- Bad/absent secret → backend returns 401; the frontend catch falls back to fixture.
- Wrong `$PORT` binding → Railway healthcheck fails fast (caught at deploy, not silently).

## Verification (evidence required)

- Local: `docker build backend/` succeeds; `docker run -e PORT=9000 ...` → `/health` 200
  on 9000 (proves `$PORT` binding).
- Build: frontend `npm run build` still prerenders home + 11 tickers with `revalidate`.
- Unit + e2e stay green.
- Post-deploy (human): `$URL/health` shows `demo_mode:false, live_llm:true`; prod
  dashboard `explanation.source` = `model`/`model_regenerated`.

## Success criteria

The engine runs live on Railway with the guardrailed LLM; prod prefers it with fixture
fallback; pages revalidate hourly. The human has a runbook and executes the authed
deploy. 5b (upload) then builds on a live backend.
