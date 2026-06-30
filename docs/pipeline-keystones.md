# Pipeline Keystones

## 1. Comfortable UI

The first screen is a small pipeline console. It keeps the interface simple: reference intake, formatting answers, generated brief, and delivery path.

## 2. Reference Intake

The drag-and-drop control accepts common image exports so a Figma frame, screenshot, or comparable visual reference can start the workflow. The current demo previews the file locally in the browser and does not upload it.

## 3. Reference Analyzer

The analyzer is the bridge from image to implementation. It asks the user to inspect the reference and record visible design observations. Those observations feed the JSON page plan and Vue renderer.

A real, local, no-LLM color/token extractor now runs automatically on every upload (`src/utils/colorExtraction.ts`), producing a genuine palette and luminance from the image pixels instead of hardcoded token values. An optional "Enhance with AI" tier sits on top of the human-guided form — see keystone 9. The split between what pixels can answer and what needs a model is documented in `docs/ai-analysis.md`.

## 4. Basic LLM Support

The project intentionally starts with very small questions: page type, density, tone, and formatting notes. These answers form a structured brief that an LLM or human reviewer can use before implementation.

## 5. Frontend to Git

The generated brief becomes part of the reviewable work: Vue components, CSS tokens, tests, and documentation are committed to Git with the rest of the case study.

## 6. JSON Page Plan

The app now produces a constrained JSON plan before rendering. This creates a safer handoff shape for future LLM support because the model can return structured intent instead of arbitrary code.

## 7. One-Page Preview

The app can now turn the current brief into a deterministic static one-page preview. This proves the core "one-shot page" idea without introducing a live LLM or file-writing automation too early.

## 8. Git to Deployment

The target deployment path is a one-page static build hosted on Vercel or an equivalent platform. A future milestone should add a deploy status panel and the production URL.
The repository now includes a `vercel.json` target so the build settings are explicit.

## 9. Hybrid AI Analysis

The analysis step is now two tiers. Tier 1 is the always-on, no-LLM local color/token extractor plus the human-guided analyzer form. Tier 2 is an optional "Enhance with AI" call routed through a Vercel serverless proxy (`api/analyze.ts`) so an API key never reaches the browser. The proxy now makes a real `claude-haiku-4-5` vision call with validated JSON output and durable Upstash-backed rate limiting, but stays dormant (returns `not_configured`) until `ANTHROPIC_API_KEY` and the Upstash store are set — so the app is safe to deploy with neither. Cost is bounded by a low `max_tokens`, client-side image downscaling, and the operator's prepaid $5 cap. Full detail, the configuration checklist, and the "never exceed $5" steps live in `docs/ai-analysis.md`.

## 10. Vue Component Generation

The one-shot output now includes a real Vue 3 single-file component, not just an HTML string. A pure, deterministic generator (`src/utils/vueCodegen.ts`) turns the page plan into a complete `.vue` file — typed `<script setup>`, semantic `<template>`, and `<style scoped>` that bakes the extracted palette into custom properties. The component selects one of four broad shapes from the observed `layoutPattern` (single hero, feature cards, dashboard grid, or finder flow). This proves layout-aware export but is only a precursor to the source-dependent structure required by keystone 18. A "Copy Vue component" button and a code panel surface it in the app. See `docs/vue-codegen.md`.

## 11. Live Preview

A "▶ Preview page" button opens the generated page in a one-click, full-screen, scrollable overlay so a non-coder can see and interact with the result in real time, separate from the code panels. The page carries an interactive call-to-action that reflects the observed `ctaStyle` (button / link / email form / none). The overlay is an accessible modal dialog (focus trap to the close button, Escape to close, focus restored to the trigger) and reuses the shared `GeneratedPagePreview.vue` so the inline and full-screen views never drift. See `docs/live-preview.md`.

## 12. UI Cleanup

A scan-first redesign applying progressive disclosure: the three always-visible code walls (implementation brief, JSON plan, Vue SFC) now collapse into closed-by-default `<details>` disclosures, the output area leads with one primary action (`▶ Preview page`) and the rendered preview as the focal point, and the shell uses calmer cards (soft shadow, larger radius), a two-column intake, and a quieted delivery footer. Purely presentational — no behavior or artifact change; all 44 tests (incl. axe) still pass.

## 13. Modern SaaS Aesthetic Overhaul

