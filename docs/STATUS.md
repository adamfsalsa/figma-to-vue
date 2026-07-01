# Project Status & Handoff

Single entry point for whoever picks this up next. Last updated after the core
reconstruction scope was clarified (keystone 18).

## Current State

The pipeline runs end to end, but the product is **not feature-complete**.
`main` is the merged baseline; active Figma reconstruction work is on
`codex/reconstruction-contract`, with verified implementation baseline
`a1a0d5d`, pending merge. Figma imports now
have a source-dependent v2 renderer; image-only references remain in code but
are temporarily hidden from the public UI and still use broad v1 templates.

- **Build / typecheck / implemented tests all green:** `npm run build`,
  `npm run typecheck`, `npm run test` report 75 passing tests plus 10 explicit
  reconstruction-contract todos across 14 files. The todos are release blockers.
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
   copy from the image** (faithful when clear, invented when vague). Works for
   both reference sources: an uploaded file (downscaled client-side) or a
   Figma URL import (its remote preview fetched server-side, restricted to
   Figma's own hosts as an SSRF guard). Durable Upstash rate limiting.
   Implemented but dormant until env vars are set (`docs/ai-analysis.md`;
   setup in `docs/setup-ai.md`).
9. **One-click live preview** overlay with an interactive CTA — and an
   interactive **dropdown** for Product-finder-flow pages — for non-coders
   (`src/components/GeneratedPagePreview.vue`, `docs/live-preview.md`).
10. **Figma reconstruction-plan v2 vertical slice** — nested Figma hierarchy,
    bounds, auto-layout, spacing, typography, fills, radii, semantic tags, and
    independent image-node assets now drive one recursive preview/Vue/HTML
    renderer. The full-frame render remains comparison evidence. `RCN-01` and
    `RCN-02` are active and passing.
11. **Richer Figma fidelity** — constraints, fill/hug/fixed sizing, min/max
    dimensions, wrapping, inferred grids, clipping, strokes, shadows, blur,
    text transforms, component/variant metadata, and native controls now flow
    through the shared renderer.
12. **Bounded durable Figma assets** — eligible Figma-owned image-node renders
    are embedded as data URLs under per-asset/total response caps. Remote,
    oversized, or failed assets remain visible but are marked review-required.

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
**Live confirmation on 2026-07-01:** the preview deployment accepted a Figma
Sites URL and returned generated output, confirming that the token-backed route
is configured. Never print, commit, or move the token into a `VITE_` variable.

## Required Next: Complete Reconstruction

The non-negotiable next phase is keystone 18: both Figma and image references
must produce usable, responsive pages whose DOM, CSS, media, and interactions
materially match their sources. This is the core product, not a later fidelity
upgrade. Read **`docs/reconstruction-contract.md` before changing the plan,
renderer, preview, AI prompt, or roadmap**.

Implementation must introduce a normalized spatial/component reconstruction
plan, reviewable confidence and corrections, a source-dependent renderer,
responsive and interaction reconstruction, and structural/visual/accessibility
validation. `tests/reconstructionAcceptance.test.ts` records the release gates.

The first two Figma slices are implemented. For the active Figma-only work,
continue with component-set/variant semantics, correction/override state,
browser-level responsive/visual comparison, and handling for oversized assets
that cannot fit the inline response budget. Image parity remains part of the
overall product contract but is not the current implementation scope.

## Secondary Follow-Ups

- **AI tier is verified live** (no longer an open item). A real reference image
  on the deployed site returns HTTP 200 with full analysis + generated copy in
  ~8s. If "Enhance with AI" ever misbehaves, `docs/troubleshooting-ai.md` has the
  diagnosis method and a "Key flags for API errors" table.
- **Image-only rendering still changes content more than visual structure.**
  This is a known blocking gap, not a deliberate final design. The new Figma v2
  route proves validated plan-driven reconstruction without letting a model
  write or execute arbitrary CSS/code; image analysis must now reach parity.
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
npm run test       # 75 passing + 10 reconstruction-contract todos
npm run test:api-runtime
npm run typecheck
npm run build
npm run dev        # local preview at http://localhost:5173
```

## Agent Ownership Log

- **OpenAI Codex - 2026-07-01:** prepared
  `docs/SECOND-OP-HANDOFF.md` as the compact parallel-agent source of truth,
  corrected stale branch/test/deployment status, and defined a low-collision
  visual-validation/review lane for the incoming second operator.

- **OpenAI Codex - 2026-07-01:** Figma output polish on
  `codex/reconstruction-contract`; corrected axis-aware child sizing, retained
  image-backed container hierarchies, inferred free-layout spacing, constrained
  pages to responsive source widths, and normalized broad Site canvas imports.

- **OpenAI Codex - 2026-06-30:** bounded durable Figma assets on
  `codex/reconstruction-contract`; added secure CDN materialization, provenance,
  response budgets, fallback review flags, Vercel duration configuration, and
  confirmed that production currently lacks `FIGMA_ACCESS_TOKEN`.

- **OpenAI Codex - 2026-06-30:** Figma fidelity continuation on
  `codex/reconstruction-contract`; added constraints/sizing/grid/effect mapping,
  component metadata, and native control reconstruction. No image-analysis
  scope was included.

- **OpenAI Codex - 2026-06-30:** Figma reconstruction v2 foundation on
  `codex/reconstruction-contract`; added nested evidence mapping, independent
  image-node renders, recursive preview/Vue/HTML output, and activated the first
  two reconstruction release gates.

- **OpenAI Codex - 2026-06-30:** reconstruction scope contract on
  `codex/reconstruction-contract`; made source-dependent usable-page output the
  core completion criterion, documented the implementation breakdown and safety
  boundary, and added twelve executable release-blocking acceptance cases.

- **Claude (Anthropic) — 2026-06-30:** verified the AI tier end to end on the
  live deployment and fixed the reliability bug that blocked it — the client
  abort timeout was 8s while a real Sonnet call takes ~8s, so the browser
  aborted just before the successful response. Bumped the client timeout to 25s,
  added `maxDuration: 30` in `vercel.json`, and made `api/analyze.ts` surface
  the real upstream provider status on failures. Added `docs/troubleshooting-ai.md`
  (diagnosis method + "Key flags for API errors"). See keystone 17.
- **Claude (Anthropic) — 2026-06-29:** wired the optional AI tier
  (`api/analyze.ts`) to also accept Figma-imported references — a server-side
  fetch of the Figma-returned preview URL, restricted to Figma's own hosts
  (`isAllowedFigmaPreviewHost()`) as an SSRF guard, converted to the same
  data-URL shape an uploaded file would produce. "Enhance with AI" now shows
  and works for both reference sources. See keystone 16.
- **Claude (Anthropic) — 2026-06-26 to 2026-06-29:** hybrid AI analysis tier
  (local color extraction + the Claude-backed `/api/analyze` proxy, upgraded
  from a layout classifier to a page-copy generator), real Vue 3 SFC
  generation, the styled HTML export, the one-click live preview with
  interactive CTA and finder dropdown, the Modern SaaS visual redesign, and
  the docs listed throughout this file (`ai-analysis.md`, `vue-codegen.md`,
  `live-preview.md`, `setup-ai.md`, `roadmap.md`, this file, keystones 9–14).
  See `CHANGELOG.md` for the itemized list.
- **OpenAI Codex — 2026-06-29:** handoff hardening on
  `codex/handoff-hardening`; refreshed stale preview state, forced preview
  regeneration from current inputs, corrected privacy/model copy, added
  regression coverage, and synchronized project status.
- **OpenAI Codex — 2026-06-29:** structured Figma REST intake on
  `codex/figma-url-intake`; added server-only token handling, file/frame URL
  parsing, node and rendered-image retrieval, structured design extraction,
  editable inferred content, and end-to-end regression coverage.
- **OpenAI Codex — 2026-06-29:** production ESM hotfix on
  `codex/fix-figma-runtime-import`; corrected serverless dependency specifiers
  and added a compiled Node runtime smoke check to the build gate.
