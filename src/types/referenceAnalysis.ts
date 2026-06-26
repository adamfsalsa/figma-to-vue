export type CtaStyle = 'Button-led' | 'Text-link' | 'Form-first' | 'None visible';
export type HeroComposition = 'Text left, media right' | 'Media left, text right' | 'Centered hero' | 'Full-bleed media';
export type LayoutPattern = 'Single hero' | 'Hero plus feature cards' | 'Dashboard grid' | 'Product finder flow';
export type MediaEmphasis = 'Decorative' | 'Supporting' | 'Primary' | 'Immersive';

export interface ReferenceAnalysis {
  ctaStyle: CtaStyle;
  heroComposition: HeroComposition;
  layoutPattern: LayoutPattern;
  mediaEmphasis: MediaEmphasis;
  sectionCount: number;
  visualNotes: string;
}

export function createDefaultReferenceAnalysis(): ReferenceAnalysis {
  return {
    ctaStyle: 'Button-led',
    heroComposition: 'Text left, media right',
    layoutPattern: 'Hero plus feature cards',
    mediaEmphasis: 'Supporting',
    sectionCount: 3,
    visualNotes: '',
  };
}
