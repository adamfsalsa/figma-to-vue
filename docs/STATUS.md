# Project Status & Handoff

Single entry point for whoever picks this up next. Last updated after the live
preview milestone (keystone 11).

## Current State

The pipeline runs end to end. `main` is the source of truth and is fully
synced; all feature work has been merged via PRs #1 and #2.

- **Build / typecheck / tests all green:** `npm run build`, `npm run typecheck`,
  `npm run test` (35 tests across 8 files) pass.
- **Deploys on Vercel** as a static Vite build. The app is fully usable with no
  configuration — the AI tier is optional and dormant by default.

## What's Done (see `pipeline-keystones.md` for the full list)

1. Reference intake (drag-drop/file, local preview).
2. Human-guided `ReferenceAnalyzer` form.
3. **Real local color/token extraction** from image pixels — no LLM, no key
   (`src/utils/colorExtraction.ts`, `docs/ai-analysis.md`).
4. Constrained, typed JSON page plan (`src/utils/pagePlan.ts`).
5. Static one-page preview + styled HTML export.
6. **Real Vue 3 SFC generation**, layout-aware by `layoutPattern`
   (`src/utils/vueCodegen.ts`, `docs/vue-codegen.md`).
7. **Optional AI tier** — a key-safe Vercel proxy (`api/analyze.ts`) calling
   `claude-haiku-4-5`, with durable Upstash rate limiting. Implemented but
   dormant until env vars are set (`docs/ai-analysis.md`).
8. **One-click live preview** overlay with an interactive CTA, for non-coders
   (`src/components/GeneratedPagePreview.vue`, `docs/live-preview.md`).

## To Enable the AI Tier (operator, optional)

The app refuses to call the billable model unless all of these are set in the
Vercel project — until then `/api/analyze` returns `not_configured` and the app
uses the free local analyzer. Full detail + the "never exceed $5" steps are in
`docs/ai-analysis.md`.

- `ANTHROPIC_API_KEY` — load $5 prepaid, **auto-reload OFF**, $5 workspace cap.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — durable rate limiter.

See `.env.example` and `docs/deployment.md`.

## Open Follow-Ups (nothing is blocking)

Consolidated from the per-doc "Next Step" sections:

- **AI tier is not runtime-verified.** No live billed call has been made from
  this codebase; the first real call on Vercel is the integration smoke test.
- **CTA parity:** the live preview shows a CTA derived from `ctaStyle`, but the
  "Copy HTML" export and the generated SFC do **not** include it yet — the three
  artifacts differ on that one element. (`docs/live-preview.md`)
- **Standalone preview:** add an "open in new tab" backed by the styled HTML so
  the preview is a real `h1`-rooted page (preview headings are `h3`/`h4` to fit
  the host outline).
- **Richer SFC:** child components for repeated structures; deepen the
  `finder-flow` variant toward the accessible native-radio pattern in
  `src/components/RideFinder.vue`. (`docs/vue-codegen.md`)
- **Structured outputs:** the AI call uses prompt-plus-validate; switch to
  `output_config.format` once the SDK types it on GA messages.
  (`docs/ai-analysis.md`)
- **Content fidelity:** generated section copy is templated from the plan, not
  read from the image. Real text/layout reproduction (e.g. OCR) is out of scope
  so far — the tool is a scaffolder, not a pixel clone.
- **Deploy status panel:** keystone 8's original idea (surface the production
  URL / deploy state in-app) is still unbuilt.

## Conventions

- Vue 3 `<script setup lang="ts">`, strict TypeScript, CSS custom properties
  (no framework). Package manager: npm.
- Generators (`colorExtraction`, `pagePlan`, `vueCodegen`) are **pure and
  deterministic** — keep them DOM-free and unit-tested.
- New dependencies are flagged, not added silently. Current runtime deps beyond
  Vue: `@anthropic-ai/sdk`, `@upstash/ratelimit`, `@upstash/redis` (AI tier only).
- Accessibility is a first-class concern; the axe test in
  `tests/accessibility.test.ts` must stay at zero violations.

## Verify From a Clean Checkout

```bash
npm install
npm run test       # 35 tests
npm run typecheck
npm run build
npm run dev        # local preview at http://localhost:5173
```
