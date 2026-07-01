import type {
  ReconstructionPlan,
  ReconstructionRegion,
  ReconstructionStyle,
} from '../types/reconstructionPlan';

export interface ReconstructionArtifact {
  css: string;
  markup: string;
}

/**
 * Emits static, source-dependent semantic markup and CSS from a validated
 * reconstruction plan. This is shared by HTML and Vue SFC export so those
 * artifacts preserve the same region tree.
 */
export function generateReconstructionArtifact(plan: ReconstructionPlan): ReconstructionArtifact {
  const cssRules: string[] = [];
  const markup = plan.regions
    .map((region) => renderRegion(region, plan.viewport.width ?? undefined, undefined, cssRules))
    .join('\n');

  return {
    markup,
    css: `${BASE_CSS}\n${cssRules.join('\n')}\n${RESPONSIVE_CSS}`,
  };
}

function renderRegion(
  region: ReconstructionRegion,
  parentWidth: number | undefined,
  parentLayoutMode: ReconstructionLayoutMode,
  cssRules: string[],
): string {
  const className = safeClass(region.id);
  const layoutClass = region.layout ? ` rr--${region.layout.mode}` : '';
  const classes = `rr rr--${region.element}${layoutClass} ${className}`;
  cssRules.push(buildRule(region, parentWidth, parentLayoutMode, className));

  if (region.element === 'media') {
    if (region.asset?.url) {
      return `<img class="${classes}" data-reconstruction-region="${escapeHtml(region.id)}" src="${escapeHtml(region.asset.url)}" alt="${escapeHtml(region.asset.alt)}">`;
    }
    const label = region.asset?.alt ?? '';
    const accessibility = label
      ? ` role="img" aria-label="${escapeHtml(label)}"`
      : ' aria-hidden="true"';
    return `<div class="${classes} rr--media-placeholder" data-reconstruction-region="${escapeHtml(region.id)}"${accessibility}>${label ? `<span>${escapeHtml(label)}</span>` : ''}</div>`;
  }

  if (region.tag === 'input') {
    const type = ['email', 'search', 'password'].includes(region.control?.type ?? '')
      ? region.control!.type
      : 'text';
    const label = region.control?.label || region.name;
    const placeholder = region.control?.placeholder
      ? ` placeholder="${escapeHtml(region.control.placeholder)}"`
      : '';
    return `<input type="${type}" class="${classes}" data-reconstruction-region="${escapeHtml(region.id)}" aria-label="${escapeHtml(label)}"${placeholder}>`;
  }

  const tag = region.tag === 'img' ? 'div' : region.tag;
  const attributes = tag === 'button' ? ' type="button"' : tag === 'a' ? ' href="#"' : '';
  const fallbackLabel = region.children.length === 0 ? region.control?.label : undefined;
  const text = region.text ? escapeHtml(region.text) : fallbackLabel ? escapeHtml(fallbackLabel) : '';
  const children = region.children
    .map((child) => renderRegion(child, region.bounds?.width, region.layout?.mode, cssRules))
    .join('\n');
  return `<${tag}${attributes} class="${classes}" data-reconstruction-region="${escapeHtml(region.id)}">${text}${children}</${tag}>`;
}

function buildRule(
  region: ReconstructionRegion,
  parentWidth: number | undefined,
  parentLayoutMode: ReconstructionLayoutMode,
  className: string,
): string {
  const declarations: string[] = [];
  const { bounds, layout, style } = region;
  if (layout) {
    if (region.children.length > 0) {
      declarations.push(`display: ${layout.mode === 'grid' ? 'grid' : 'flex'}`);
      if (layout.mode !== 'grid') declarations.push(`flex-direction: ${layout.mode === 'row' ? 'row' : 'column'}`);
    }
    if (layout.gap !== undefined) declarations.push(`gap: ${px(layout.gap)}`);
    if (layout.columns !== undefined && layout.mode === 'grid') {
      declarations.push(`grid-template-columns: repeat(${Math.max(1, Math.round(layout.columns))}, minmax(0, 1fr))`);
    }
    if (layout.wrap) declarations.push('flex-wrap: wrap');
    if (layout.align) declarations.push(`align-items: ${flexValue(layout.align)}`);
    if (layout.justify) declarations.push(`justify-content: ${flexValue(layout.justify)}`);
    if (layout.padding) {
      declarations.push(`padding: ${px(layout.padding.top)} ${px(layout.padding.right)} ${px(layout.padding.bottom)} ${px(layout.padding.left)}`);
    }
    if (layout.sizing?.horizontal === 'fill') declarations.push('flex-grow: 1');
    if (layout.sizing?.horizontal === 'hug') declarations.push('width: fit-content');
    if (layout.constraints?.horizontal === 'stretch') declarations.push('align-self: stretch');
    if (layout.constraints?.horizontal === 'scale') declarations.push('width: 100%');
    if (layout.sizeLimits?.minWidth !== undefined) declarations.push(`min-width: ${px(layout.sizeLimits.minWidth)}`);
    if (layout.sizeLimits?.maxWidth !== undefined) declarations.push(`max-width: ${px(layout.sizeLimits.maxWidth)}`);
    if (layout.sizeLimits?.minHeight !== undefined) declarations.push(`min-height: ${px(layout.sizeLimits.minHeight)}`);
    if (layout.sizeLimits?.maxHeight !== undefined) declarations.push(`max-height: ${px(layout.sizeLimits.maxHeight)}`);
  }
  if (bounds?.width && parentWidth && parentWidth > 0) {
    const width = percent((bounds.width / parentWidth) * 100);
    if (parentLayoutMode === 'row') declarations.push(`flex-basis: ${width}`);
    if (parentLayoutMode === 'column') declarations.push(`width: ${width}`);
  }
  if (region.element === 'page' && bounds?.width) {
    declarations.push(`max-width: ${px(bounds.width)}`);
    declarations.push('margin: 0 auto');
  }
  if (parentLayoutMode === 'column' && layout?.constraints?.horizontal === 'center') declarations.push('align-self: center');
  if (parentLayoutMode === 'column' && layout?.constraints?.horizontal === 'end') declarations.push('align-self: flex-end');
  if (bounds?.width && bounds.height && region.element === 'media') {
    declarations.push(`aspect-ratio: ${number(bounds.width)} / ${number(bounds.height)}`);
  }
  appendStyle(declarations, style);
  return `.${className} { ${declarations.join('; ')}; }`;
}

