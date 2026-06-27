# Live Preview

This milestone adds a one-click, full-screen preview of the generated page so a
non-coder can see and interact with the result in real time — not just read the
JSON, HTML, and Vue code panels.

## What It Does

A "▶ Preview page" button opens the generated page in a focused, scrollable
overlay that hides the developer panels. It is the same rendered page shown
inline (`src/components/GeneratedPagePreview.vue`), presented full-bleed so it
reads like a real website: scrollable content, a styled hero tinted with the
extracted palette, section cards, and an interactive call-to-action.

The button generates the page first if one doesn't exist yet, so a single click
always lands on a visible result.

## Interactive, Honest CTA

The hero's call-to-action reflects the analyzer's observed `ctaStyle` rather
than being decorative:

| `ctaStyle` | Rendered CTA |
| --- | --- |
| Button-led | a real `<button>` ("Get started") with hover/active feedback |
| Text-link | a text link ("Learn more →") |
| Form-first | an accessible email field + submit button ("Sign up") |
| None visible | no CTA |

This gives a non-coder something tangible to hover and click, and keeps the
preview faithful to what was detected in the reference.

## Accessibility

The overlay is a proper modal dialog, verified both by an automated test and in
a real browser:

- `role="dialog"` + `aria-modal="true"`, labelled "Live preview of the
  generated page".
- Focus moves to the **Close preview** button on open.
- **Escape** closes it; so does the Close button.
- Focus is **restored to the "▶ Preview page" trigger** on close.
- Button transitions respect `prefers-reduced-motion`.
- The `GeneratedPagePreview` component is rendered both inline and in the
  overlay; its form field uses a per-instance id so the label/input pairing
  stays valid when two instances exist.

## Shared Rendering

The rendered page lives in one component (`GeneratedPagePreview.vue`), used by
both the inline preview and the overlay, so the two never drift. Its data shape
is `GeneratedPage` in `src/types/generatedPage.ts`.

## Artifact Parity

All three outputs now match on content via the shared `deriveCta`: the live
preview, the generated Vue SFC (`src/utils/vueCodegen.ts`), and the styled HTML
export (`src/utils/htmlExport.ts`) render the same hero, CTA, and sections. The
HTML export is now a self-styled standalone document (palette-tinted, with the
CTA), so it can be opened directly in a browser.

## Not Implemented Yet

- Headings inside the in-app preview are `h3`/`h4` to fit the host document
  outline; the standalone HTML export correctly starts at `h1`. The live
  preview has no "open in new tab" action yet — it renders the in-app component,
  not the standalone HTML.

## Next Step

Wire an "Open in new tab" action on the live preview that serves the standalone
HTML export (a Blob URL), so the full-screen preview is the genuine `h1`-rooted
page rather than the in-app `h3`/`h4` component.
