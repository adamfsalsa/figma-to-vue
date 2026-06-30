# Reconstruction Contract (Core Product Requirement)

This document is the authoritative scope for the project. If another document,
roadmap tier, comment, or implementation decision describes the application as
only a classifier, design inspector, copy generator, or generic scaffolder,
this contract wins.

## Product Promise

Given either a Figma file/frame URL or a reference image, the application must
produce a real, usable, responsive Vue page that materially reconstructs the
source design.

The output must reflect the source's composition, hierarchy, content, visual
tokens, media, repeated structures, and visible interactions. Changing the
source must be capable of changing the generated DOM structure and CSS, not
only its text, colors, or background image.

This capability is the core product, not a Level 3 enhancement. The project is
not feature-complete without it.

## Current Gap

The pipeline proves intake, analysis, constrained planning, preview, Vue/HTML
export, and safe server-side API handling. Figma imports now preserve a nested
v2 region tree, render independent image-node assets, and keep the complete
frame comparison-only. Image-only inputs still select from four broad templates,
and deeper Figma component, responsive, interaction, correction, and durable
asset work remains. Consequently, the overall product is not feature-complete.

That output is useful as pipeline scaffolding, but it is not yet a reconstructed
page and must not be represented as the final product.

## What "Real, Usable Page" Means

A successful result:

- renders independently without the original screenshot acting as the page;
- uses semantic regions and reusable Vue components that correspond to visible
  source regions;
- preserves visible copy when it can be read and clearly labels uncertain or
  invented copy;
- reproduces source-dependent layout, spacing, typography, colors, borders,
  radii, elevation, and media treatment within defined tolerances;
- implements visible controls with native, keyboard-operable HTML behavior;
- adapts at mobile, tablet, and desktop widths without clipping or unusable
  controls;
- has one logical heading hierarchy, landmarks, accessible names, focus styles,
  useful alternative text, and zero automated axe violations;
- exports editable Vue 3 + TypeScript rather than a flattened screenshot or a
  permanently embedded reference image;
- remains deterministic after analysis: the same accepted reconstruction plan
  produces the same output.

"Usable" does not require guessing hidden business logic. A visible form,
menu, tabs, accordion, carousel control, or finder must receive meaningful local
behavior. Links may use review-safe placeholder destinations when the reference
does not reveal a URL. Unsupported behavior must be identified in the plan and
preview, not silently replaced by a decorative element.

## Input Parity

Both intake paths terminate in the same reconstruction-plan schema and renderer.
They differ in evidence and confidence, not in the promised output.

### Figma URL

Use document nodes, bounds, auto-layout, constraints, text styles, fills,
strokes, effects, component relationships, and exported assets when available.
The Figma render is comparison evidence; it must not become the generated page.

### Reference Image

Infer regions, geometry, typography, colors, assets, and controls from pixels.
Every inference carries confidence and can be corrected by the user. Lower
confidence creates review work; it does not downgrade the result to a generic
template.

## Safety Boundary

Uncertain visual inference is a quality risk, not permission to execute
untrusted code. The safe generation boundary is:

- models return validated structured data, never executable source accepted
  without validation;
- the renderer emits code from an allowlisted component and behavior vocabulary;
- generated previews run without arbitrary scripts, remote code, secrets,
  deployment credentials, or automatic publication;
- external asset URLs are validated or materialized into reviewed assets;
- all generated text is escaped by construction;
- export and deployment remain explicit human actions;
- confidence and unsupported features are visible in the review UI.

These controls allow image-based reconstruction without pretending that visual
inference is certain.

## Required Feature Breakdown

### 1. Evidence acquisition

- Figma: selected-node tree, rendered comparison image, geometry, text, styles,
  components, constraints, and exportable assets.
- Image: normalized bitmap, OCR text boxes, visual regions, detected controls,
  image crops, and visual token samples.
- Record provenance for every extracted value and never confuse a full-frame
  reference with a content asset.

### 2. Normalized reconstruction plan

Replace the four-label template contract with a versioned spatial/component
model. At minimum it must represent:

- viewport and source dimensions;
- ordered nested regions and their semantic roles;
- layout mode, alignment, gaps, padding, bounds, and responsive constraints;
- text content and typography;
- fills, borders, radii, effects, and design tokens;
- media assets, crop/focal behavior, and alt-text intent;
- component type, repetition, variants, and parent-child relationships;
- interactions, states, destinations/actions, and unsupported behavior;
- field-level provenance, confidence, and user overrides.

The broad classifications currently in `ReferenceAnalysis` can remain useful
hints, but they cannot be the complete rendering contract.

### 3. Review and correction

