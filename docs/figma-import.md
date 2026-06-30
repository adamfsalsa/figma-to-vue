# Figma URL Import

The reference intake accepts either an exported image or a Figma design/frame
URL. Figma access is performed by the serverless endpoint in `api/figma.ts`; the
browser never receives the access token.

## Configuration

1. Create a short-lived Figma personal access token with the
   `file_content:read` scope.
2. Add it to the deployment as `FIGMA_ACCESS_TOKEN`.
3. Redeploy, then paste a Figma design or frame URL into **Figma file or frame
   URL** and choose **Import from Figma**.

Do not prefix the variable with `VITE_`: Vite exposes variables with that prefix
to browser code. The endpoint sends the secret only in the `X-Figma-Token`
header to `https://api.figma.com`.

## Accepted URLs

- `https://www.figma.com/design/<file-key>/<name>?node-id=1-2`
- `https://www.figma.com/file/<file-key>/<name>?node-id=1-2`
- Legacy prototype links using `/proto/`

A URL with `node-id` imports that selected node. A file URL without a node id
imports the first top-level frame, component, component set, or section.

## Extracted Data

- Visible node tree, capped at 2,000 scanned nodes
- Text layers and candidate page copy
- Auto-layout direction
- Component and instance counts
- Solid fill colors
- Broad layout, hero, media, CTA, and section-count classifications
- A rendered PNG preview URL from Figma
- A versioned `figma-to-vue.reconstruction-plan.v2` region tree preserving
  nested hierarchy, source bounds, auto-layout direction/gaps/padding,
  typography, solid fills/strokes, radii, semantic intent, provenance, and
  confidence
- Fill/hug/fixed sizing, min/max dimensions, horizontal/vertical constraints,
  wrapping, inferred grid columns, clipping, stroke width, shadows, blur, and
  text case/decoration
- Component IDs and bounded variant/property metadata
- Native semantic intent for clearly named buttons, links, search fields,
  email/password fields, and general text inputs
- Independent rendered assets for image-bearing nodes (up to the documented
  import cap), kept separate from the full-frame comparison image

The reconstruction plan now drives the live preview, Vue SFC, and HTML export.
Different Figma row/column compositions therefore produce different markup and
CSS instead of only changing words inside one universal hero template.

The imported classification remains editable in the human-guided analyzer.
This matters because layer names and document organization vary widely; the
heuristics are intentionally reviewable rather than presented as certainty.

## Boundaries

- Variables are not fetched. Figma's Variables REST endpoint has additional
  plan and scope requirements.
- Prototype transitions and arbitrary plugin data are not translated.
- Rendered image URLs are temporary Figma assets and should not be treated as
  permanent hosting. Asset materialization is still required before exported
  pages can be considered durable.
- The v2 mapper preserves common structure, constraints, component metadata,
  grids, and effects, but variables, advanced component-set semantics, complex
  vector effects, and prototype behavior still require deeper mapping/review.
- Image-only references do not yet produce the same v2 plan; that parity is the
  next core slice, not an optional enhancement.
- Figma applies REST limits based on endpoint tier, seat type, and the plan that
  contains the requested file. Rate-limit responses are surfaced as a safe
  import failure rather than retried aggressively.

## Security Model

User input is parsed only for a Figma file key and optional node id. The server
constructs requests against the fixed `api.figma.com` origin, preventing the
URL field from becoming a general-purpose server-side request proxy.
