export type ReconstructionSource = 'figma' | 'image' | 'manual';

export type ReconstructionElement =
  | 'page'
  | 'section'
  | 'group'
  | 'card'
  | 'text'
  | 'media'
  | 'button'
  | 'link'
  | 'input';

export type ReconstructionTag =
  | 'main'
  | 'header'
  | 'nav'
  | 'section'
  | 'article'
  | 'div'
  | 'p'
  | 'span'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'button'
  | 'a'
  | 'input'
  | 'img';

export interface ReconstructionBounds {
  height: number;
  width: number;
  x?: number;
  y?: number;
}

export interface ReconstructionLayout {
  align?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number;
  justify?: 'start' | 'center' | 'end' | 'space-between';
  mode: 'row' | 'column' | 'grid' | 'free';
  padding?: { top: number; right: number; bottom: number; left: number };
  columns?: number;
  constraints?: {
    horizontal: 'start' | 'center' | 'end' | 'stretch' | 'scale';
    vertical: 'start' | 'center' | 'end' | 'stretch' | 'scale';
  };
  sizing?: {
    horizontal: 'fixed' | 'hug' | 'fill';
    vertical: 'fixed' | 'hug' | 'fill';
  };
  sizeLimits?: {
    maxHeight?: number;
    maxWidth?: number;
    minHeight?: number;
    minWidth?: number;
  };
  wrap?: boolean;
}

export interface ReconstructionStyle {
  background?: string;
  borderColor?: string;
  borderRadius?: number;
  borderRadii?: {
    bottomLeft: number;
    bottomRight: number;
    topLeft: number;
    topRight: number;
  };
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  opacity?: number;
  blur?: number;
  boxShadow?: string;
  borderWidth?: number;
  overflow?: 'hidden' | 'visible';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface ReconstructionAsset {
  alt: string;
  delivery: 'embedded' | 'remote' | 'missing';
  kind: 'image';
  mimeType?: string;
  sourceNodeId: string;
  url: string | null;
}

export interface ReconstructionEvidence {
  confidence: number;
  nodeId?: string;
  source: ReconstructionSource;
}

export interface ReconstructionRegion {
  asset?: ReconstructionAsset;
  bounds?: ReconstructionBounds;
  children: ReconstructionRegion[];
  control?: {
    label: string;
    placeholder?: string;
    type: 'button' | 'link' | 'text' | 'email' | 'search' | 'password';
  };
  element: ReconstructionElement;
  evidence: ReconstructionEvidence;
  id: string;
  layout?: ReconstructionLayout;
  name: string;
  metadata?: {
    componentId?: string;
    componentProperties?: Record<string, string>;
    sourceType: string;
  };
  style?: ReconstructionStyle;
  tag: ReconstructionTag;
  text?: string;
}

export interface ReconstructionPlan {
  confidence: {
    overall: number;
    reviewRequired: string[];
  };
  overrides: Record<string, unknown>;
  regions: ReconstructionRegion[];
  schemaVersion: 'figma-to-vue.reconstruction-plan.v2';
  source: {
    kind: ReconstructionSource;
    name: string;
    rootNodeId?: string;
  };
  viewport: {
    height: number | null;
    width: number | null;
  };
}
