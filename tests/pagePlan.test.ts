import { buildPagePlan, serializePagePlan } from '../src/utils/pagePlan';

describe('page plan layer', () => {
  it('builds a constrained deterministic page plan', () => {
    const plan = buildPagePlan({
      density: 'Compact',
      notes: 'Keep the hero short.',
      pageType: 'Landing page',
      referenceName: 'landing-reference.png',
      tone: 'Warm and direct',
    });

    expect(plan.schemaVersion).toBe('figma-to-vue.page-plan.v1');
    expect(plan.reference).toEqual({ name: 'landing-reference.png', provided: true });
    expect(plan.page.densityKey).toBe('compact');
    expect(plan.sections.map((section) => section.id)).toEqual([
      'design-signals',
      'implementation-plan',
      'review-notes',
    ]);
    expect(plan.tokens.spacing).toBe('tight');
  });

  it('serializes page plans as readable JSON', () => {
    const plan = buildPagePlan({
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
