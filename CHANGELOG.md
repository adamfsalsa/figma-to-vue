# Changelog

Agent ownership is stated explicitly so work from parallel coding assistants
can be reviewed and merged without ambiguity.

## Unreleased

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
