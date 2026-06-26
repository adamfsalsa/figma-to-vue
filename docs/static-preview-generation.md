# Static Preview Generation

This milestone turns the intake brief into a deterministic one-page preview inside the app.

## What Works

- The user can add a reference image or screenshot.
- The user answers basic formatting questions.
- The app generates a constrained JSON page plan from the current brief.
- The app renders a static one-page composition from that plan.
- The generated preview can be copied as starter HTML.

## Why Deterministic First

This step intentionally avoids a real LLM call. A deterministic generator makes the first workflow reviewable, testable, and safe before adding API keys, file-writing automation, or deployment hooks.

## Next Step

Replace or augment the deterministic generator with a small backend LLM endpoint that returns a constrained JSON page plan. Vue can then render that JSON into the same preview surface.

Two steps toward that already exist. The hybrid analysis tier (`api/analyze.ts`, `docs/ai-analysis.md`) enriches the plan, and the deterministic generator now emits a real Vue 3 single-file component in addition to the HTML export — see `docs/vue-codegen.md`. The generated preview also applies the locally-extracted palette as CSS custom properties (`--token-accent`, `--token-surface-soft`), so real reference colors flow through to the rendered page and the generated component.
