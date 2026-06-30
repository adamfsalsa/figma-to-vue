# Figma to Vue AI Pipeline

An AI-assisted portfolio case study that reconstructs a Figma frame, screenshot,
or similar visual reference as a usable, responsive Vue 3 + TypeScript webpage.

The pipeline is infrastructure for a source-dependent reconstruction system,
not the final product by itself. The required output is an editable page whose
structure, styling, media, and interactions materially reflect the source. A
first reconstruction-plan v2 path now preserves and renders nested Figma
structure; image-only references and several fidelity/review gates remain
incomplete. See the authoritative
[reconstruction contract](docs/reconstruction-contract.md).

## Case Study Focus

- Figma-to-code planning for component boundaries, state, and design tokens
- Drag-and-drop reference intake for screenshots or exported frames
- Server-side Figma file/frame URL intake with structured layer, text,
  component, auto-layout, fill-color, and rendered-preview extraction
- Figma reconstruction-plan v2 with nested geometry, constraints, sizing,
  grids, effects, component metadata, bounded embedded assets, and native
  controls rendered consistently across preview, Vue, and HTML
- Human-guided reference analyzer for visible design observations
- Local, no-LLM color/token extraction from the uploaded reference image
- Optional "Enhance with AI" tier: a key-safe Vercel proxy that calls `claude-sonnet-4-6`, gated behind durable rate limiting and a prepaid spend cap (dormant until configured)
- Basic prompt support for formatting questions before code generation
- Constrained JSON page plan as the handoff between assistant and renderer
- Static one-page preview generation from the current brief
- One-shot Vue 3 single-file component generated deterministically from the page plan
- One-click full-screen live preview with an interactive CTA, so non-coders can see and use the result in real time
- Vue 3 single-file components with strict TypeScript
- Accessibility-first implementation with native form controls and focus management
- Automated validation with Vitest, Testing Library, and axe
- Documentation that makes AI decisions reviewable instead of invisible

## Status & Handoff

For current state, what's done, how to enable the optional AI tier, and the open
follow-ups, see **[docs/STATUS.md](docs/STATUS.md)** — the single entry point for
picking this up.

Figma REST setup and security boundaries are documented in
**[docs/figma-import.md](docs/figma-import.md)**.

## Scope Boundary

The application can read a shared Figma file or frame through the server-side
REST integration when `FIGMA_ACCESS_TOKEN` is configured. It extracts the node
tree and common layout/content signals. Image intake uses pixels plus editable
inference. Both routes are required to produce a real page through one normalized
reconstruction plan. Uncertainty in image analysis must be exposed for review;
it is not a reason to fall back permanently to a generic template.

The project does not need to invent hidden backend behavior, import every Figma
variable, or reproduce undocumented prototype logic. It does need to reconstruct
the visible page, its responsive layout, and demonstrable interactions. It does
not write Git commits or deploy generated output automatically; JSON, HTML, and
Vue output remain human-reviewed artifacts.

## Work Attribution

Agent-authored maintenance is recorded in [CHANGELOG.md](CHANGELOG.md). Commits
owned by OpenAI Codex use a `codex:` subject prefix and an `Agent: OpenAI Codex`
commit trailer so parallel agent work remains distinguishable.

## Pipeline

1. Design intake captures the reference image or exported frame.
2. Optional Figma URL intake reads the selected frame's structured node tree.
3. Human-guided analysis records or corrects layout and composition decisions.
4. Basic formatting questions shape the implementation brief.
5. A constrained JSON page plan captures the render contract.
6. Token extraction reads colors from image pixels or structured Figma fills.
7. A deterministic generator creates a static one-page preview from the plan.
8. Vue implementation turns the plan into semantic components.
9. Git records reviewed code, docs, tests, and pipeline decisions.
10. Deployment publishes the final one-page build through Vercel or a similar static host.

## Tech Stack

- Vue 3
- TypeScript
- Vite
- Vitest
- Testing Library
- vitest-axe
- CSS custom properties

## Local Development

```bash
npm install
npm run dev
npm run test
npm run build
```

## Deployment Target

The repo includes `vercel.json` for a Vite single-page deployment on Vercel. The intended portfolio flow is local UI prototype -> Git commit/review -> hosted one-page demo.

## Legal Note

This is an independent portfolio study. It does not use Trek or Zoovu source code, private design files, proprietary assets, or production imagery. Any visual references are reinterpreted with local placeholders or royalty-free equivalents.
