# Changelog

Agent ownership is stated explicitly so work from parallel coding assistants
can be reviewed and merged without ambiguity.

## Unreleased

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
