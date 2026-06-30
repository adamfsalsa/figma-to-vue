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
    <template v-if="region.text">{{ region.text }}</template>
    <ReconstructionRegion
      v-for="child in region.children"
      v-else
      :key="child.id"
      :region="child"
      :parent-width="region.bounds?.width"
    />
  </button>

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
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { ReconstructionRegion } from '../types/reconstructionPlan';

const props = defineProps<{
  parentWidth?: number;
  region: ReconstructionRegion;
}>();

const regionStyle = computed<CSSProperties>(() => {
  const { bounds, layout, style } = props.region;
  const result: CSSProperties = {};

  if (layout) {
    result.display = layout.mode === 'grid' ? 'grid' : 'flex';
    if (layout.mode !== 'grid') result.flexDirection = layout.mode === 'row' ? 'row' : 'column';
    if (layout.gap !== undefined) result.gap = `${layout.gap}px`;
    if (layout.align) result.alignItems = layout.align === 'start' ? 'flex-start' : layout.align === 'end' ? 'flex-end' : layout.align;
    if (layout.justify) result.justifyContent = layout.justify === 'start' ? 'flex-start' : layout.justify === 'end' ? 'flex-end' : layout.justify;
    if (layout.padding) {
      result.padding = `${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px`;
    }
  }

  if (bounds?.width && props.parentWidth && props.parentWidth > 0) {
    result.flexBasis = `${Math.min(100, Math.max(1, (bounds.width / props.parentWidth) * 100))}%`;
  }
  if (bounds?.width && bounds?.height && props.region.element === 'media') {
    result.aspectRatio = `${bounds.width} / ${bounds.height}`;
  }

  if (style?.background) result.background = style.background;
  if (style?.borderColor) result.border = `1px solid ${style.borderColor}`;
  if (style?.borderRadius !== undefined) result.borderRadius = `${style.borderRadius}px`;
  if (style?.color) result.color = style.color;
  if (style?.fontFamily) result.fontFamily = style.fontFamily;
  if (style?.fontSize !== undefined) result.fontSize = `${style.fontSize}px`;
  if (style?.fontWeight !== undefined) result.fontWeight = style.fontWeight;
  if (style?.letterSpacing !== undefined) result.letterSpacing = `${style.letterSpacing}px`;
  if (style?.lineHeight !== undefined) result.lineHeight = `${style.lineHeight}px`;
  if (style?.opacity !== undefined) result.opacity = style.opacity;
  if (style?.textAlign) result.textAlign = style.textAlign;

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

@media (max-width: 48rem) {
  .reconstruction-region--row {
    flex-wrap: wrap;
  }

  .reconstruction-region--row > .reconstruction-region {
    flex: 1 1 min(100%, 18rem);
  }
}
</style>
