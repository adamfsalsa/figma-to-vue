# Roadmap & Feature List

Forward-looking feature ideas, grouped and roughly prioritized. The pipeline
(intake → analysis → JSON plan → Vue SFC / HTML / live preview) is complete and
consistent; everything here builds on that. See `docs/STATUS.md` for what's
already done and the smaller open follow-ups.

## Tier 1 — Finish what's started (highest value, low risk)

1. **Open in new tab** — serve the standalone HTML export (`src/utils/htmlExport.ts`)
   via a Blob URL so the live preview can open as a genuine `h1`-rooted page.
2. **Download artifacts as files** — `.vue`, `.html`, `.json` downloads alongside
   the existing copy-to-clipboard actions.
3. **Turn on the AI tier** — operator config (keys + Upstash) and the first live
   `claude-haiku-4-5` call, which is also the integration smoke test
   (`docs/ai-analysis.md`).
4. **Sample reference** — a one-click "try with an example image" so a first-time
   visitor sees the whole flow without uploading anything.

## Tier 2 — Make the output richer / more faithful

5. **Layout-faithful sections** — vary the per-section markup by `layoutPattern`
   (e.g. the `finder-flow` variant emits real `<label><input type="radio">`
   options like `src/components/RideFinder.vue`).
6. **Child components** — emit multiple SFCs for repeated structures instead of
   one monolithic component.
7. **Content fidelity (OCR)** — extract the reference's actual copy so the
   generated page reflects real text, moving the tool from "scaffolder" toward
   "faithful reconstruction." (Largest scope; changes the product's promise.)
8. **Editable plan** — let the user tweak the JSON plan and re-render, closing
   the loop between the contract and the output.

## Tier 3 — Broaden the tool

9. **Design token export** — emit the extracted palette as CSS variables, a JSON
   token file, or a Tailwind config.
10. **Additional framework targets** — React/Svelte exports alongside Vue, reusing
    the same page plan.
11. **Multi-frame intake** — accept several reference frames for a multi-section
    or multi-step page.

## Tier 4 — Product polish

12. **Dark mode** — `prefers-color-scheme` support (tokens are already centralized
    in `src/styles/tokens.css`, so this is mostly defining a dark override and
    re-checking contrast/axe).
13. **Deploy status panel** — surface the production URL / deploy state in-app
    (keystone 8's original idea).
14. **Shareable plan links** — encode the page plan in the URL so a configuration
    can be shared without a backend (note the project rule: no `localStorage`).

## Out of scope / deliberate non-goals

- Pixel-perfect cloning of arbitrary screenshots — the tool is a scaffolder.
- Persisting user data (no `localStorage`/`sessionStorage` per project rules).
- Republishing Trek/Zoovu assets — references stay local or royalty-free.
