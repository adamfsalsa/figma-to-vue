import type { ReferenceAnalysis } from './referenceAnalysis';
import type { VisualTokens } from './visualTokens';

export type VisualDensity = 'Comfortable' | 'Compact' | 'Editorial';

export interface PagePlanInput {
  analysis: ReferenceAnalysis;
  density: VisualDensity;
  notes: string;
  pageType: string;
  referenceName: string | null;
  tone: string;
  /**
   * Real, locally-extracted palette/luminance from the uploaded reference
   * image (see src/utils/colorExtraction.ts). Optional because a plan can
   * still be generated before any image is uploaded.
   */
  visualTokens?: VisualTokens;
}

export interface PagePlanSection {
  body: string;
  id: string;
  title: string;
}

export interface PagePlan {
  accessibility: {
    landmarks: string[];
    notes: string[];
  };
  page: {
    density: VisualDensity;
    densityKey: string;
    kicker: string;
    summary: string;
    title: string;
    tone: string;
    type: string;
  };
  reference: {
    analysis: ReferenceAnalysis;
    name: string | null;
    provided: boolean;
  };
  schemaVersion: 'figma-to-vue.page-plan.v1';
  sections: PagePlanSection[];
  source: {
    generator: 'local-deterministic';
    intent: string;
  };
  tokens: {
    accentRole: string;
    layoutDensity: string;
    spacing: string;
    /** Dominant colors, most frequent first. Empty until an image is analyzed. */
    palette: string[];
    paletteSource: VisualTokens['source'];
  };
}
