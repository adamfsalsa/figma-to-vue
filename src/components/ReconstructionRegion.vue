<template>
  <img
    v-if="region.element === 'media' && region.asset?.url"
    class="reconstruction-region reconstruction-region--media"
    :src="region.asset.url"
    :alt="region.asset.alt"
    :data-reconstruction-region="region.id"
    :style="regionStyle"
  />

  <div
    v-else-if="region.element === 'media'"
    class="reconstruction-region reconstruction-region--media-placeholder"
    :data-reconstruction-region="region.id"
    :style="regionStyle"
    :role="region.asset?.alt ? 'img' : undefined"
    :aria-label="region.asset?.alt || undefined"
  >
    <span v-if="region.asset?.alt">{{ region.asset.alt }}</span>
  </div>

  <button
    v-else-if="region.tag === 'button'"
    type="button"
    class="reconstruction-region reconstruction-region--button"
    :data-reconstruction-region="region.id"
    :style="regionStyle"
  >
    <template v-if="region.text || region.children.length === 0">
      {{ region.text || region.control?.label }}
    </template>
    <ReconstructionRegion
      v-for="child in region.children"
      v-else
      :key="child.id"
      :region="child"
      :parent-width="region.bounds?.width"
      :parent-bounds="region.bounds"
      :parent-mode="region.layout?.mode"
    />
  </button>

  <a
    v-else-if="region.tag === 'a'"
    href="#"
    class="reconstruction-region reconstruction-region--link"
    :data-reconstruction-region="region.id"
    :style="regionStyle"
    @click.prevent
  >
    <template v-if="region.text || region.children.length === 0">
      {{ region.text || region.control?.label }}
    </template>
    <ReconstructionRegion
      v-for="child in region.children"
      v-else
      :key="child.id"
      :region="child"
      :parent-width="region.bounds?.width"
      :parent-bounds="region.bounds"
      :parent-mode="region.layout?.mode"
    />
  </a>

  <input
    v-else-if="region.tag === 'input'"
    class="reconstruction-region reconstruction-region--input"
    :data-reconstruction-region="region.id"
    :style="regionStyle"
    :type="region.control?.type === 'email' || region.control?.type === 'search' || region.control?.type === 'password' ? region.control.type : 'text'"
    :aria-label="region.control?.label || region.name"
    :placeholder="region.control?.placeholder"
  />

  <component
    :is="renderTag"
    v-else
    class="reconstruction-region"
    :class="[
      `reconstruction-region--${region.element}`,
      region.layout ? `reconstruction-region--${region.layout.mode}` : '',
    ]"
    :data-reconstruction-region="region.id"
    :style="regionStyle"
  >
    <template v-if="region.text">{{ region.text }}</template>
    <ReconstructionRegion
      v-for="child in region.children"
      v-else
      :key="child.id"
      :region="child"
      :parent-width="region.bounds?.width"
      :parent-bounds="region.bounds"
      :parent-mode="region.layout?.mode"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { ReconstructionBounds, ReconstructionLayout, ReconstructionRegion } from '../types/reconstructionPlan';

const props = defineProps<{
  parentBounds?: ReconstructionBounds;
  parentMode?: ReconstructionLayout['mode'];
  parentWidth?: number;
  region: ReconstructionRegion;
}>();

// A child of a free (non-auto-layout) frame keeps the source's pixel
// placement, expressed as percentages of the frame so the whole composition
// scales with the preview width.
const absolutePlacement = computed<CSSProperties | null>(() => {
  const parent = props.parentBounds;
  const bounds = props.region.bounds;
  if (
    props.parentMode !== 'free'
    || !parent || !Number.isFinite(parent.x) || !Number.isFinite(parent.y)
    || parent.width <= 0 || parent.height <= 0
    || !bounds || !Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)
  ) return null;
  const pct = (value: number) => `${Math.round(Math.min(100, Math.max(0, value)) * 100) / 100}%`;
  return {
    position: 'absolute',
    left: pct(((bounds.x! - parent.x!) / parent.width) * 100),
    top: pct(((bounds.y! - parent.y!) / parent.height) * 100),
    width: pct((bounds.width / parent.width) * 100),
    // Text keeps auto height so wrapped copy isn't clipped by a scaled box.
    ...(props.region.element === 'text' ? {} : { height: pct((bounds.height / parent.height) * 100) }),
    margin: 0,
  };
});

