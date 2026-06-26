# Figma to Vue AI Pipeline

An AI-assisted portfolio case study that translates a Figma document, screenshot, or similar design reference into a production-minded Vue 3 + TypeScript webpage.

The project is intentionally framed as a pipeline, not a clone. The goal is to demonstrate how design intake, token extraction, AI-assisted planning, accessible implementation, and automated validation can work together on a realistic ecommerce interaction.

## Case Study Focus

- Figma-to-code planning for component boundaries, state, and design tokens
- Vue 3 single-file components with strict TypeScript
- Accessibility-first implementation with native form controls and focus management
- Automated validation with Vitest, Testing Library, and axe
- Documentation that makes AI decisions reviewable instead of invisible

## Pipeline

1. Design intake captures layout, copy, hierarchy, and interaction intent.
2. Token extraction converts observed colors, type, spacing, and layout values into CSS custom properties.
3. AI-assisted planning proposes component boundaries, state shape, test cases, and accessibility risks.
4. Vue implementation turns the plan into semantic components.
5. Quality gates run typecheck, tests, build, and automated accessibility assertions.

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

## Legal Note

This is an independent portfolio study. It does not use Trek or Zoovu source code, private design files, proprietary assets, or production imagery. Any visual references are reinterpreted with local placeholders or royalty-free equivalents.
