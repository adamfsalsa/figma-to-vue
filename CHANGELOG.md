# Changelog

Agent ownership is stated explicitly so work from parallel coding assistants
can be reviewed and merged without ambiguity.

## Unreleased

### Fixed — OpenAI Codex (2026-06-29)

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
