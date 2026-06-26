# Vue Component Generation

This milestone turns the constrained JSON page plan into a real, standalone
Vue 3 single-file component — the actual "one-shot Vue output" the pipeline is
named for.

## What It Does

`src/utils/vueCodegen.ts` exposes a pure `generateVueSfc(plan)` that returns a
complete `.vue` file as a string:

- `<script setup lang="ts">` with a typed `PageSection` interface and the page
  content (`kicker`, `title`, `summary`, `sections`) as `const`s.
- `<template>` with a single `<h1>`, the kicker and summary, and a `v-for` over
  the sections rendering each as an `<h2>` + body — semantic and accessible by
  default.
- `<style scoped>` that bakes the locally-extracted palette (when present) into
  `--token-accent` / `--token-surface-soft` custom properties, with hardcoded
  fallbacks when no image has been analyzed.

The component's *shape* is chosen from the analyzer's observed `layoutPattern`,
so the structure matches the design rather than being one fixed layout:

| `layoutPattern` | Root modifier | Section shape |
| --- | --- | --- |
| Single hero | `generated-page--single-hero` | single narrow column under the hero |
| Hero plus feature cards | `generated-page--hero-cards` | responsive auto-fit card grid |
| Dashboard grid | `generated-page--dashboard-grid` | dense tile grid |
| Product finder flow | `generated-page--finder-flow` | centered row of option cards |

Across every variant the script block, the single `<h1>`, and the `v-for` over
typed `sections` rendering each as an `<h2>` stay invariant — only the
container markup and scoped styles change.

The result is a component a developer can drop straight into a Vue project and
edit — not an HTML string, and not data rendered only inside this app.

## Why Deterministic (and Why That Matters)

The generator is pure and deterministic: the same plan always produces the same
SFC. That keeps the output reviewable and diffable in Git, and means the
"one-shot page" idea is proven without depending on a live LLM to emit code.
The optional AI tier (see `docs/ai-analysis.md`) enriches the *analysis* that
feeds the plan; it does not generate the code. This boundary is deliberate —
the model influences intent, deterministic code owns the output.

## Injection Safety

Page content is placed into TypeScript `const`s in the script block and
rendered with `{{ }}` interpolation, so Vue handles HTML escaping at runtime.
The generator only needs to emit safe TS string literals, which `jsString()`
guarantees by escaping backslashes, single quotes, and newlines. Generated
content therefore cannot break out of the literal or inject markup. This is
covered by a test in `tests/vueCodegen.test.ts`.

## In the App

The "5. Vue component (.vue)" panel renders the generated SFC, and a
"Copy Vue component" button copies it to the clipboard. Both are driven from
the current page plan — generate a JSON plan first, and the component updates
with it.

## Not Implemented Yet

- No multi-component output (the whole page is one SFC; no extracted child
  components for repeated structures).
- No download-as-file action; copy-to-clipboard only.
- Layout variants differ in container shape and styling, but not yet in the
  per-section markup (e.g. finder-flow option cards are not yet real
  `<label><input type="radio">` controls like `RideFinder.vue`).

## Next Step

Consider emitting child components for repeated structures, and deepening the
`finder-flow` variant toward the accessible native-radio pattern used in
`src/components/RideFinder.vue`. The generator is the single place that owns
SFC output, so these stay additive changes to one pure function.
