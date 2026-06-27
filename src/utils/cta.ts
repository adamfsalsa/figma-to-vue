import type { GeneratedPageCta } from '../types/generatedPage';
import type { CtaStyle } from '../types/referenceAnalysis';

/**
 * Maps the analyzer's observed `ctaStyle` to a concrete call-to-action. Shared
 * by the live preview (src/App.vue → GeneratedPagePreview.vue) and the Vue SFC
 * generator (src/utils/vueCodegen.ts) so the rendered page and the generated
 * code can never drift on what CTA the page has.
 */
export function deriveCta(ctaStyle: CtaStyle): GeneratedPageCta {
  switch (ctaStyle) {
    case 'Button-led':
      return { kind: 'button', label: 'Get started' };
    case 'Text-link':
      return { kind: 'link', label: 'Learn more' };
    case 'Form-first':
      return { kind: 'form', label: 'Sign up' };
    case 'None visible':
    default:
      return { kind: 'none', label: '' };
  }
}
