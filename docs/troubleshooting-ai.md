# Troubleshooting the AI Tier

Operational notes for diagnosing "Enhance with AI" (`api/analyze.ts`) failures.
Written after a live incident; the method here is reusable for any future
provider problem.

## Resolved Incident — "AI analysis is unavailable right now"

**Symptom.** After the keys were correctly configured on Vercel, clicking
"Enhance with AI" on the live site kept showing *"AI analysis is unavailable
right now. Using local analysis instead."* — the generic client-side fallback
message, not a specific server reason.

**Root cause.** A **client-side timeout that was too short for the upgraded
call.** `src/utils/aiAnalysis.ts` aborted the request after **8 seconds** — a
value chosen back when the AI step was a lightweight classify-only Haiku call
(`max_tokens: 512`). When the step was later upgraded to Sonnet *plus* page-copy
generation (`max_tokens: 1536`, keystone 14), a real call now takes **~8
seconds** (measured: 8.15s including a serverless cold start). The browser was
aborting the request a fraction of a second **before** the successful response
arrived. The server was succeeding the whole time. Separately, `vercel.json`
had no `maxDuration` on the function, so it fell back to the platform default
(10s on the free tier) — also tight.

**Fix.**
- `src/utils/aiAnalysis.ts`: client abort timeout **8s → 25s** (commit
  `262acac`, PR #13).
- `vercel.json`: `functions["api/analyze.ts"].maxDuration: 30`, so the server
  limit is generous and the client times out first, gracefully.
- `api/analyze.ts`: on a `provider_error`, the response now includes the real
  upstream `providerStatus` and a sanitized `providerError` snippet so the next
  failure is diagnosable instead of generic (commit `07324c9`).

The AI tier is now verified working end to end on the live deployment: a real
640×480 reference returned HTTP 200 in ~8s with a full analysis + generated page
copy (it read the headline text in the image and wrote a matching premium page).

## How It Was Diagnosed (reusable method)

The breakthrough was **calling the live endpoint directly and watching two
numbers: the HTTP status and the total time.** The browser UI only shows a
friendly message; `curl` shows the truth.

```bash
# 1. Cheapest check — is it even configured? (no image, $0, no model call)
curl -s -X POST -H "Content-Type: application/json" -d '{}' \
  -w "\nHTTP:%{http_code}\n" https://<your-site>/api/analyze
#   501 not_configured  -> a key/env var is missing or the deploy is stale
#   400 invalid_request -> CONFIGURED correctly (it just wants a real image)

# 2. Real call with a properly-sized image (costs ~1 Sonnet call, a few cents)
#    Watch TIME_TOTAL — it is the tell for a timeout problem.
curl -s -X POST -H "Content-Type: application/json" --data @payload.json \
  -w "\nHTTP:%{http_code}\nTIME:%{time_total}s\n" \
  --max-time 60 https://<your-site>/api/analyze
```

Key realizations from this incident:
- **The timing was the tell.** A failure at **0.75s** is not a timeout — it is
  an instant rejection (auth/validation). A success at **~8s** against an **8s**
  client timeout is the timeout, exactly.
- **Use a real, properly-sized test image.** The first diagnostic used a **1×1
  pixel** PNG, which Anthropic rejects with `400 "Could not process image"` —
  that is a degenerate-test-image artifact, **not** a real bug. A 640×480 image
  succeeded. Always test with a realistic image before concluding the pipeline
  is broken.
- **The presence check is not a validity check.** The endpoint's
  `not_configured` gate only checks that `ANTHROPIC_API_KEY` *exists*, not that
  it is *valid*. A wrong/mis-pasted key passes that gate and fails later at the
  provider call — which is why surfacing `providerStatus` matters.

## Key Flags for API Errors

When "Enhance with AI" fails, match what you see to this table. The `reason` and
(on provider failures) `providerStatus` fields in the `/api/analyze` JSON
response are the fastest way to localize the problem.

| What you observe | `reason` / status | What it means | Fix |
|---|---|---|---|
| *"...is not configured (no provider key)"* | `not_configured` / **501** | `ANTHROPIC_API_KEY` is missing, **or** the deployment is stale (env var saved but not redeployed) | Set the key in Vercel → **redeploy** |
| *"...no durable rate-limit store..."* | `not_configured` / **501** | `UPSTASH_REDIS_REST_URL` / `_TOKEN` missing | Add both Upstash vars → redeploy |
| *"Expected a JSON body with an image..."* | `invalid_request` / **400** | The endpoint is configured fine; the request just had no valid image. Seeing this from a bare `curl` is the **good** sign that config passed. | n/a — send a real image |
| *"AI analysis is unavailable right now"* (generic) | client `network_error` | The browser `fetch` threw — almost always the **client timeout** (a slow/cold call exceeding the limit) or a dropped connection. | Already mitigated (25s). If it recurs, the call is genuinely slow — retry once warm. |
| *"The AI analysis provider failed... (provider status 401)"* | `provider_error` / **401** | **Bad API key** — present but invalid (mis-paste, truncation, trailing space, wrong key) | Re-create the key in the Anthropic Console and re-paste carefully |
| *"...(provider status 403)"* | `provider_error` / **403** | Key is valid but the **account lacks credit or model access** | Confirm the $5 landed on the **same** org/workspace as the key |
| *"...(provider status 404)"* | `provider_error` / **404** | The **model id isn't available** to this account | Check the `model` string in `api/analyze.ts` (currently `claude-sonnet-4-6`) |
| *"...(provider status 429)"* | `provider_error` / **429** | **Anthropic-side** rate limit (distinct from this app's own Upstash limiter, which returns `rate_limited`/429 with a different message) | Retry after a moment |
| *"...(provider status 400) ... Could not process image"* | `provider_error` / **400** | The image itself was rejected (too small/degenerate, unsupported, or corrupt data URL) | Use a real, properly-sized PNG/JPEG/WebP |
| *"Too many AI analysis requests right now"* | `rate_limited` / **429** | This app's **own** Upstash limiter (per-IP 10/min or global 500/day) | Wait; or raise the limits in `api/analyze.ts` |

**Budget reminder:** the hard spend ceiling is the prepaid balance on the
Anthropic key (load $5, auto-reload OFF). When it is exhausted, calls fail and
the app falls back to the free local analyzer — see `docs/ai-analysis.md` and
`docs/setup-ai.md`.
