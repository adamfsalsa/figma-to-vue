# AI-Assisted Analysis (Hybrid)

This milestone splits "analyze the reference image" into two tiers: a real,
free, local analyzer that always works, and an optional LLM-backed analyzer
(claude-sonnet-4-6) that classifies the layout **and generates the page copy
from the image** — faithful when the reference is clear, invented when it is
vague. It is fully implemented but stays dormant until an API key and rate-limit
store are configured. The app is safe and useful with neither.

**Works for both reference sources the app supports:** an uploaded image file,
or a Figma URL import (`docs/figma-import.md`). An uploaded file is downscaled
client-side and sent as an `image` data URL, exactly as before. A Figma import
has no local file — only a remote preview URL Figma returned — so it is sent as
an `imageUrl` instead, and `api/analyze.ts` fetches it **server-side** (the
browser never makes this request). That fetch is restricted to Figma's own
preview hosts (`isAllowedFigmaPreviewHost()` — `figma.com` and its subdomains
only, over `https://` only), so the endpoint cannot be used as an open SSRF
proxy for arbitrary URLs.

## What Works Today (No LLM, No Key, $0)

`src/utils/colorExtraction.ts` runs entirely in the browser:

- Decodes the uploaded reference image to an offscreen canvas.
- Quantizes pixels into a coarse RGB grid and keeps the most frequent buckets
  as a real dominant-color palette.
- Computes average relative luminance and a derived `isDark` flag.

This replaces the previously hardcoded `tokens` block in the JSON page plan
(`src/utils/pagePlan.ts`) with real extracted values. It runs on every
upload, requires no API key, and cannot fail in a way that blocks the rest of
the pipeline — any decode/canvas error resolves to placeholder tokens instead
of throwing (see the function-level comments in that file).

The pure quantization logic (`quantizePixelsToVisualTokens`) is unit-tested
in `tests/colorExtraction.test.ts` against synthetic pixel buffers. The
canvas-drawing wrapper (`extractVisualTokensFromImage`) is not separately
unit-tested — jsdom has no real canvas pixel pipeline — and is covered only
indirectly by the existing upload tests in `tests/App.test.ts`, where it
silently falls back to placeholder tokens.

## What Genuinely Requires an LLM

Color and luminance are the limit of what classic image processing can
honestly claim here. The semantic fields on `ReferenceAnalysis`
(`src/types/referenceAnalysis.ts`) — `heroComposition`, `mediaEmphasis`,
`layoutPattern`, `ctaStyle`, `visualNotes` — require recognizing what is
*in* the image (a hero, a CTA, a grid) rather than measuring its pixels. No
amount of edge detection or palette extraction gets there reliably. This is
why the `ReferenceAnalyzer` component still asks a human to fill those fields
in by hand: it is the honest option until a vision-capable model is wired up.

## The Hybrid Design

- **Tier 1 (always on):** the local extractor above, plus the existing
  human-guided `ReferenceAnalyzer` form. Works for every visitor, free,
  no key, no proxy.
- **Tier 2 (optional, dormant until configured):** an "Enhance with AI" action
  (`src/utils/aiAnalysis.ts`, wired into `src/App.vue`) that POSTs the
  reference image to `/api/analyze` and merges both the analysis and the
  generated `content` into the plan on success. The provider call is implemented
  (Sonnet) but returns `not_configured` until the env vars are set — see below.

Tier 2 is designed to fail closed: any non-success response (`not_configured`,
`rate_limited`, `provider_error`, a timeout, a network error) just leaves the
analyzer fields exactly as the user set them, with a status message. Nothing
about Tier 1 depends on Tier 2 being configured.

## The `/api/analyze` Proxy

`api/analyze.ts` is a Vercel serverless function. It exists so an API key
never reaches the browser — see the file's own header comment for why this
matters and what a key-in-the-client approach would expose.

Implemented now:

- Request validation (POST only, body shape, image size cap, supported media
  types). Accepts either `{ image }` (a data URL) or `{ imageUrl }` (a Figma
  preview URL, validated against `isAllowedFigmaPreviewHost()` and fetched
  server-side with a timeout and byte-size cap before being handed to the model
  in the same shape as an upload).
- A real **`claude-sonnet-4-6`** vision call. The model returns a JSON object
  that (a) classifies the layout into the `ReferenceAnalysis` enums and (b)
  **generates the page copy** — kicker, title, summary, and 2–4 sections —
  under a `content` key. The prompt instructs it to read and adapt real text
  when the reference is a clean mockup/Figma frame, and to **invent coherent,
  premium copy when the reference is vague** (a sketch or scribble), always
  returning complete content. Both halves are validated/sanitized server-side
  (enums dropped if off-list; content trimmed/capped), so a malformed response
  degrades gracefully. `max_tokens` is 1536 to leave room for the generated copy.
