import { buildPagePlan, serializePagePlan } from '../src/utils/pagePlan';
import { createDefaultReferenceAnalysis } from '../src/types/referenceAnalysis';

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
