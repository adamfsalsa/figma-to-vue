# Roadmap & Feature List

The pipeline (intake -> analysis -> plan -> preview/export) exists, but the core
reconstruction product is not complete. `docs/reconstruction-contract.md` is the
authoritative scope and overrides older descriptions of the tool as a scaffolder.

## Core Completion - Source-Dependent Reconstruction

These are sequential capability slices, not optional roadmap tiers:

1. **Reconstruction-plan v2** - nested regions/components, geometry, layout,
   typography, effects, assets, interactions, responsive constraints,
   provenance, confidence, and overrides.
2. **Figma evidence mapping** - map nodes and exported assets into plan v2 rather
   than reducing them to four broad classifications.
3. **Image evidence mapping** - OCR, region/control detection, geometry, asset
   extraction, and confidence into the same plan v2.
4. **Correction workspace** - inspect and edit hierarchy, types, copy, styles,
   assets, interactions, and low-confidence fields.
5. **Recursive Vue renderer** - generate source-dependent semantic markup,
   reusable child components, tokens, and CSS from plan v2.
6. **Behavior renderer** - native-first local interactions plus explicit flags
   for ambiguous or server-dependent behavior.
7. **Responsive renderer** - source constraints plus conservative inferred
   mobile/tablet/desktop behavior.
8. **Parity and validation** - one render contract for live preview, Vue, and
   HTML; compile, behavior, axe, viewport, and visual-comparison gates.
9. **Representative fixture certification** - satisfy all RCN acceptance gates
   across structurally distinct Figma and image-only fixtures.

## Supporting Delivery Work

10. **Open in new tab** - serve the standalone HTML export via a Blob URL.
11. **Download artifacts** - `.vue`, `.html`, `.json`, component, token, and
    permitted asset downloads.
12. **Runtime integration verification** - configure scoped keys/rate limits and
    smoke-test live Figma and AI calls.
13. **Sample references** - redistributable fixtures that demonstrate genuinely
    different generated structures.
14. **Editable raw plan** - advanced JSON editing alongside the visual correction
    workspace.

## Later Breadth and Polish

15. Additional framework targets after Vue reconstruction passes all gates.
16. Multi-frame and multi-page projects.
17. Dark mode when present in source evidence.
18. Deploy status and explicit user-approved publishing.
19. Shareable reviewed plans without persisting secrets or private references.

## Deliberate Non-Goals

- Guessing hidden backend, commerce, authentication, or destructive behavior.
- Executing arbitrary model-generated scripts or automatically deploying them.
- Claiming certainty where a screenshot does not provide enough evidence.
- Republishing unlicensed Figma, Trek, Zoovu, or third-party assets.
- Using the complete reference screenshot as the generated page.

Pixel identity is not promised for unknowable details, but recognizable,
measurable structural and visual reconstruction is required. Uncertainty must be
reviewable rather than converted into a generic template.
