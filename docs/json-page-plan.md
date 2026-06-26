# JSON Page Plan Layer

This milestone adds a constrained JSON contract between intake answers and rendered output.

## Purpose

The app should not ask an LLM to return arbitrary Vue code as the first automation step. Instead, the safer bridge is a typed page plan:

- predictable schema
- visible JSON preview
- testable renderer
- copyable artifact for review
- clear future backend boundary

## Current Schema

The local deterministic generator returns:

- `schemaVersion`
- `source`
- `reference`
- `page`
- `sections`
- `accessibility`
- `tokens`

The Vue preview renders from this plan instead of directly from free-form prompt text.

## Future LLM Integration

A backend LLM endpoint should return this same JSON shape. The frontend can then validate the response, render the preview, and reject malformed or unsafe output before any Git or deploy automation runs.
