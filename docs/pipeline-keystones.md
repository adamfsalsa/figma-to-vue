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

The one-shot output now includes a real Vue 3 single-file component, not just an HTML string. A pure, deterministic generator (`src/utils/vueCodegen.ts`) turns the page plan into a complete `.vue` file — typed `<script setup>`, semantic `<template>`, and `<style scoped>` that bakes the extracted palette into custom properties. The component's shape is chosen from the observed `layoutPattern` (single hero, feature cards, dashboard grid, or finder flow), so the structure matches the design. A "Copy Vue component" button and a code panel surface it in the app. See `docs/vue-codegen.md`.

## 11. Live Preview

A "▶ Preview page" button opens the generated page in a one-click, full-screen, scrollable overlay so a non-coder can see and interact with the result in real time, separate from the code panels. The page carries an interactive call-to-action that reflects the observed `ctaStyle` (button / link / email form / none). The overlay is an accessible modal dialog (focus trap to the close button, Escape to close, focus restored to the trigger) and reuses the shared `GeneratedPagePreview.vue` so the inline and full-screen views never drift. See `docs/live-preview.md`.

## 12. UI Cleanup

A scan-first redesign applying progressive disclosure: the three always-visible code walls (implementation brief, JSON plan, Vue SFC) now collapse into closed-by-default `<details>` disclosures, the output area leads with one primary action (`▶ Preview page`) and the rendered preview as the focal point, and the shell uses calmer cards (soft shadow, larger radius), a two-column intake, and a quieted delivery footer. Purely presentational — no behavior or artifact change; all 44 tests (incl. axe) still pass.

## 13. Modern SaaS Aesthetic Overhaul

A full visual-identity pass to a "Modern SaaS / soft" direction (Linear/Vercel-light). The design system is rebuilt from `src/styles/tokens.css`: an indigo/violet accent on slate ink, a soft gradient canvas, larger radii, layered soft shadows, pill buttons with a gradient primary, and Plus Jakarta Sans (display) + Inter (body). All theming flows through tokens, so the chrome and the default generated-page preview stay cohesive (the preview's default hero is now indigo-soft; a real uploaded image still overrides it with its extracted palette). Presentational only — no behavior or artifact change; all 44 tests (incl. axe) pass. Fonts are an external Google Fonts dependency (degrades to system-ui).

## 14. AI Page Generation + Interactive Controls

The AI tier moves from *classifier* to *generator*. `api/analyze.ts` now uses `claude-sonnet-4-6` and returns both the layout classification **and** generated page copy (kicker/title/summary/sections) under a `content` key — instructed to read real text faithfully from a clear mockup/Figma frame and to invent coherent premium copy from a vague sketch, always returning complete content. That content flows through `buildPagePlan` as an override, so the rendered page reflects the image instead of templated placeholder text. Separately, generated **Product finder flow** pages now include a real interactive **dropdown + button** (with reactive state) across the live preview, the Vue SFC (ref-backed `v-model`), and the HTML export — so generated pages have both buttons and dropdowns. Still dormant until configured; the click-by-click key setup is in `docs/setup-ai.md`. Cost note: Sonnet + content generation is ≈ $0.02–0.05/generation, so $5 ≈ 100–250 generations. 52 tests pass (incl. axe); the live AI call remains unverified until a key is set.
