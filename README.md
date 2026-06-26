# Figma to Vue AI Pipeline

An AI-assisted portfolio case study that translates a Figma document, screenshot, or similar design reference into a production-minded Vue 3 + TypeScript webpage.

The project is intentionally framed as a pipeline, not a clone. The goal is to demonstrate how design intake, basic LLM-assisted formatting prompts, token extraction, accessible implementation, Git review, and deployment can work together on a realistic frontend workflow.

## Case Study Focus

- Figma-to-code planning for component boundaries, state, and design tokens
- Drag-and-drop reference intake for screenshots or exported frames
- Human-guided reference analyzer for visible design observations
- Local, no-LLM color/token extraction from the uploaded reference image
- Optional "Enhance with AI" tier: a key-safe Vercel proxy that calls claude-haiku-4-5, gated behind durable rate limiting and a prepaid spend cap (dormant until configured)
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

## Pipeline

1. Design intake captures the reference image or exported frame.
2. Human-guided analysis records visible layout and composition decisions.
3. Basic formatting questions shape the implementation brief.
4. A constrained JSON page plan captures the render contract.
5. Token extraction reads a real color palette and luminance directly from the uploaded image pixels (local, no LLM), feeding CSS custom properties.
6. A deterministic generator creates a static one-page preview from the plan.
7. Vue implementation turns the plan into semantic components.
8. Git records reviewed code, docs, tests, and pipeline decisions.
9. Deployment publishes the final one-page build through Vercel or a similar static host.

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
