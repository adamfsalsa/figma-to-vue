import type { FigmaDocumentImport } from '../types/figmaImport.js';
import type { GeneratedContent } from '../types/pagePlan.js';
import type {
  ReconstructionLayout,
  ReconstructionPlan,
  ReconstructionRegion,
  ReconstructionStyle,
  ReconstructionTag,
} from '../types/reconstructionPlan.js';
import type { CtaStyle, LayoutPattern, ReferenceAnalysis } from '../types/referenceAnalysis.js';
import type { VisualTokens } from '../types/visualTokens.js';

export interface ParsedFigmaUrl {
  fileKey: string;
  nodeId: string | null;
}

interface FigmaColor {
  r?: number;
  g?: number;
  b?: number;
}

interface FigmaPaint {
  color?: FigmaColor;
  type?: string;
  visible?: boolean;
}

interface FigmaRectangle {
  height?: number;
  width?: number;
  x?: number;
  y?: number;
}

interface FigmaTypeStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeightPx?: number;
  textAlignHorizontal?: string;
}

export interface FigmaNode {
  absoluteBoundingBox?: FigmaRectangle;
  characters?: string;
  children?: FigmaNode[];
  fills?: FigmaPaint[] | string;
  id: string;
  itemSpacing?: number;
  layoutMode?: string;
  name: string;
  opacity?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  cornerRadius?: number;
  style?: FigmaTypeStyle;
  strokes?: FigmaPaint[];
  type: string;
  visible?: boolean;
}

const ALLOWED_FILE_TYPES = new Set(['design', 'file', 'proto']);
const MAX_SCANNED_NODES = 2_000;

export function parseFigmaUrl(input: string): ParsedFigmaUrl | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || !['figma.com', 'www.figma.com'].includes(url.hostname.toLowerCase())) {
    return null;
  }

  const [fileType, fileKey] = url.pathname.split('/').filter(Boolean);
  if (!ALLOWED_FILE_TYPES.has(fileType) || !fileKey || !/^[a-zA-Z0-9]+$/.test(fileKey)) {
    return null;
  }

  const rawNodeId = url.searchParams.get('node-id');
  const nodeId = rawNodeId && /^\d+(?:[:-]\d+)+$/.test(rawNodeId)
    ? rawNodeId.replace(/-/g, ':')
    : null;

  return { fileKey, nodeId };
}

export function buildFigmaDocumentImport(
  fileName: string,
  root: FigmaNode,
  previewUrl: string | null,
  assetUrls: Record<string, string | null> = {},
): FigmaDocumentImport {
  const nodes = flattenVisibleNodes(root);
  const textNodes = nodes.filter((node) => node.type === 'TEXT' && node.characters?.trim());
  const text = textNodes.map((node) => node.characters!.trim()).filter(unique).slice(0, 40);
  const palette = collectPalette(nodes);
  const imageNodeCount = nodes.filter(hasImageFill).length;
  const componentCount = nodes.filter((node) => node.type === 'COMPONENT' || node.type === 'INSTANCE').length;
  const directChildren = (root.children ?? []).filter((node) => node.visible !== false);
  const content = buildGeneratedContent(fileName, root, directChildren, text);
  const layoutPattern = inferLayoutPattern(root, directChildren);
  const ctaStyle = inferCtaStyle(text);
  const analysis: ReferenceAnalysis = {
    ctaStyle,
    heroComposition: inferHeroComposition(root, directChildren, imageNodeCount),
    layoutPattern,
    mediaEmphasis: imageNodeCount === 0 ? 'Decorative' : imageNodeCount > 2 ? 'Primary' : 'Supporting',
    sectionCount: Math.min(6, Math.max(1, content.sections?.length ?? directChildren.length)),
    visualNotes: `Imported ${root.type.toLowerCase()} “${root.name}” with ${nodes.length} visible layers${root.layoutMode ? ` and ${root.layoutMode.toLowerCase()} auto layout` : ''}.`,
  };

  return {
    analysis,
    content,
    fileName,
    nodeId: root.id,
    nodeName: root.name,
    nodeType: root.type,
    previewUrl,
    reconstruction: buildReconstructionPlan(fileName, root, assetUrls),
    structure: {
      autoLayout: root.layoutMode ?? null,
      componentCount,
      layerCount: nodes.length,
      textLayerCount: textNodes.length,
    },
    visualTokens: buildVisualTokens(palette),
  };
}

/**
 * Returns image-bearing nodes worth rendering as independent page assets.
 * The selected root frame is intentionally excluded: it is comparison
 * evidence, not an asset that may stand in for the generated page.
 */