A full visual-identity pass to a "Modern SaaS / soft" direction (Linear/Vercel-light). The design system is rebuilt from `src/styles/tokens.css`: an indigo/violet accent on slate ink, a soft gradient canvas, larger radii, layered soft shadows, pill buttons with a gradient primary, and Plus Jakarta Sans (display) + Inter (body). All theming flows through tokens, so the chrome and the default generated-page preview stay cohesive (the preview's default hero is now indigo-soft; a real uploaded image still overrides it with its extracted palette). Presentational only — no behavior or artifact change; all 44 tests (incl. axe) pass. Fonts are an external Google Fonts dependency (degrades to system-ui).

## 14. AI Page Generation + Interactive Controls

The AI tier moves from *classifier* to *generator*. `api/analyze.ts` now uses `claude-sonnet-4-6` and returns both the layout classification **and** generated page copy (kicker/title/summary/sections) under a `content` key — instructed to read real text faithfully from a clear mockup/Figma frame and to invent coherent premium copy from a vague sketch, always returning complete content. That content flows through `buildPagePlan` as an override, so the rendered page reflects the image instead of templated placeholder text. Separately, generated **Product finder flow** pages now include a real interactive **dropdown + button** (with reactive state) across the live preview, the Vue SFC (ref-backed `v-model`), and the HTML export — so generated pages have both buttons and dropdowns. Still dormant until configured; the click-by-click key setup is in `docs/setup-ai.md`. Cost note: Sonnet + content generation is ≈ $0.02–0.05/generation, so $5 ≈ 100–250 generations. 52 tests pass (incl. axe); the live AI call remains unverified until a key is set.

## 15. Structured Figma URL Intake

**Owner: OpenAI Codex.** Reference intake now accepts a Figma design/file/frame
URL. A serverless proxy keeps `FIGMA_ACCESS_TOKEN` out of the browser and reads
the selected node tree plus a rendered PNG from Figma's REST API. The importer
extracts visible text, auto-layout direction, components/instances, solid fill
colors, layer counts, content candidates, and broad editable page-analysis
fields before handing the result to the existing JSON/Vue pipeline. Requests
are restricted to parsed Figma keys and the fixed `api.figma.com` origin. Image
upload and human-guided analysis remain available without a token. See
`docs/figma-import.md`. 60 tests pass, including axe; the live Figma request
remains unverified until a scoped token is configured.

## 16. AI Tier Wired to Figma-Imported References

The optional AI tier (keystone 14) and Figma URL intake (keystone 15) were built
independently and didn't compose: "Enhance with AI" was hidden whenever the
reference came from Figma, because that path has no local `File` to downscale —
only the remote preview URL Figma returned. `api/analyze.ts` now accepts either
`{ image }` (an uploaded file's data URL, unchanged) or `{ imageUrl }` (a Figma
preview URL). The `imageUrl` is fetched **server-side**, never by the browser,
and is restricted by `isAllowedFigmaPreviewHost()` to `figma.com` and its
subdomains over `https://` only — an explicit SSRF guard, unit-tested in
`tests/analyzeImageSource.test.ts`. The fetched bytes are converted to the same
data-URL shape the upload path already produces, so `callVisionProvider()`
needed no change. `App.vue`'s "Enhance with AI" action now shows and works for
both reference sources. Verified end-to-end in a real browser (mocked Figma
import → click Enhance → request body correctly carries `imageUrl` pointing at
the Figma preview host). 64 tests pass (incl. axe); the live AI call itself
remains unverified until a key is configured (unchanged from keystone 14).

## 17. AI Reliability — Timeout Fix + Error Diagnosability

The first live run of the AI tier (with valid keys) kept failing with the
generic *"AI analysis is unavailable right now"* message. Root cause: the
client-side abort timeout in `src/utils/aiAnalysis.ts` was still **8s** — fine
for the original classify-only Haiku call, but the Sonnet + content-generation
call (keystone 14) takes **~8s**, so the browser aborted just before the
successful response arrived. Fixes: client timeout **8s → 25s**, and a
`maxDuration: 30` for `api/analyze.ts` in `vercel.json` (it previously fell back
to the platform's 10s default). Separately, `api/analyze.ts` now surfaces the
real upstream `providerStatus` + sanitized message on a `provider_error`, so a
bad key (401), missing credit (403), unknown model (404), or rejected image
(400) is diagnosable from the response instead of a generic 502. **The AI tier
is now verified working end to end on the live deployment** (a real reference
returned HTTP 200 with full analysis + generated copy in ~8s). The reusable
diagnosis method (curl the live endpoint, watch HTTP status + total time) and a
"Key flags for API errors" reference live in `docs/troubleshooting-ai.md`.

## 18. Source-Dependent Page Reconstruction (CORE, NOT COMPLETE)

**Product requirement clarified 2026-06-30; owner: OpenAI Codex for scope and
acceptance contract.** Figma URLs and reference images must both produce a real,
usable, responsive Vue page that materially reflects the source's region tree,
composition, content, styles, media, and visible interactions. They must converge
on one normalized reconstruction-plan schema with provenance, confidence, and
user corrections.

This is not a future Level 3 expansion. It is the completion criterion for the
core project. The existing four-layout renderer, generated copy, palette transfer,
and reference-image preview prove pieces of the pipeline but do not meet this
keystone: unrelated sources can still produce effectively identical markup, and
the reference screenshot can be displayed as content rather than reconstructed.

The authoritative feature breakdown, safety boundary, twelve release gates, and
fixture requirements are in `docs/reconstruction-contract.md`. The executable
acceptance backlog is `tests/reconstructionAcceptance.test.ts`. This keystone is
complete only when all `RCN-*` gates pass; `todo` cases are blockers, not optional
enhancements.

**Implementation checkpoint (OpenAI Codex, 2026-06-30):** Figma import now emits
the v2 nested region plan and renders it recursively across preview, Vue, and
HTML. It retains geometry, auto-layout, spacing, typography, common visual
styles, semantic intent, provenance, confidence, and separately rendered image
nodes. The complete frame is comparison-only. `RCN-01` and `RCN-02` now pass;
ten release gates remain, so this keystone is still incomplete.

**Figma fidelity checkpoint (OpenAI Codex, 2026-06-30):** plan v2 now also
preserves resizing constraints, fill/hug/fixed sizing, min/max dimensions,
wrapping, inferred grids, clipping, stroke widths, shadows, blur, text
transforms, component IDs/variant properties, and accessible native intent for
clearly identified links, buttons, and inputs. This remains Figma-only work;
image parity is not included in this checkpoint.
