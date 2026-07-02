# Making Figma Files Preview Properly

A practical checklist for getting a high-fidelity preview out of the Figma
import, plus a clear answer to "does this run through AI?"

---

## TL;DR

- The preview is built by a **deterministic reconstruction mapper**
  (`api/figma.ts` → `buildReconstructionPlan` in `src/utils/figmaDocument.ts`).
  **No AI is involved** in the import or the preview.
- Preview fidelity depends heavily on **how the Figma frame is authored**.
  Frames built with **Auto Layout** reconstruct as responsive flexbox; frames
  with **free (absolute) positioning** now reconstruct at their source pixel
  positions via a percentage-based absolute-position fallback (see §6).
- AI (`api/analyze.ts`) is a **separate, optional** step that only enriches
  **copy and semantic classification** — it does **not** affect preview layout.

---

## 1. Does the Figma path run through AI?

**No — not the import or the preview.**

| Stage | What runs | AI? |
|---|---|---|
| Import URL → data (`api/figma.ts`) | Figma REST API + deterministic mapping | ❌ No |
| Reconstruction plan → preview (`ReconstructionRegion.vue`) | Pure CSS flow/grid from the plan | ❌ No |
| "Enhance with AI" (`api/analyze.ts`) | Claude vision model | ✅ Yes (optional, manual) |

The **only** AI touchpoint is the **"Enhance with AI"** button (`enhanceWithAi`
in `src/App.vue`). It is:

- **Optional and manual** — nothing calls it automatically.
- **Fed the rendered PNG** Figma returns (not the file structure).
- **Scoped to semantics + copy for Figma imports** — it merges into
  `referenceAnalysis` (hero composition, layout pattern, CTA style) and
  `aiContent` (generated page copy). It also proposes a spatial
  reconstruction plan, but that is applied **only for uploaded images**: a
  Figma import already holds an exact document-derived plan, and `App.vue`
  never overwrites it with a visual guess. So for the Figma path it cannot
  fix or change how a frame lays out in the preview.
- **Gated** — it refuses to run unless BOTH `ANTHROPIC_API_KEY` and the Upstash
  rate-limit store (`UPSTASH_REDIS_REST_URL` + `_TOKEN`) are configured;
  otherwise it returns `not_configured`.

**Bottom line:** if a preview looks broken, AI won't help — the fix is in the
deterministic mapper or in how the Figma frame is built.

---

## 2. Prerequisites (environment)

The import cannot work at all unless these are true:

1. **Run on Vercel (or `vercel dev`), not plain `vite`.**
   `api/figma.ts` is a serverless function. `npm run dev` (plain `vite`) does
   **not** serve `/api/*`, so the button returns 404 → "Figma import is
   unavailable right now." Local development of the import needs `vercel dev`
   or a dev middleware that mounts the handler.
2. **`FIGMA_ACCESS_TOKEN` is set** (server-side, in Vercel project settings),
   with `file_content:read` scope. Never prefix with `VITE_`.
3. **The URL is a supported type** (see next section).

---

## 3. Supported Figma URL types

Only these are accepted by `parseFigmaUrl`:

