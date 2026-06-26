# AI-Assisted Analysis (Hybrid)

This milestone splits "analyze the reference image" into two tiers: a real,
free, local analyzer that always works, and an optional LLM-backed analyzer
that is currently scaffolded but not yet wired to a provider.

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
- **Tier 2 (optional, currently stubbed):** an "Enhance with AI" action
  (`src/utils/aiAnalysis.ts`, wired into `src/App.vue`) that POSTs the
  reference image to `/api/analyze` and merges the response into
  `referenceAnalysis` on success.

Tier 2 is designed to fail closed: any non-success response (`not_configured`,
`rate_limited`, `provider_error`, a timeout, a network error) just leaves the
analyzer fields exactly as the user set them, with a status message. Nothing
about Tier 1 depends on Tier 2 being configured.

## The `/api/analyze` Proxy

`api/analyze.ts` is a Vercel serverless function. It exists so an API key
never reaches the browser — see the file's own header comment for why this
matters and what a key-in-the-client approach would expose.

Implemented now:

- Request validation (POST only, body shape, image size cap).
- Per-IP and global daily rate limiting (in-memory — see the **Known
  Limitation** below before relying on this in production).
- A structured `{ ok, reason, message }` response contract the frontend
  already codes against.

**Not implemented:** `callVisionProvider()` throws
`AI_PROVIDER_NOT_CONFIGURED` and the endpoint responds with
`{ ok: false, reason: 'not_configured' }` for every request. The function's
own comments document exactly what filling this in requires: provider
choice, API key env var, structured-output schema, model choice, and a
request timeout. No provider call has been made from this codebase.

### Known Limitation: Rate Limiting Is Not Yet Durable

The current limiter is a module-level `Map`, scoped to a single warm
serverless instance. Vercel runs multiple instances concurrently, so this
does **not** enforce a true global or per-IP cap across the deployment — it
only bounds traffic within one instance. It is real enough to exercise the
request/response contract end-to-end, but not enough to trust for cost
control once a paid provider call is behind it.

The fix is a shared store — Upstash Redis (`@upstash/ratelimit` +
`@upstash/redis`) or Vercel KV are the standard pairing for this. **This is a
new dependency and has been deliberately left out of this change** rather
than added silently — flag it to the user before installing.

## Choosing a Provider (Not Decided Yet)

Any vision-capable model with structured JSON output works here — this is a
simple classification task, not a reasoning task. Candidates considered:

- **Claude (Haiku)** — cheap, vision-capable, structured output via
  `output_config.format`.
- **Gemini** — has historically offered a genuinely free tier (not just
  prepaid credits); verify current limits before relying on it, since terms
  change.
- **OpenAI (`gpt-4o-mini`)** — cheap, vision-capable, structured output via
  `response_format: { type: "json_schema" }`.

Whichever is chosen, the cost should be bounded with a **prepaid balance +
hard spend cap** in that provider's console — not an open-ended pay-as-you-go
account — since this endpoint is reachable by anyone with the deployed link.

## Not Implemented Yet

- The actual provider call (`callVisionProvider` in `api/analyze.ts`).
- A durable, cross-instance rate limiter (Upstash/Vercel KV).
- An API key / environment variable (none exists yet — nothing to rotate or
  secure today).

## Next Step

Pick a provider, add its SDK as a flagged new dependency, implement
`callVisionProvider()` against a JSON schema matching
`Partial<ReferenceAnalysis>`, and set the API key as a Vercel environment
variable. The frontend (`src/utils/aiAnalysis.ts`, the "Enhance with AI"
button in `src/App.vue`) needs no changes — it already handles both the
success and every failure shape.
