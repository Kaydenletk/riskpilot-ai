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
SECRET=$(openssl rand -hex 32)
railway variables --set "DEMO_MODE=0" \
  --set "OPENAI_API_KEY=<funded key>" \
  --set "OPENAI_MODEL=gpt-5.5" \
  --set "INTERNAL_SHARED_SECRET=$SECRET"
echo "$SECRET"   # step 4 sets the same value on Vercel — copy it now
```

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
  `model_regenerated`) — not `demo_fixture`. **This is THE signal**: the
  fixture fallback means a broken deploy degrades silently to the snapshot
  (no error panel), so only the source field proves live wiring.
- Pages revalidate hourly (ISR): backend data changes appear within an hour,
  or immediately on the next `vercel --prod`.

## Rollback

Unset the two Vercel env vars (`vercel env rm ...`) and redeploy — prod
returns to the committed fixture snapshot. The Railway service can stay up or
be paused; nothing else depends on it.
