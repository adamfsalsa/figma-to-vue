import { buildPagePlan, serializePagePlan } from '../src/utils/pagePlan';
import { createDefaultReferenceAnalysis } from '../src/types/referenceAnalysis';
import type { VisualTokens } from '../src/types/visualTokens';

describe('page plan layer', () => {
  it('builds a constrained deterministic page plan', () => {
    const plan = buildPagePlan({
      analysis: {
        ...createDefaultReferenceAnalysis(),
        ctaStyle: 'Text-link',
        layoutPattern: 'Single hero',
        mediaEmphasis: 'Primary',
        sectionCount: 2,
      },
      density: 'Compact',
      notes: 'Keep the hero short.',
      pageType: 'Landing page',
      referenceName: 'landing-reference.png',
      tone: 'Warm and direct',
    });

    expect(plan.schemaVersion).toBe('figma-to-vue.page-plan.v1');
    expect(plan.reference.name).toBe('landing-reference.png');
    expect(plan.reference.provided).toBe(true);
    expect(plan.reference.analysis.mediaEmphasis).toBe('Primary');
    expect(plan.page.densityKey).toBe('compact');
    expect(plan.sections.map((section) => section.id)).toEqual([
      'design-signals',
      'implementation-plan',
      'review-notes',
    ]);
    expect(plan.tokens.spacing).toBe('tight');
    expect(plan.tokens.accentRole).toBe('primary-action');
    expect(plan.tokens.palette).toEqual([]);
    expect(plan.tokens.paletteSource).toBe('placeholder');
  });

  it('carries a real extracted palette into the tokens block when provided', () => {
    const visualTokens: VisualTokens = {
      palette: ['#0a0ac8', '#f0f0f0'],
      averageLuminance: 0.18,
      isDark: true,
      source: 'extracted-from-reference',
    };

    const plan = buildPagePlan({
      analysis: createDefaultReferenceAnalysis(),
      density: 'Comfortable',
      notes: '',
      pageType: 'Landing page',
      referenceName: 'reference.png',
      tone: 'Calm',
      visualTokens,
    });

    expect(plan.tokens.palette).toEqual(['#0a0ac8', '#f0f0f0']);
    expect(plan.tokens.paletteSource).toBe('extracted-from-reference');
  });

  it('serializes page plans as readable JSON', () => {
    const plan = buildPagePlan({
      analysis: createDefaultReferenceAnalysis(),
      density: 'Comfortable',
      notes: '',
      pageType: 'Product finder',
      referenceName: null,
      tone: 'Calm',
    });

    expect(JSON.parse(serializePagePlan(plan))).toEqual(plan);
    expect(serializePagePlan(plan)).toContain('\n  "schemaVersion"');
  });
});
