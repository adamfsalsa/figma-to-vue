import type { FigmaDocumentImport } from '../types/figmaImport.js';
import type { GeneratedContent } from '../types/pagePlan.js';
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
}

export interface FigmaNode {
  absoluteBoundingBox?: FigmaRectangle;
  characters?: string;
  children?: FigmaNode[];
  fills?: FigmaPaint[] | string;
  id: string;
  layoutMode?: string;
  name: string;
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
    structure: {
      autoLayout: root.layoutMode ?? null,
      componentCount,
      layerCount: nodes.length,
      textLayerCount: textNodes.length,
    },
    visualTokens: buildVisualTokens(palette),
  };
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