- Show the detected region tree over or beside the reference.
- Let users correct region type, hierarchy, copy, assets, layout, and controls.
- Surface low-confidence fields first.
- Regenerate from the corrected plan without requiring another paid analysis.
- Preserve user corrections when unrelated fields are regenerated.

### 4. Source-dependent Vue renderer

- Recursively render the normalized region/component tree.
- Generate child SFCs for repeated or independently meaningful structures.
- Use CSS Grid, Flexbox, normal flow, and positioning according to source
  evidence rather than a universal hero/cards shell.
- Emit CSS custom properties for inferred or Figma-derived tokens.
- Materialize/copy permitted source assets; never use the full screenshot as a
  shortcut for the page body.
- Keep the live preview, Vue export, and HTML export on the same render contract
  so they cannot drift into different products.

### 5. Interaction reconstruction

- Map visible buttons, links, form controls, menus, tabs, accordions, dialogs,
  and selection flows to native-first accessible behavior.
- Implement locally demonstrable state with Vue.
- Mark server-dependent or ambiguous actions as review-required.
- Do not invent destructive, purchasing, authentication, or network behavior.

### 6. Responsive reconstruction

- Infer constraints from Figma when present.
- For a single screenshot, generate conservative responsive rules from region
  geometry and component semantics, then expose them for review.
- Validate at 390px, 768px, and 1440px reference viewports at minimum.
- No horizontal page overflow, obscured content, or controls below 44px where
  a touch target is expected.

### 7. Validation and comparison

- Schema-validate every plan before rendering.
- Compile/typecheck the generated SFC.
- Run component behavior tests and axe against generated output.
- Capture generated screenshots at fixed viewports and compare them with the
  source using documented similarity tolerances and masked dynamic regions.
- Report structural, content, accessibility, and visual results separately;
  a strong score in one category cannot erase failure in another.

## Release-Blocking Acceptance Criteria

| ID | Requirement | Automated gate |
| --- | --- | --- |
| RCN-01 | Two references with different compositions produce materially different region trees, Vue markup, and layout CSS even when they share the same page type. | Structural divergence test |
| RCN-02 | The generated page does not render the complete reference screenshot as page content or a full-page background. | Asset provenance/DOM test |
| RCN-03 | Figma and image intake both yield the same versioned reconstruction-plan schema with provenance and confidence. | Schema contract test |
| RCN-04 | Detected/corrected region count, hierarchy, and order are preserved in preview and export. | Plan-to-DOM test |
| RCN-05 | Source copy, typography, palette, spacing, borders, radii, and media treatment flow into generated output. | Token/content/style tests |
| RCN-06 | Visible controls become semantic, keyboard-usable interactions and ambiguous actions are flagged. | Interaction tests |
| RCN-07 | Generated pages work at 390px, 768px, and 1440px without page overflow or hidden controls. | Browser viewport tests |
| RCN-08 | Preview and generated artifact have zero axe violations and a logical heading/landmark structure. | axe tests |
| RCN-09 | Generated Vue SFCs compile under strict TypeScript and do not execute model-supplied code. | Compile/security tests |
| RCN-10 | Fixed representative fixtures meet documented visual-similarity thresholds after dynamic regions are masked. | Screenshot comparison tests |
| RCN-11 | Live preview, Vue export, and HTML export render equivalent region/component structures. | Cross-renderer parity test |
| RCN-12 | Low-confidence image inferences are identifiable and user corrections survive regeneration. | Review-state tests |

The executable backlog for these gates starts in
`tests/reconstructionAcceptance.test.ts`. Tests marked `todo` are known missing
product behavior, not optional ideas. Feature completion requires implementing
and enabling all release-blocking cases.

## Representative Fixture Set

Acceptance must use source designs that force different structures:

1. split marketing hero with navigation, media, CTA, and feature row;
2. dense dashboard with sidebar, toolbar, metrics, table, and filters;
3. editorial page with asymmetric text/media sections;
4. product finder with grouped native choices, progress, and results state;
5. mobile commerce/detail page with gallery, options, and purchase CTA;
6. ambiguous low-fidelity screenshot used to test confidence and corrections.

Each fixture needs a Figma-derived case where licensing permits and an image-only
case. Fixtures must be local, redistributable, stable, and free of secrets.

## Definition of Feature Complete

The reconstruction component is complete only when all RCN gates pass for the
representative fixture set, generated artifacts compile, accessibility gates
remain green, and a reviewer can recognize each result's distinct source
without seeing its text or filename.

Merely producing valid Vue, changing copy/colors, selecting one of four shells,
or displaying the reference image beside generated content does not satisfy
this definition.
