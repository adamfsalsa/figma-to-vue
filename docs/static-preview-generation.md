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

A first step toward that backend already exists: a stubbed Vercel proxy at `api/analyze.ts` and a hybrid analysis tier described in `docs/ai-analysis.md`. The generated preview also now applies the locally-extracted palette as CSS custom properties (`--token-accent`, `--token-surface-soft`), so real reference colors flow through to the rendered page.
