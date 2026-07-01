# Changelog

## 2026-07-01 — Second-operator handoff

- Added a compact operational handoff with exact branch/commit state, product
  truth, implementation map, current gaps, ownership boundaries, verification,
  and a token-friendly bootstrap prompt.
- Corrected stale test-count, branch-source, Figma-only UI, and live deployment
  status so a new operator does not begin from false assumptions.

## 2026-07-01 — Figma reconstruction polish

- Corrected parent-axis sizing so column children no longer use width ratios as
  heights through `flex-basis`.
- Preserved child content inside image-filled Figma frames, inferred bounded
  spacing for free-layout rows/columns, and centered output at its source width.
- Added broad Site canvas normalization to select the largest visible page
  frame or section, with preview/Vue/HTML parity and regression coverage.

## 2026-07-01 — Figma-only intake surface

- Temporarily hid reference-image upload behind a labeled, reversible UI scope flag.
- Updated the active intake copy and accessible labels to present Figma file,
  frame, prototype, and Site import as the sole reference workflow.
- Retained the image ingestion implementation for later reactivation.

Agent ownership is stated explicitly so work from parallel coding assistants
can be reviewed and merged without ambiguity.

## Unreleased

### Figma reconstruction v2 foundation - OpenAI Codex (2026-06-30)

- Preserve nested Figma regions, geometry, auto-layout, spacing, typography,
  fills, strokes, radii, semantic intent, provenance, and confidence in a
  versioned reconstruction-plan v2.
- Fetch image-bearing Figma nodes as independent assets and keep the selected
  full-frame render out of generated-page content.
- Render the source-dependent region tree through the live preview, Vue SFC,
  and standalone HTML instead of reducing every Figma frame to four templates.
- Activate and pass `RCN-01` structural divergence and `RCN-02` no-screenshot-
  shortcut acceptance gates; add focused importer and renderer regression tests.
- Preserve Figma fill/hug/fixed sizing, constraints, min/max dimensions,
  wrapping, inferred grids, clipping, stroke widths, shadows, blur, text
  transforms, component IDs, and variant-property metadata.
- Translate clearly named Figma buttons, links, and input/search/email/password
  fields into native accessible controls across preview, Vue, and HTML output.
- Materialize allowed Figma CDN image-node renders into durable embedded assets
  under strict per-asset and total response budgets; mark oversized/failed
  fallbacks as remote and review-required.
- Add a fixed-origin asset-fetch allowlist, redirect rejection, MIME validation,
  byte limits, timeouts, and a 30-second Figma serverless-function ceiling.

### Product contract and tests - OpenAI Codex (2026-06-30)

- Establish source-dependent, usable-page reconstruction from both Figma and
  reference images as the non-negotiable core completion criterion.
- Document the normalized plan, correction UI, renderer, interaction,
  responsive, safety, validation, and fixture work required to complete it.
- Add twelve `RCN-*` release-blocking acceptance cases as an executable backlog;
  they remain `todo` until the corresponding reconstruction behavior exists.
- Remove handoff and roadmap language that incorrectly classified faithful
  reconstruction as a later-tier enhancement or deliberate non-goal.

### Fixed — Claude (Anthropic) (2026-06-30)

- "Enhance with AI" failed on the live deployment with a generic "unavailable"
  message even with valid keys: the client abort timeout (8s) was shorter than
  a real Sonnet + content-generation call (~8s). Raised the client timeout to
  25s and set `maxDuration: 30` for `api/analyze.ts` in `vercel.json`.
- `api/analyze.ts` now surfaces the real upstream provider HTTP status and a
  sanitized message on a `provider_error`, so a bad key, missing credit, unknown
  model, or rejected image is diagnosable from the response. The frontend shows
  the provider status in its message. Neither field can contain the API key.
- Verified the AI tier works end to end on the live deployment.

### Documentation — Claude (Anthropic) (2026-06-30)

- Added `docs/troubleshooting-ai.md`: the resolved-incident write-up, the
  reusable diagnosis method (curl the live endpoint, watch HTTP status + total
  time), and a "Key flags for API errors" reference table. Keystone 17 added.

### Added — Claude (Anthropic) (2026-06-26 to 2026-06-29)

- Real local color/token extraction from uploaded image pixels (no LLM, no key).
- Optional "Enhance with AI" tier: a key-safe Vercel proxy (`api/analyze.ts`)
  calling Claude, gated behind durable Upstash rate limiting and an operator
  prepaid spend cap; upgraded from a layout classifier to a page-copy generator
  (Sonnet) that reads real text from clear references and invents coherent
  copy from vague ones.
- Real Vue 3 single-file component generation from the page plan, with the
  template shape chosen by the detected layout pattern.
- Styled, standalone HTML export with a shared call-to-action across the live
  preview, the Vue SFC, and the HTML artifact.
- One-click, full-screen live preview (accessible modal) with an interactive
  CTA and, for Product-finder-flow pages, an interactive dropdown + button.
- Modern SaaS visual redesign (typography, color system, component styling)
  and a scan-first progressive-disclosure layout pass.

### Documentation — Claude (Anthropic) (2026-06-26 to 2026-06-29)

- `docs/ai-analysis.md`, `docs/vue-codegen.md`, `docs/live-preview.md`,
  `docs/setup-ai.md` (click-by-click key/Upstash/Vercel setup), `docs/roadmap.md`,
  and `docs/STATUS.md` (the handoff entry point), plus keystones 9–14 in
  `docs/pipeline-keystones.md`.

### Added — OpenAI Codex (2026-06-29)

- Accept Figma design/file/frame URLs and read their structured node trees
  through a server-only Figma REST token.
- Extract text, section candidates, component counts, auto-layout direction,
  solid-fill colors, inferred page analysis, and a rendered frame preview.
- Keep screenshot upload and human-guided analysis as token-free fallbacks.

### Fixed — OpenAI Codex (2026-06-29)

- Fix the deployed Figma serverless function's Node ESM import resolution and
  add a compiled runtime smoke check to every production build.
- Reset Product-finder preview selection and result state whenever a newly
  generated page replaces the current page.
- Rebuild inline and live previews from the latest form inputs instead of
  reopening a stale page plan.
- Correct privacy messaging: references remain local unless the user explicitly
  invokes the optional AI analysis action.
- Update stale provider comments and the example model name.

### Documentation — OpenAI Codex (2026-06-29)

- Clarify that the app consumes exported visual references rather than native
  Figma documents.
- Synchronize test counts, current capabilities, scope boundaries, and agent
  attribution conventions.