const regionStyle = computed<CSSProperties>(() => {
  const { bounds, layout, style } = props.region;
  const result: CSSProperties = {};

  if (layout) {
    if (props.region.children.length > 0) {
      if (layout.mode === 'free') {
        result.position = 'relative';
        // Free frames are query containers so descendant text can scale in
        // cqw with the frame instead of overflowing its box at small widths.
        result.containerType = 'inline-size';
      } else {
        result.display = layout.mode === 'grid' ? 'grid' : 'flex';
        if (layout.mode !== 'grid') result.flexDirection = layout.mode === 'row' ? 'row' : 'column';
      }
    }
    if (layout.mode === 'free' && bounds?.width && bounds?.height) {
      result.aspectRatio = `${bounds.width} / ${bounds.height}`;
    }
    if (layout.gap !== undefined) result.gap = `${layout.gap}px`;
    if (layout.columns !== undefined && layout.mode === 'grid') {
      result.gridTemplateColumns = `repeat(${layout.columns}, minmax(0, 1fr))`;
    }
    if (layout.wrap) result.flexWrap = 'wrap';
    if (layout.align) result.alignItems = layout.align === 'start' ? 'flex-start' : layout.align === 'end' ? 'flex-end' : layout.align;
    if (layout.justify) result.justifyContent = layout.justify === 'start' ? 'flex-start' : layout.justify === 'end' ? 'flex-end' : layout.justify;
    if (layout.padding) {
      result.padding = `${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px`;
    }
    if (layout.sizing?.horizontal === 'fill') result.flexGrow = 1;
    if (layout.sizing?.horizontal === 'hug') result.width = 'fit-content';
    if (layout.constraints?.horizontal === 'stretch') result.alignSelf = 'stretch';
    if (layout.constraints?.horizontal === 'scale') result.width = '100%';
    if (layout.sizeLimits?.minWidth !== undefined) result.minWidth = `${layout.sizeLimits.minWidth}px`;
    if (layout.sizeLimits?.maxWidth !== undefined) result.maxWidth = `${layout.sizeLimits.maxWidth}px`;
    if (layout.sizeLimits?.minHeight !== undefined) result.minHeight = `${layout.sizeLimits.minHeight}px`;
    if (layout.sizeLimits?.maxHeight !== undefined) result.maxHeight = `${layout.sizeLimits.maxHeight}px`;
  }

  if (absolutePlacement.value) {
    Object.assign(result, absolutePlacement.value);
  } else if (bounds?.width && props.parentWidth && props.parentWidth > 0) {
    result.flexBasis = `${Math.min(100, Math.max(1, (bounds.width / props.parentWidth) * 100))}%`;
  }
  if (bounds?.width && bounds?.height && props.region.element === 'media' && !absolutePlacement.value) {
    result.aspectRatio = `${bounds.width} / ${bounds.height}`;
  }

  if (style?.background) result.background = style.background;
  if (style?.borderColor) result.border = `${style.borderWidth ?? 1}px solid ${style.borderColor}`;
  if (style?.borderRadius !== undefined) result.borderRadius = `${style.borderRadius}px`;
  if (style?.borderRadii) {
    result.borderRadius = `${style.borderRadii.topLeft}px ${style.borderRadii.topRight}px ${style.borderRadii.bottomRight}px ${style.borderRadii.bottomLeft}px`;
  }
  if (style?.color) result.color = style.color;
  if (style?.fontFamily) result.fontFamily = style.fontFamily;
  const fontScaleBase = props.parentMode === 'free' && props.parentBounds && props.parentBounds.width > 0
    ? props.parentBounds.width
    : undefined;
  const cqw = (value: number) => `${Math.round((value / fontScaleBase!) * 100 * 1000) / 1000}cqw`;
  if (style?.fontSize !== undefined) result.fontSize = fontScaleBase ? cqw(style.fontSize) : `${style.fontSize}px`;
  if (style?.fontWeight !== undefined) result.fontWeight = style.fontWeight;
  if (style?.letterSpacing !== undefined) result.letterSpacing = `${style.letterSpacing}px`;
  if (style?.lineHeight !== undefined) result.lineHeight = fontScaleBase ? cqw(style.lineHeight) : `${style.lineHeight}px`;
  if (style?.opacity !== undefined) result.opacity = style.opacity;
  if (style?.overflow) result.overflow = style.overflow;
  if (style?.boxShadow) result.boxShadow = style.boxShadow;
  if (style?.blur !== undefined) result.filter = `blur(${style.blur}px)`;
  if (style?.textAlign) result.textAlign = style.textAlign;
  if (style?.textDecoration) result.textDecoration = style.textDecoration;
  if (style?.textTransform) result.textTransform = style.textTransform;

  return result;
});

// The app preview already sits inside the application's <main>. Exported
// artifacts keep the source root as <main>, while the embedded preview avoids
// invalid nested-main landmarks.
const renderTag = computed(() =>
  props.region.element === 'page' && props.region.tag === 'main' ? 'div' : props.region.tag,
);
</script>

<style scoped>
.reconstruction-region {
  box-sizing: border-box;
  min-width: 0;
}

.reconstruction-region--page {
  width: 100%;
  overflow: hidden;
}

.reconstruction-region--text {
  margin: 0;
  white-space: pre-wrap;
}

.reconstruction-region--media {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}

.reconstruction-region--media-placeholder {
  display: grid;
  min-height: 8rem;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(14, 165, 233, 0.08)),
    #f4f6fb;
  color: #64748b;
  font-size: 0.75rem;
}

.reconstruction-region--button {
  min-height: 44px;
  padding: 0.65rem 1rem;
  border: 0;
  cursor: pointer;
  font: inherit;
}

.reconstruction-region--link {
  color: inherit;
}

.reconstruction-region--input {
  min-height: 44px;
  padding: 0.65rem 0.85rem;
  font: inherit;
}

@media (max-width: 48rem) {
  .reconstruction-region--row {
    flex-wrap: wrap;
  }

  .reconstruction-region--row > .reconstruction-region {
    flex: 1 1 min(100%, 18rem);
  }
}
</style>
