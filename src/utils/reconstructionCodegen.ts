import type {
  ReconstructionBounds,
  ReconstructionLayout,
  ReconstructionPlan,
  ReconstructionRegion,
  ReconstructionStyle,
} from '../types/reconstructionPlan';

export interface ReconstructionArtifact {
  css: string;
  markup: string;
}

interface ParentContext {
  bounds?: ReconstructionBounds;
  mode?: ReconstructionLayout['mode'];
  width?: number;
}

/**
 * Emits static, source-dependent semantic markup and CSS from a validated
 * reconstruction plan. This is shared by HTML and Vue SFC export so those
 * artifacts preserve the same region tree.
 */
export function generateReconstructionArtifact(plan: ReconstructionPlan): ReconstructionArtifact {
  const cssRules: string[] = [];
  const markup = plan.regions
    .map((region) => renderRegion(region, { width: plan.viewport.width ?? undefined }, cssRules))
    .join('\n');

  return {
    markup,
    css: `${BASE_CSS}\n${cssRules.join('\n')}\n${RESPONSIVE_CSS}`,
  };
}

function renderRegion(
  region: ReconstructionRegion,
  parent: ParentContext,
  cssRules: string[],
): string {
  const className = safeClass(region.id);
  const layoutClass = region.layout ? ` rr--${region.layout.mode}` : '';
  const classes = `rr rr--${region.element}${layoutClass} ${className}`;
  cssRules.push(buildRule(region, parent, className));

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
    .map((child) => renderRegion(
      child,
      { width: region.bounds?.width, bounds: region.bounds, mode: region.layout?.mode },
      cssRules,
    ))
    .join('\n');
  return `<${tag}${attributes} class="${classes}" data-reconstruction-region="${escapeHtml(region.id)}">${text}${children}</${tag}>`;
}

function buildRule(
  region: ReconstructionRegion,
  parent: ParentContext,
  className: string,
): string {
  const declarations: string[] = [];
  const { bounds, layout, style } = region;
  const placement = absolutePlacement(region, parent);
  if (layout) {
    if (region.children.length > 0) {
      if (layout.mode === 'free') {
        declarations.push('position: relative');
        // Free frames are query containers so descendant text scales in cqw
        // with the frame instead of overflowing its box at small widths.
        declarations.push('container-type: inline-size');
      } else {
        declarations.push(`display: ${layout.mode === 'grid' ? 'grid' : 'flex'}`);
        if (layout.mode !== 'grid') declarations.push(`flex-direction: ${layout.mode === 'row' ? 'row' : 'column'}`);
      }
    }
    if (layout.mode === 'free' && bounds?.width && bounds.height) {
      declarations.push(`aspect-ratio: ${number(bounds.width)} / ${number(bounds.height)}`);
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
  if (placement) {
    declarations.push(...placement);
  } else if (bounds?.width && parent.width && parent.width > 0) {
    declarations.push(`flex-basis: ${percent((bounds.width / parent.width) * 100)}`);
  }
  if (bounds?.width && bounds.height && region.element === 'media' && !placement) {
    declarations.push(`aspect-ratio: ${number(bounds.width)} / ${number(bounds.height)}`);
  }
  const fontScaleBase = parent.mode === 'free' && parentBoundsWidth(parent) ? parentBoundsWidth(parent) : undefined;
  appendStyle(declarations, style, fontScaleBase);
  return `.${className} { ${declarations.join('; ')}; }`;
}

function parentBoundsWidth(parent: ParentContext): number | undefined {
  return parent.bounds && parent.bounds.width > 0 ? parent.bounds.width : undefined;
}

/**
 * Children of a free (non-auto-layout) frame keep the source's pixel
 * placement as percentages of the frame, matching the live preview renderer.
 */
function absolutePlacement(region: ReconstructionRegion, parent: ParentContext): string[] | null {
  const parentBounds = parent.bounds;
  const bounds = region.bounds;
  if (
    parent.mode !== 'free'
    || !parentBounds || !Number.isFinite(parentBounds.x) || !Number.isFinite(parentBounds.y)
    || parentBounds.width <= 0 || parentBounds.height <= 0
    || !bounds || !Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)
  ) return null;
  return [
    'position: absolute',
    `left: ${percentClamped(((bounds.x! - parentBounds.x!) / parentBounds.width) * 100)}`,
    `top: ${percentClamped(((bounds.y! - parentBounds.y!) / parentBounds.height) * 100)}`,
    `width: ${percentClamped((bounds.width / parentBounds.width) * 100)}`,
    ...(region.element === 'text'
      ? []
      : [`height: ${percentClamped((bounds.height / parentBounds.height) * 100)}`]),
    'margin: 0',
  ];
}

function appendStyle(
  declarations: string[],
  style: ReconstructionStyle | undefined,
  fontScaleBase?: number,
): void {
  if (!style) return;
  const cqw = (value: number) => `${number((value / fontScaleBase!) * 100)}cqw`;
  if (style.background) declarations.push(`background: ${safeCssToken(style.background)}`);
  if (style.borderColor) declarations.push(`border: ${px(style.borderWidth ?? 1)} solid ${safeCssToken(style.borderColor)}`);
  if (style.borderRadius !== undefined) declarations.push(`border-radius: ${px(style.borderRadius)}`);
  if (style.borderRadii) {
    declarations.push(`border-radius: ${px(style.borderRadii.topLeft)} ${px(style.borderRadii.topRight)} ${px(style.borderRadii.bottomRight)} ${px(style.borderRadii.bottomLeft)}`);
  }
  if (style.color) declarations.push(`color: ${safeCssToken(style.color)}`);
  if (style.fontFamily) declarations.push(`font-family: ${safeFont(style.fontFamily)}`);
  if (style.fontSize !== undefined) {
    declarations.push(`font-size: ${fontScaleBase ? cqw(style.fontSize) : px(style.fontSize)}`);
  }
  if (style.fontWeight !== undefined) declarations.push(`font-weight: ${number(style.fontWeight)}`);
  if (style.letterSpacing !== undefined) declarations.push(`letter-spacing: ${px(style.letterSpacing)}`);
  if (style.lineHeight !== undefined) {
    declarations.push(`line-height: ${fontScaleBase ? cqw(style.lineHeight) : px(style.lineHeight)}`);
  }
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

function percentClamped(value: number): string {
  return `${number(Math.min(100, Math.max(0, value)))}%`;
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
}`;
