export type ReconstructionSource = 'figma' | 'image' | 'manual';

export type ReconstructionElement =
  | 'page'
  | 'section'
  | 'group'
  | 'card'
  | 'text'
  | 'media'
  | 'button';

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
}

export interface ReconstructionStyle {
  background?: string;
  borderColor?: string;
  borderRadius?: number;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  opacity?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export interface ReconstructionAsset {
  alt: string;
  kind: 'image';
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
  element: ReconstructionElement;
  evidence: ReconstructionEvidence;
  id: string;
  layout?: ReconstructionLayout;
  name: string;
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
