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

The analysis step is now two tiers. Tier 1 is the always-on, no-LLM local color/token extractor plus the human-guided analyzer form. Tier 2 is an optional "Enhance with AI" call routed through a Vercel serverless proxy (`api/analyze.ts`) so an API key never reaches the browser. The proxy's provider call is intentionally stubbed (`AI_PROVIDER_NOT_CONFIGURED`) — the request validation, rate-limit scaffold, error contract, and frontend fallback are all in place and ship now, ahead of any provider, key, or extra dependency. Full detail, the durable-rate-limit follow-up, and the provider decision live in `docs/ai-analysis.md`.