function appendStyle(declarations: string[], style: ReconstructionStyle | undefined): void {
  if (!style) return;
  if (style.background) declarations.push(`background: ${safeCssToken(style.background)}`);
  if (style.borderColor) declarations.push(`border: ${px(style.borderWidth ?? 1)} solid ${safeCssToken(style.borderColor)}`);
  if (style.borderRadius !== undefined) declarations.push(`border-radius: ${px(style.borderRadius)}`);
  if (style.borderRadii) {
    declarations.push(`border-radius: ${px(style.borderRadii.topLeft)} ${px(style.borderRadii.topRight)} ${px(style.borderRadii.bottomRight)} ${px(style.borderRadii.bottomLeft)}`);
  }
  if (style.color) declarations.push(`color: ${safeCssToken(style.color)}`);
  if (style.fontFamily) declarations.push(`font-family: ${safeFont(style.fontFamily)}`);
  if (style.fontSize !== undefined) declarations.push(`font-size: ${px(style.fontSize)}`);
  if (style.fontWeight !== undefined) declarations.push(`font-weight: ${number(style.fontWeight)}`);
  if (style.letterSpacing !== undefined) declarations.push(`letter-spacing: ${px(style.letterSpacing)}`);
  if (style.lineHeight !== undefined) declarations.push(`line-height: ${px(style.lineHeight)}`);
  if (style.opacity !== undefined) declarations.push(`opacity: ${number(style.opacity)}`);
  if (style.overflow) declarations.push(`overflow: ${style.overflow}`);
  if (style.boxShadow) declarations.push(`box-shadow: ${safeShadow(style.boxShadow)}`);
  if (style.blur !== undefined) declarations.push(`filter: blur(${px(style.blur)})`);
  if (style.textAlign) declarations.push(`text-align: ${style.textAlign}`);
  if (style.textDecoration) declarations.push(`text-decoration: ${style.textDecoration}`);
  if (style.textTransform) declarations.push(`text-transform: ${style.textTransform}`);
}

function flexValue(value: string): string {
  if (value === 'start') return 'flex-start';
  if (value === 'end') return 'flex-end';
  return value;
}

function safeClass(value: string): string {
  return `rr-${value.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function safeCssToken(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : 'inherit';
}

function safeFont(value: string): string {
  return `"${value.replace(/["\\;{}]/g, '')}", system-ui, sans-serif`;
}

function safeShadow(value: string): string {
  return /^-?[\d.]+px -?[\d.]+px [\d.]+px [\d.]+px rgba\(\d{1,3}, \d{1,3}, \d{1,3}, [\d.]+\)( inset)?$/.test(value)
    ? value
    : 'none';
}

function px(value: number): string {
  return `${number(Math.max(0, value))}px`;
}

function percent(value: number): string {
  return `${number(Math.min(100, Math.max(1, value)))}%`;
}

function number(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '0';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const BASE_CSS = `.rr { box-sizing: border-box; min-width: 0; }
.rr--page { width: 100%; overflow: hidden; }
.rr--text { margin: 0; white-space: pre-wrap; }
.rr--media { display: block; width: 100%; height: auto; object-fit: cover; }
.rr--media-placeholder { display: grid; min-height: 8rem; place-items: center; background: #f4f6fb; color: #64748b; }
.rr--button { min-height: 44px; padding: 0.65rem 1rem; border: 0; cursor: pointer; font: inherit; }
.rr--link { color: inherit; }
.rr--input { min-height: 44px; padding: 0.65rem 0.85rem; font: inherit; }`;

const RESPONSIVE_CSS = `@media (max-width: 48rem) {
  .rr--row { flex-wrap: wrap; }
  .rr--row > .rr { flex: 1 1 min(100%, 18rem); }
  .rr--column > .rr { width: 100% !important; }
}`;

type ReconstructionLayoutMode = NonNullable<ReconstructionRegion['layout']>['mode'] | undefined;
