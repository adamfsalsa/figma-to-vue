# Project Status & Handoff

Single entry point for whoever picks this up next. Last updated after structured
Figma URL intake (keystone 15).

## Current State

The pipeline runs end to end. `main` is the source of truth; feature work
through AI page generation and interactive dropdowns has been merged.

- **Build / typecheck / tests all green:** `npm run build`, `npm run typecheck`,
  `npm run test` (60 tests across 11 files) pass.
- **Deploys on Vercel** as a static Vite build. The app is fully usable with no
  configuration — the AI tier is optional and dormant by default.

## What's Done (see `pipeline-keystones.md` for the full list)

1. Reference intake (drag-drop/file, local preview).
2. Server-side Figma URL intake for file/frame nodes, rendered previews, text,
   auto-layout, components, fills, and inferred page content (`api/figma.ts`).
3. Human-guided `ReferenceAnalyzer` form.
4. **Real local color/token extraction** from image pixels — no LLM, no key
   (`src/utils/colorExtraction.ts`, `docs/ai-analysis.md`).
5. Constrained, typed JSON page plan (`src/utils/pagePlan.ts`).
6. Static one-page preview + styled HTML export.
7. **Real Vue 3 SFC generation**, layout-aware by `layoutPattern`
   (`src/utils/vueCodegen.ts`, `docs/vue-codegen.md`).
8. **Optional AI tier** — a key-safe Vercel proxy (`api/analyze.ts`) calling
   `claude-sonnet-4-6`, which classifies the layout **and generates the page
   copy from the image** (faithful when clear, invented when vague). Durable
   Upstash rate limiting. Implemented but dormant until env vars are set
   (`docs/ai-analysis.md`; setup in `docs/setup-ai.md`).
9. **One-click live preview** overlay with an interactive CTA — and an
   interactive **dropdown** for Product-finder-flow pages — for non-coders
   (`src/components/GeneratedPagePreview.vue`, `docs/live-preview.md`).

## To Enable the AI Tier (operator, optional)

The app refuses to call the billable model unless all of these are set in the
Vercel project — until then `/api/analyze` returns `not_configured` and the app
uses the free local analyzer. Full detail + the "never exceed $5" steps are in
`docs/ai-analysis.md`.

- `ANTHROPIC_API_KEY` — load $5 prepaid, **auto-reload OFF**, $5 workspace cap.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — durable rate limiter.

See `.env.example` and `docs/deployment.md`.

Figma URL intake separately requires a server-side `FIGMA_ACCESS_TOKEN` with
`file_content:read`. The token is never returned to or stored by the browser.

## What's Next

A prioritized, forward-looking feature list lives in **`docs/roadmap.md`**. The
smaller, already-scoped follow-ups are below.

## Open Follow-Ups (nothing is blocking)

Consolidated from the per-doc "Next Step" sections:

- **AI tier is not runtime-verified.** No live billed call has been made from
  this codebase; the first real call on Vercel is the integration smoke test.
- **Standalone preview:** the styled HTML export (`src/utils/htmlExport.ts`) is
  now a real `h1`-rooted page with the CTA, but the live preview overlay still
  renders the in-app `h3`/`h4` component. Add an "open in new tab" action that
  serves the HTML export via a Blob URL so the full-screen view is the genuine
  standalone page. (`docs/live-preview.md`)
- **Richer SFC:** child components for repeated structures; deepen the
  `finder-flow` variant toward the accessible native-radio pattern in
  `src/components/RideFinder.vue`. (`docs/vue-codegen.md`)
- **Structured outputs:** the AI call uses prompt-plus-validate; switch to
  `output_config.format` once the SDK types it on GA messages.
  (`docs/ai-analysis.md`)
- **Content fidelity:** the optional AI path generates or adapts copy from the
  image; the no-AI fallback remains templated. Exact OCR and pixel-level layout
  reproduction remain out of scope.
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
npm run test       # 60 tests
npm run typecheck
npm run build
npm run dev        # local preview at http://localhost:5173
```

## Agent Ownership Log

- **OpenAI Codex — 2026-06-29:** handoff hardening on
  `codex/handoff-hardening`; refreshed stale preview state, forced preview
  regeneration from current inputs, corrected privacy/model copy, added
  regression coverage, and synchronized project status.
- **OpenAI Codex — 2026-06-29:** structured Figma REST intake on
  `codex/figma-url-intake`; added server-only token handling, file/frame URL
  parsing, node and rendered-image retrieval, structured design extraction,
  editable inferred content, and end-to-end regression coverage.
