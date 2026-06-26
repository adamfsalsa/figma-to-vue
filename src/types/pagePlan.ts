export type VisualDensity = 'Comfortable' | 'Compact' | 'Editorial';

export interface PagePlanInput {
  density: VisualDensity;
  notes: string;
  pageType: string;
  referenceName: string | null;
  tone: string;
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
  };
}
