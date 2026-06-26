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

## Not Implemented Yet

- The "Copy HTML" export does not yet include the CTA (the live preview and the
  HTML artifact differ on that one element).
- Headings inside the preview are `h3`/`h4` to fit the host document outline; a
  true standalone page would start at `h1`. This matters only if the preview is
  ever opened in its own tab/route.

## Next Step

Give the live preview an "Open in new tab" action backed by the styled HTML
export (so it is a genuine standalone page at `h1`), and bring the CTA into the
HTML and SFC generators so all three artifacts match the preview exactly.