export function collectFigmaAssetNodeIds(root: FigmaNode, limit = 24): string[] {
  return flattenVisibleNodes(root)
    .filter((node) => node.id !== root.id && hasImageFill(node))
    .slice(0, limit)
    .map((node) => node.id);
}

function buildReconstructionPlan(
  fileName: string,
  root: FigmaNode,
  assetUrls: Record<string, string | null>,
): ReconstructionPlan {
  const bounds = root.absoluteBoundingBox;
  return {
    schemaVersion: 'figma-to-vue.reconstruction-plan.v2',
    source: { kind: 'figma', name: fileName, rootNodeId: root.id },
    viewport: {
      width: finiteOrNull(bounds?.width),
      height: finiteOrNull(bounds?.height),
    },
    regions: [mapFigmaRegion(root, assetUrls, { headingCount: 0, remaining: MAX_SCANNED_NODES }, 0, true)],
    confidence: {
      overall: 0.9,
      reviewRequired: collectFigmaAssetNodeIds(root).filter((id) => !assetUrls[id]),
    },
    overrides: {},
  };
}

function mapFigmaRegion(
  node: FigmaNode,
  assetUrls: Record<string, string | null>,
  context: { headingCount: number; remaining: number },
  depth: number,
  isRoot = false,
): ReconstructionRegion {
  context.remaining -= 1;
  const children: ReconstructionRegion[] = [];
  for (const child of node.children ?? []) {
    if (context.remaining <= 0) break;
    if (child.visible === false) continue;
    children.push(mapFigmaRegion(child, assetUrls, context, depth + 1));
  }
  const element = inferElement(node, children.length > 0, isRoot);
  let tag = inferTag(node, element, depth, isRoot);
  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    if (context.headingCount > 0 && tag === 'h1') tag = depth <= 3 ? 'h2' : 'h3';
    context.headingCount += 1;
  }
  const region: ReconstructionRegion = {
    id: `figma-${node.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    name: node.name,
    element,
    tag,
    evidence: { source: 'figma', nodeId: node.id, confidence: 0.95 },
    children,
  };

  const bounds = toBounds(node.absoluteBoundingBox);
  if (bounds) region.bounds = bounds;
  const layout = toLayout(node, children);
  if (layout) region.layout = layout;
  const style = toRegionStyle(node);
  if (Object.keys(style).length > 0) region.style = style;
  if (node.type === 'TEXT' && node.characters?.trim()) region.text = node.characters.trim();
  if (element === 'media') {
    region.asset = {
      kind: 'image',
      sourceNodeId: node.id,
      url: assetUrls[node.id] ?? null,
      alt: inferAssetAlt(node.name),
    };
  }

  return region;
}

function inferElement(
  node: FigmaNode,
  hasChildren: boolean,
  isRoot: boolean,
): ReconstructionRegion['element'] {
  if (isRoot) return 'page';
  if (node.type === 'TEXT') return 'text';
  if (hasImageFill(node)) return 'media';
  const name = node.name.toLowerCase();
  if (/button|cta|call to action/.test(name)) return 'button';
  if (/card|tile|item/.test(name)) return 'card';
  if (/section|hero|footer|header|navigation|navbar|features|pricing|testimonial/.test(name)) return 'section';
  return hasChildren ? 'group' : 'group';
}

function inferTag(
  node: FigmaNode,
  element: ReconstructionRegion['element'],
  depth: number,
  isRoot: boolean,
): ReconstructionTag {
  if (isRoot) return 'main';
  const name = node.name.toLowerCase();
  if (element === 'button') return 'button';
  if (element === 'media') return 'img';
  if (/navigation|navbar|\bnav\b/.test(name)) return 'nav';
  if (/header|hero/.test(name)) return 'header';
  if (/card|tile|testimonial|article/.test(name)) return 'article';
  if (element === 'section') return 'section';
  if (element !== 'text') return 'div';
  if (/title|heading|headline|\bh1\b/.test(name)) return depth <= 2 ? 'h1' : depth === 3 ? 'h2' : 'h3';
  if (/subtitle|description|body|paragraph|summary|copy/.test(name)) return 'p';
  return 'span';
}

function toBounds(value: FigmaRectangle | undefined): ReconstructionRegion['bounds'] | undefined {
  if (!value || !Number.isFinite(value.width) || !Number.isFinite(value.height)) return undefined;
  return {
    width: Math.max(0, value.width ?? 0),
    height: Math.max(0, value.height ?? 0),
    ...(Number.isFinite(value.x) ? { x: value.x } : {}),
    ...(Number.isFinite(value.y) ? { y: value.y } : {}),
  };
}

function toLayout(node: FigmaNode, children: ReconstructionRegion[]): ReconstructionLayout | undefined {
  if (children.length === 0) return undefined;
  const mode = node.layoutMode === 'HORIZONTAL'
    ? 'row'
    : node.layoutMode === 'VERTICAL'
      ? 'column'
      : inferFreeLayout(children);
  return {
    mode,
    ...(Number.isFinite(node.itemSpacing) ? { gap: Math.max(0, node.itemSpacing ?? 0) } : {}),
    ...(hasPadding(node)
      ? {
          padding: {
            top: Math.max(0, node.paddingTop ?? 0),
            right: Math.max(0, node.paddingRight ?? 0),
            bottom: Math.max(0, node.paddingBottom ?? 0),
            left: Math.max(0, node.paddingLeft ?? 0),
          },
        }
      : {}),
    ...(mapAlign(node.counterAxisAlignItems) ? { align: mapAlign(node.counterAxisAlignItems) } : {}),
    ...(mapJustify(node.primaryAxisAlignItems) ? { justify: mapJustify(node.primaryAxisAlignItems) } : {}),
  };
}

function inferFreeLayout(children: ReconstructionRegion[]): ReconstructionLayout['mode'] {
  if (children.length < 2 || children.some((child) => !child.bounds)) return 'column';
  const xs = children.map((child) => child.bounds!.x ?? 0);
  const ys = children.map((child) => child.bounds!.y ?? 0);
  const xSpread = Math.max(...xs) - Math.min(...xs);
  const ySpread = Math.max(...ys) - Math.min(...ys);
  return xSpread > ySpread * 1.4 ? 'row' : 'column';
}

function toRegionStyle(node: FigmaNode): ReconstructionStyle {
  const solid = firstSolidColor(node.fills);
  const stroke = firstSolidColor(node.strokes);
  const textAlign = node.style?.textAlignHorizontal?.toLowerCase();
  return {
    ...(solid && node.type === 'TEXT' ? { color: solid } : {}),
    ...(solid && node.type !== 'TEXT' ? { background: solid } : {}),
    ...(stroke ? { borderColor: stroke } : {}),
    ...(Number.isFinite(node.cornerRadius) ? { borderRadius: Math.max(0, node.cornerRadius ?? 0) } : {}),
    ...(node.style?.fontFamily ? { fontFamily: node.style.fontFamily } : {}),
    ...(Number.isFinite(node.style?.fontSize) ? { fontSize: Math.max(1, node.style?.fontSize ?? 1) } : {}),
    ...(Number.isFinite(node.style?.fontWeight) ? { fontWeight: node.style?.fontWeight } : {}),
    ...(Number.isFinite(node.style?.letterSpacing) ? { letterSpacing: node.style?.letterSpacing } : {}),
    ...(Number.isFinite(node.style?.lineHeightPx) ? { lineHeight: node.style?.lineHeightPx } : {}),
    ...(Number.isFinite(node.opacity) ? { opacity: Math.min(1, Math.max(0, node.opacity ?? 1)) } : {}),
    ...(textAlign && ['left', 'center', 'right', 'justify'].includes(textAlign)
      ? { textAlign: textAlign as ReconstructionStyle['textAlign'] }
      : {}),
  };
}

function firstSolidColor(fills: FigmaPaint[] | string | undefined): string | undefined {
  if (!Array.isArray(fills)) return undefined;
  const fill = fills.find((candidate) => candidate.type === 'SOLID' && candidate.visible !== false && candidate.color);
  return fill?.color ? colorToHex(fill.color) : undefined;
}

function hasPadding(node: FigmaNode): boolean {
  return [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].some(Number.isFinite);
}

function mapAlign(value: string | undefined): ReconstructionLayout['align'] | undefined {
  if (value === 'MIN') return 'start';
  if (value === 'CENTER') return 'center';
  if (value === 'MAX') return 'end';
  if (value === 'STRETCH') return 'stretch';
  return undefined;
}

function mapJustify(value: string | undefined): ReconstructionLayout['justify'] | undefined {
  if (value === 'MIN') return 'start';
  if (value === 'CENTER') return 'center';
  if (value === 'MAX') return 'end';
  if (value === 'SPACE_BETWEEN') return 'space-between';
  return undefined;
}

function inferAssetAlt(name: string): string {
  return /background|decoration|texture|shape/i.test(name) ? '' : name;
}

function finiteOrNull(value: number | undefined): number | null {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : null;
}

function flattenVisibleNodes(root: FigmaNode): FigmaNode[] {
  const result: FigmaNode[] = [];
  const queue = [root];
  while (queue.length > 0 && result.length < MAX_SCANNED_NODES) {
    const node = queue.shift()!;
    if (node.visible === false) continue;
    result.push(node);
    queue.push(...(node.children ?? []));
  }
  return result;
}

function collectPalette(nodes: FigmaNode[]): string[] {
  const colors: string[] = [];
  for (const node of nodes) {
    if (!Array.isArray(node.fills)) continue;
    for (const fill of node.fills) {
      if (fill.type !== 'SOLID' || fill.visible === false || !fill.color) continue;
      const hex = colorToHex(fill.color);
      if (!colors.includes(hex)) colors.push(hex);
      if (colors.length === 5) return colors;
    }
  }
  return colors;
}

function colorToHex(color: FigmaColor): string {
  const channel = (value = 0) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, '0');
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function buildVisualTokens(palette: string[]): VisualTokens {
  if (palette.length === 0) {
    return { palette: [], averageLuminance: 0.5, isDark: false, source: 'figma-document' };
  }
  const luminance = palette.reduce((sum, color) => {
    const r = Number.parseInt(color.slice(1, 3), 16);
    const g = Number.parseInt(color.slice(3, 5), 16);
    const b = Number.parseInt(color.slice(5, 7), 16);
    return sum + (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }, 0) / palette.length;
  return { palette, averageLuminance: luminance, isDark: luminance < 0.5, source: 'figma-document' };
}

function hasImageFill(node: FigmaNode): boolean {
  return Array.isArray(node.fills) && node.fills.some((fill) => fill.type === 'IMAGE' && fill.visible !== false);
}

function inferLayoutPattern(root: FigmaNode, directChildren: FigmaNode[]): LayoutPattern {
  const names = [root.name, ...directChildren.map((child) => child.name)].join(' ').toLowerCase();
  if (/finder|quiz|question|filter|search/.test(names)) return 'Product finder flow';
  if (/dashboard|metric|analytics|chart|table/.test(names)) return 'Dashboard grid';
  if (directChildren.length >= 3) return 'Hero plus feature cards';
  return 'Single hero';
}

function inferHeroComposition(
  root: FigmaNode,
  directChildren: FigmaNode[],
  imageNodeCount: number,
): ReferenceAnalysis['heroComposition'] {
  if (imageNodeCount > 0 && root.layoutMode === 'HORIZONTAL') {
    return directChildren[0] && hasImageFill(directChildren[0])
      ? 'Media left, text right'
      : 'Text left, media right';
  }
  if (imageNodeCount > 0 && directChildren.length <= 1) return 'Full-bleed media';
  return 'Centered hero';
}

function inferCtaStyle(text: string[]): CtaStyle {
  const joined = text.join(' ').toLowerCase();
  if (/email|subscribe|sign up|join/.test(joined)) return 'Form-first';
  if (/learn more|read more|view more/.test(joined)) return 'Text-link';
  if (/get started|buy|shop|continue|submit|book|try/.test(joined)) return 'Button-led';
  return 'None visible';
}

function buildGeneratedContent(
  fileName: string,
  root: FigmaNode,
  directChildren: FigmaNode[],
  text: string[],
): GeneratedContent {
  const titleCandidates = text.slice(0, 8).filter((value) => value.length <= 160);
  const title = titleCandidates.find((value) => value.length >= 20 && !/[.!?]$/.test(value))
    ?? titleCandidates.find((value) => !/[.!?]$/.test(value))
    ?? root.name;
  const titleIndex = text.indexOf(title);
  const summary = text.slice(Math.max(0, titleIndex + 1)).find((value) => value.length >= 24 && value.length <= 400);
  const kicker = text.slice(0, Math.max(0, titleIndex)).find((value) => value.length <= 80) ?? fileName;
  const sections = directChildren.map((child) => {
    const childText = flattenVisibleNodes(child)
      .filter((node) => node.type === 'TEXT' && node.characters?.trim())
      .map((node) => node.characters!.trim())
      .filter(unique);
    return {
      title: childText[0] ?? child.name,
      body: childText.slice(1, 4).join(' '),
    };
  }).filter((section) => section.title !== title && section.body).slice(0, 4);

  return {
    kicker,
    title,
    summary: summary ?? `A page imported from the “${root.name}” frame in ${fileName}.`,
    sections: sections.length > 0 ? sections : undefined,
  };
}

function unique(value: string, index: number, values: string[]): boolean {
  return values.indexOf(value) === index;
}
