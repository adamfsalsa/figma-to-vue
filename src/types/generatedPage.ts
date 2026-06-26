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
  kicker: string;
  palette: string[];
  referenceName: string;
  referencePreview: string | null;
  sections: GeneratedPageSection[];
  summary: string;
  title: string;
  cta: GeneratedPageCta;
}
