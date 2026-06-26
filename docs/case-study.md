# Case Study

## Problem

Design-to-code work often fails in the handoff. Visual fidelity, accessibility, implementation constraints, and test coverage are treated as separate concerns. This project treats them as one pipeline.

## Approach

The finder is implemented as a small but realistic component system:

- `RideFinder.vue` owns the state machine and focus management.
- `OptionCard.vue` renders a native radio option with a custom visual treatment.
- `ProgressBar.vue` exposes step progress with real progressbar semantics.
- `finderSteps.ts` keeps content separate from component behavior.
- `tokens.css` records the design decisions extracted from the reference.

## AI Automation Role

AI is used as a structured assistant for:

- Converting design observations into reusable tokens.
- Identifying semantic HTML risks before implementation.
- Producing component and test checklists.
- Reviewing deviations from literal visual translation.

AI is not treated as an unchecked code generator. The pipeline documents assumptions and validates output with tests.

## Accessibility Decisions

The finder uses native radios, one shared `name` per step, decorative option images, a labeled radiogroup, a real progressbar, and focus movement to the next step heading after selection.

These decisions intentionally prioritize keyboard and screen reader behavior over markup that merely resembles a production widget.