| URL prefix | Type | Supported |
|---|---|---|
| `figma.com/design/…` | Design file | ✅ |
| `figma.com/file/…` | Legacy design file | ✅ |
| `figma.com/proto/…` | Prototype | ✅ |
| `figma.com/site/…` | Figma Sites | ✅ (merged to `main` via PR #15) |
| `figma.com/board/…` | FigJam whiteboard | ❌ |
| `figma.com/slides/…` | Figma Slides | ❌ |
| `figma.com/files/…`, `/team/…` | Dashboard/project pages | ❌ |

Use **Copy link to selection** (`Ctrl+L`) on a frame so the URL includes a
`node-id` — that imports the exact frame. A URL without `node-id` imports the
first top-level frame/component/section instead.

---

## 4. Authoring the Figma frame for a good preview (most important)

The reconstruction mapper turns Figma layout metadata into CSS flexbox/grid. It
does **not** use absolute x/y coordinates to position elements. So the closer
your frame is to a real responsive layout, the better it reconstructs.

**Do:**

- **Use Auto Layout** on the frame and its groups (`Shift+A`). This is the
  single biggest factor. Auto Layout gives the mapper direction, gap, padding,
  and alignment that map directly to flexbox.
- **Set sizing intentionally** — fill vs. hug vs. fixed on each layer. These map
  to `flex-grow`, `fit-content`, and fixed widths.
- **Set constraints** (left/right/center/stretch/scale) — used for alignment
  and stretch behavior.
- **Name layers meaningfully.** Names like "button", "search", "email",
  "password" let the mapper infer semantic elements (`<button>`, `<input>`).
- **Keep images as real image fills** so they can be rendered/embedded.
- **Keep the frame reasonably sized** — the scan caps at ~2,000 nodes.

**Avoid:**

- **Relying on true reflow for free/absolute-positioned frames.** Non–Auto-Layout
  frames reconstruct faithfully (see §6), but as a proportionally scaling
  composition — they shrink as a unit at narrow widths instead of reflowing
  into a mobile layout. Only Auto Layout gives the mapper real responsive
  intent.
- **Deeply nested decorative wrappers** — they add noise to the region tree.
- **Relying on Figma Variables** — they are not fetched (plan/scope limits).
- **Relying on prototype interactions** — not translated.

---

## 5. Known limitations (won't be perfect even when authored well)

- **Free-form frames scale proportionally instead of reflowing** (see §4/§6).
  Position is preserved; responsive re-layout is not.
- **Asset embedding is capped**: 600 KB per asset, 2.25 MB total; only
  Figma-owned PNG/JPEG/WebP/GIF. Assets over budget stay remote or fall back to
  placeholders.
- **The full-frame comparison image is temporary** and comparison-only.
- **Variables, advanced component-set semantics, complex vector effects, and
  prototype behavior** still need deeper mapping/review.
- **Rate limits**: Figma REST limits are surfaced as a safe import failure, not
  retried aggressively.

---

## 6. Absolute-position fallback (implemented)

Free-form (non–Auto-Layout) frames now preview faithfully:

- When a frame has **no `layoutMode`** and it plus all mapped children carry
  positioned bounds, `toLayout` (`src/utils/figmaDocument.ts`) emits
  `layout.mode: 'free'` instead of the old `inferFreeLayout` flow guess (which
  remains only as a fallback when bounds are missing).
- Both renderers — `ReconstructionRegion.vue` (live preview) and
  `reconstructionCodegen.ts` (Vue SFC + HTML export) — honor `free`: the frame
  becomes `position: relative` with its source `aspect-ratio`, and each child
  is `position: absolute` with `left/top/width/height` as **percentages of the
  frame**, so the composition scales with the preview width. Overlaps and
  z-order follow the Figma child order.
- Free frames are also `container-type: inline-size` query containers, and
  text inside them uses `cqw` font/line-height so typography scales with the
  frame instead of overflowing its box at narrow widths. Text keeps auto
  height so wrapped copy is never clipped.

This reproduces any free-form Figma frame at its source positions, while Auto
Layout frames keep the responsive flow path. Covered by
`tests/reconstructionRenderer.test.ts` ("reconstructs free (non-auto-layout)
frames at their source positions") and `tests/figmaDocument.test.ts`.

---

## 7. Quick triage when a preview looks wrong

1. **Is it on Vercel with the token set?** If not, it never imported.
2. **Is the URL a `/design`, `/file`, `/proto`, or `/site` link with a
   `node-id`?** If it's `/board` or `/slides`, it's unsupported.
3. **Does the frame use Auto Layout?** If not, it renders via the
   absolute-position fallback (§6): faithful placement, but it scales as one
   unit instead of reflowing at mobile widths. Apply Auto Layout in Figma and
   re-import if you want responsive reflow.
4. **Are images missing?** Check the asset size caps (§5).
5. **Expecting AI to fix layout?** It won't — AI only affects copy/classification
   (§1).