- Timeouts sized for that heavier call: the client (`src/utils/aiAnalysis.ts`)
  aborts after 25s, and `vercel.json` sets `functions["api/analyze.ts"].
  maxDuration: 30` so the server-side limit isn't the platform default (10s on
  Vercel's free tier — too tight for Sonnet vision + content generation plus a
  cold start). If "Enhance with AI" ever shows *"AI analysis is unavailable
  right now"* despite the keys being configured, a slow cold-started call
  timing out is the most likely cause — retrying usually succeeds once the
  function is warm. For the full diagnosis method and an error-flag reference,
  see `docs/troubleshooting-ai.md`.
- The generated `content` flows into `buildPagePlan` as an override, so the
  rendered page (preview, Vue SFC, HTML) shows copy derived from the image
  instead of the deterministic templated placeholder text.
- Durable per-IP and global-daily rate limiting backed by Upstash Redis (see
  below).
- A structured `{ ok, reason, message }` response contract the frontend
  already codes against.

The model API key is read from `ANTHROPIC_API_KEY` (server-side env only). No
key is committed; nothing in the browser bundle can see it.

> **Note:** this codebase has not made a live billed call — the provider
> integration is written and typechecked but only runs once `ANTHROPIC_API_KEY`
> and the Upstash store are configured in Vercel. Treat the first real call as
> the integration smoke test.

### Why this code uses prompt-+-validate instead of structured outputs

The installed `@anthropic-ai/sdk` (0.106.x) only types `output_config.format`
on the **beta** messages resource, not GA `messages.create`. To keep the call
on the stable surface and still guarantee valid output, the function uses a
strict JSON-only system prompt plus server-side validation against the enum
lists. If a later SDK version types `output_config.format` on GA, switching to
structured outputs is a safe follow-up — the enum lists in `api/analyze.ts`
already match the schema you'd hand it.

### Durable Rate Limiting (Upstash)

Rate limiting is backed by **Upstash Redis** (`@upstash/ratelimit` +
`@upstash/redis`) so the cap is shared across all serverless instances —
unlike an in-memory counter, which only bounds one warm instance. Limits:

- Per IP: `10` requests / minute.
- Global: `500` requests / day across the whole deployment.

**Fail-safe by design:** if the Upstash store is not configured, the endpoint
returns `not_configured` and refuses to call the billable model at all. If the
store is configured but unreachable at request time, it returns `rate_limited`
and skips the call. In both cases the frontend falls back to the free local
analyzer. The endpoint never calls the paid model without a working cap.

Requires two Vercel environment variables: `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` (created in the Upstash console when you make the
Redis database). Vercel KV would work identically if you prefer one vendor.

## Guaranteeing You Never Exceed $5

The rate limiter stops the budget being burned in one burst, but it is **not**
the spend ceiling. The hard ceiling comes from the provider account:

1. In the Anthropic Console, create an API key for this project.
2. Load exactly **$5** of prepaid credit and **turn auto-reload OFF** — this is
   the setting that actually guarantees the cap; auto-reload would silently top
   it up.
3. Set a **workspace spend limit of $5** as a second, independent backstop.
4. When the $5 is consumed, model requests start failing and the frontend falls
   back to the free local analyzer. You cannot go negative or exceed what you
   loaded.

Cost math (Sonnet 4.6, $3/MTok in, $15/MTok out): because the call now also
generates page copy (not just classifies), each "Enhance with AI" generation is
roughly **$0.02–0.05**, so **$5 ≈ 100–250 generations** before it falls back to
the free local analyzer. Two code-side levers bound per-call cost: `max_tokens:
1536` in `api/analyze.ts`, and client-side image downscaling to a 768px max edge
before upload (`fileToDownscaledDataUrl` in `src/utils/aiAnalysis.ts`).

> The detailed, click-by-click operator steps for adding the key live in
> **`docs/setup-ai.md`**.

## Configuration Checklist (Operator)

To turn the AI tier on:

- [ ] `ANTHROPIC_API_KEY` set in the Vercel project (server-side env).
- [ ] Anthropic account: $5 prepaid, **auto-reload off**, $5 workspace spend limit.
- [ ] Upstash Redis database created; `UPSTASH_REDIS_REST_URL` and
      `UPSTASH_REDIS_REST_TOKEN` set in Vercel.
- [ ] Redeploy, then make one real upload + "Enhance with AI" as the smoke test.

Until all of these are in place, the endpoint returns `not_configured` and the
app runs entirely on the free local analyzer — which is the intended safe
default.

## Not Implemented Yet

- A live billed call has not been made from this codebase (no key configured
  here). The integration is written and typechecked, not runtime-verified.
- Optional upgrade: switch to structured outputs (`output_config.format`) once
  the SDK types it on GA messages.

## Next Step

Wire the four configuration items above in Vercel and run the smoke test. No
code change is required to enable the feature — `src/utils/aiAnalysis.ts` and
the "Enhance with AI" button in `src/App.vue` already handle the success path
and every failure shape, and `callVisionProvider()` in `api/analyze.ts` is the
implemented Sonnet call. The detailed click-by-click setup is in
`docs/setup-ai.md`.
