# Accessibility Strategy

Accessibility is the primary quality gate for this case study.

## Requirements

- Options are native radio inputs inside labels.
- All radios in a step share one `name`.
- Inputs remain focusable with a clip-based visually hidden utility.
- The visual selected state comes from `:checked`.
- The question is a real `h2`.
- Options live inside a `radiogroup` labeled by the visible heading.
- Option images use `alt=""` because the adjacent heading names the option.
- Progress uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and an accessible label.
- Step changes move focus to the new `h2`.
- Motion is disabled under `prefers-reduced-motion`.

## Validation

The accessibility test renders the component and expects axe to report zero violations.
The jsdom axe run disables the canvas-dependent `color-contrast` rule; contrast should be checked in browser-level QA or a visual regression pass.
