# Second-Operator Handoff — Figma Reconstruction

Use this as the operational entry point. It is intentionally compact; do not
reconstruct project history from every document before starting.

## Snapshot

- Date: 2026-07-01
- Repository: `adamfsalsa/figma-to-vue`
- Active branch: `codex/reconstruction-contract`
- Verified implementation baseline: `a1a0d5d`. Fetch the branch and use its
  current remote HEAD; handoff-only commits may follow this code baseline.
- Baseline branch: `main` at `e3d2b73`; the active Figma work is not merged yet.
- Last verification: 75 tests passing, 10 explicit release-gate todos, build and
  API runtime checks passing.
- Deployment: Vercel preview for the active branch. A live Figma Sites import
  has succeeded with the server-side token configured.
- Current UI scope: Figma import only. Image upload code remains behind
  `imageReferenceIntakeEnabled = false` in `src/App.vue`.

## Product Truth

The product must turn a Figma reference into a recognizable, usable,
responsive Vue page. A generic template with changed words/colors, or text over
the complete reference image, is a failed result. The full product contract
eventually requires image-reference parity too; image parity is temporarily
hidden from the UI, not reclassified as an optional upgrade.

The full-frame Figma render is comparison evidence only. Generated output must
come from validated structured regions and independently exported assets.

## Read Only These First

1. `AGENTS.md` — repository rules and accessibility constraints.
2. This file — live operational state and ownership.
3. `docs/reconstruction-contract.md` — non-negotiable scope and RCN gates.
4. `docs/figma-import.md` — current API, security, and extraction boundaries.

Consult `docs/STATUS.md` only for broader backlog/history. The local
`fidelity-pass-prompt.md` contributes the iterative screenshot/diff process;
its Trek-specific measurements are not universal Figma reconstruction rules.

## Current Pipeline

```text
Figma URL
  -> api/figma.ts (server-only token, node/image requests, bounded assets)
  -> figmaDocument.ts (node evidence -> reconstruction-plan v2)
  -> pagePlan.ts
  -> ReconstructionRegion.vue (live preview)
  -> reconstructionCodegen.ts (shared Vue/HTML structure and CSS)
```

Important files:

- `api/figma.ts`: Figma REST boundary and asset materialization.
- `src/utils/figmaDocument.ts`: URL parsing, Site-root selection, evidence
  mapping, semantics, geometry, styling, and controls.
- `src/types/reconstructionPlan.ts`: normalized contract.
- `src/components/ReconstructionRegion.vue`: recursive live renderer.
- `src/utils/reconstructionCodegen.ts`: shared exported markup/CSS.
- `tests/reconstructionAcceptance.test.ts`: release-blocking RCN backlog.

## What Works

- `/design/`, `/file/`, `/proto/`, and `/site/` URL parsing.
- Selected-node import; broad document/canvas links choose the largest visible
  direct frame/section/component as a pragmatic page root.
- Nested region trees with bounds, auto-layout, inferred row/column/grid,
  padding, gaps, constraints, sizing, min/max sizes, wrapping, and clipping.
- Text typography, solid fills/strokes, radii, shadows, blur, text transforms.
- Basic component metadata and native button/link/input inference.
- Up to 12 image-bearing nodes fetched; eligible Figma CDN assets embedded
  under per-asset and total response budgets.
- Live preview, Vue export, and HTML export share the v2 region contract.
- Recent polish: axis-aware child sizing, inferred free-layout spacing,
  source-width containment, image-backed container hierarchy preservation, and
  broad Figma Sites canvas normalization.

## Known Quality Gaps

The import works, but real Sites output can still be visually rough. Highest
priority gaps:

1. No browser screenshot comparison harness at 390, 768, and 1440 px.
2. Broad canvas selection is automatic, not user-reviewable frame selection.
3. Free/overlapping layouts are approximated as flow, flex, or grid; true
   intentional overlap and parent-relative coordinates are not represented.
4. Gradients, complex vectors/masks, background-image containers, font loading,
   and advanced effects remain incomplete.
5. Component-set/variant semantics and repeated-component extraction are basic.
6. Confidence is recorded, but correction/override UI and persistence are not
   implemented.
7. Ten RCN acceptance cases remain todos; never delete or weaken them.

## Second Operator: Default Lane

Own visual validation and reviewability, which minimizes collision with the
primary mapper lane:

1. Add browser-level fixture rendering and screenshots at 390/768/1440.
2. Add overflow/visible-control assertions for RCN-07.
3. Establish geometry/pixel comparison scaffolding for RCN-10.
4. Add an import-inspection panel that shows selected root, viewport, region
   count, low-confidence/review-required items, and allows choosing a different
   top-level frame before regeneration.

Default file ownership for this lane: new browser tests/fixtures, test config,
and a new inspection component. Before changing `api/figma.ts`,
`figmaDocument.ts`, `ReconstructionRegion.vue`, `reconstructionCodegen.ts`, or
the reconstruction schema, claim the files in `docs/STATUS.md` and coordinate
with the primary operator.

## Test Reference

Current live reference:

`https://www.figma.com/site/uR6QQDjtV44qPmeoANOcrT/Straightforward-Brand-Guidelines--Community-?node-id=0-3`

Expected test flow:

1. Import the URL on the active Vercel branch preview.
2. Record the selected root node, returned viewport, and region count.
3. Open live preview and capture desktop/tablet/mobile output.
4. Compare composition, hierarchy, spacing, typography, media, clipping, and
   overflow against Figma—not merely whether content exists.
5. Fix one measured class of difference at a time and add a regression fixture.

Do not commit tokens, API responses containing secrets, copyrighted source
assets without permission, or full-frame renders as generated page content.

## Working Protocol

- Start from the exact active branch/commit above; fetch before editing.
- Check `git status` and `docs/STATUS.md` ownership before touching shared files.
- Keep commits single-purpose and prefix commit subjects with the operator name
  (`codex:`, `claude:`, etc.).
- Add a dated ownership/log entry to `docs/STATUS.md` and a concise changelog
  entry for material behavior changes.
- Preserve unrelated work; do not reset or rewrite another operator's changes.
- No new dependency without documenting why it is required.
- Accessibility and safe structured generation are release constraints, not
  polish that may be traded away for visual similarity.

## Verification

```bash
npm install
npm run test
npm run test:api-runtime
npm run typecheck
npm run build
npm run dev
```

A change is handoff-ready only when the relevant regression test and the full
suite pass, the build succeeds, documentation reflects reality, and the remote
branch contains the claimed commit.

## Token-Friendly Bootstrap Prompt

> Work as second operator on `codex/reconstruction-contract`. Read `AGENTS.md`,
> `docs/SECOND-OP-HANDOFF.md`, `docs/reconstruction-contract.md`, and
> `docs/figma-import.md` only. Confirm branch, commit, clean status, and current
> ownership. Take the default visual-validation/review lane unless reassigned.
> Do not weaken RCN todos or use the full reference image as generated content.
> Claim files in `docs/STATUS.md`, test fully, log material changes, and report
> commit hashes without exposing secrets.
