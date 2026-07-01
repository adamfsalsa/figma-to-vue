import type { LayoutPattern } from './referenceAnalysis';
import type { ReconstructionPlan } from './reconstructionPlan';

export interface GeneratedPageSection {
  title: string;
  body: string;
}

export type GeneratedPageCtaKind = 'button' | 'link' | 'form' | 'none';

export interface GeneratedPageCta {
  kind: GeneratedPageCtaKind;
  label: string;
}

export interface GeneratedPage {
  densityKey: string;
  layoutPattern: LayoutPattern;
  kicker: string;
  palette: string[];
  referenceName: string;
  referencePreview: string | null;
  reconstruction?: ReconstructionPlan | null;
  sections: GeneratedPageSection[];
  summary: string;
  title: string;
  cta: GeneratedPageCta;
}
