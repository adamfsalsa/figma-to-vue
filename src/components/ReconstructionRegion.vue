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
      :parent-layout-mode="region.layout?.mode"
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
      :parent-layout-mode="region.layout?.mode"
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
      :parent-layout-mode="region.layout?.mode"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { ReconstructionLayout, ReconstructionRegion } from '../types/reconstructionPlan';

const props = defineProps<{
  parentWidth?: number;
  parentLayoutMode?: ReconstructionLayout['mode'];
  region: ReconstructionRegion;
}>();

const regionStyle = computed<CSSProperties>(() => {
  const { bounds, layout, style } = props.region;
  const result: CSSProperties = {};

  if (layout) {
    if (props.region.children.length > 0) {
      result.display = layout.mode === 'grid' ? 'grid' : 'flex';
      if (layout.mode !== 'grid') result.flexDirection = layout.mode === 'row' ? 'row' : 'column';
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

  if (bounds?.width && props.parentWidth && props.parentWidth > 0) {
    const width = `${Math.min(100, Math.max(1, (bounds.width / props.parentWidth) * 100))}%`;
    if (props.parentLayoutMode === 'row') result.flexBasis = width;
    if (props.parentLayoutMode === 'column') result.width = width;
  }
  if (props.region.element === 'page' && bounds?.width) {
    result.maxWidth = `${bounds.width}px`;
    result.margin = '0 auto';
  }
  if (props.parentLayoutMode === 'column' && layout?.constraints?.horizontal === 'center') result.alignSelf = 'center';
  if (props.parentLayoutMode === 'column' && layout?.constraints?.horizontal === 'end') result.alignSelf = 'flex-end';
  if (bounds?.width && bounds?.height && props.region.element === 'media') {
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
  if (style?.fontSize !== undefined) result.fontSize = `${style.fontSize}px`;
  if (style?.fontWeight !== undefined) result.fontWeight = style.fontWeight;
  if (style?.letterSpacing !== undefined) result.letterSpacing = `${style.letterSpacing}px`;
  if (style?.lineHeight !== undefined) result.lineHeight = `${style.lineHeight}px`;
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

  .reconstruction-region--column > .reconstruction-region {
    width: 100% !important;
  }
}
</style>
