import { generateVueSfc } from '../src/utils/vueCodegen';
import { buildPagePlan } from '../src/utils/pagePlan';
import { createDefaultReferenceAnalysis } from '../src/types/referenceAnalysis';
import type { VisualTokens } from '../src/types/visualTokens';

import type { CtaStyle, LayoutPattern } from '../src/types/referenceAnalysis';

function planWith(visualTokens?: VisualTokens) {
  return buildPagePlan({
    analysis: createDefaultReferenceAnalysis(),
    density: 'Comfortable',
    notes: '',
    pageType: 'Landing page',
    referenceName: 'reference.png',
    tone: 'Calm',
    visualTokens,
  });
}

function planForLayout(layoutPattern: LayoutPattern) {
  return buildPagePlan({
    analysis: { ...createDefaultReferenceAnalysis(), layoutPattern },
    density: 'Comfortable',
    notes: '',
    pageType: 'Landing page',
    referenceName: 'reference.png',
    tone: 'Calm',
  });
}

describe('generateVueSfc', () => {
  it('emits a real SFC with script setup, template, and scoped style', () => {
    const sfc = generateVueSfc(planWith());

    expect(sfc).toContain('<script setup lang="ts">');
    expect(sfc).toContain('<template>');
    expect(sfc).toContain('<style scoped>');
    expect(sfc).toContain('interface PageSection');
  });

  it('renders a single h1 from the plan title and v-for sections as h2', () => {
    const sfc = generateVueSfc(planWith());

    expect(sfc.match(/<h1>/g)).toHaveLength(1);
    expect(sfc).toContain('{{ title }}');
    expect(sfc).toContain('v-for="section in sections"');
    expect(sfc).toContain('<h2>{{ section.title }}</h2>');
  });

  it('inlines section content as typed consts', () => {
    const sfc = generateVueSfc(planWith());

    expect(sfc).toContain('const sections: PageSection[] = [');
    expect(sfc).toContain("title: 'Design signals'");
  });

  it('bakes an extracted palette into scoped-style custom properties', () => {
    const sfc = generateVueSfc(
      planWith({
        palette: ['#0a0ac8', '#f0f0f0'],
        averageLuminance: 0.2,
        isDark: true,
        source: 'extracted-from-reference',
      }),
    );

    expect(sfc).toContain('--token-accent: #0a0ac8;');
    expect(sfc).toContain('--token-surface-soft: #f0f0f0;');
  });

  it('omits token custom properties when no palette was extracted', () => {
    const sfc = generateVueSfc(planWith());

    expect(sfc).not.toContain('--token-accent:');
    expect(sfc).toContain('var(--token-accent,');
  });

  it('chooses a distinct root modifier and container per layout pattern', () => {
    const cases: Array<[LayoutPattern, string, string]> = [
      ['Single hero', 'generated-page--single-hero', 'generated-page__detail'],
      ['Hero plus feature cards', 'generated-page--hero-cards', 'generated-page__sections'],
      ['Dashboard grid', 'generated-page--dashboard-grid', 'generated-page__grid'],
      ['Product finder flow', 'generated-page--finder-flow', 'generated-page__options'],
    ];

    for (const [pattern, modifier, container] of cases) {
      const sfc = generateVueSfc(planForLayout(pattern));
      expect(sfc).toContain(modifier);
      expect(sfc).toContain(container);
    }
  });

  it('keeps the script block and section v-for invariant across layouts', () => {
    const patterns: LayoutPattern[] = [
      'Single hero',
      'Hero plus feature cards',
      'Dashboard grid',
      'Product finder flow',
    ];

    for (const pattern of patterns) {
      const sfc = generateVueSfc(planForLayout(pattern));
      expect(sfc.match(/<h1>/g)).toHaveLength(1);
      expect(sfc).toContain('v-for="section in sections"');
      expect(sfc).toContain('<h2>{{ section.title }}</h2>');
    }
  });

  it('includes a CTA in the generated SFC matching the analyzer ctaStyle', () => {
    const cases: Array<[CtaStyle, RegExp]> = [
      ['Button-led', /<button type="button" class="generated-page__cta">Get started<\/button>/],
      ['Text-link', /<a class="generated-page__cta generated-page__cta--link" href="#">Learn more/],
      ['Form-first', /<form class="generated-page__cta-form"/],
    ];

    for (const [ctaStyle, pattern] of cases) {
      const plan = buildPagePlan({
        analysis: { ...createDefaultReferenceAnalysis(), ctaStyle },
        density: 'Comfortable',
        notes: '',
        pageType: 'Landing page',
        referenceName: 'reference.png',
        tone: 'Calm',
      });
      const sfc = generateVueSfc(plan);
      expect(sfc).toMatch(pattern);
      expect(sfc).toContain('.generated-page__cta {');
    }
  });

  it('omits the CTA and its styles when ctaStyle is None visible', () => {
    const plan = buildPagePlan({
      analysis: { ...createDefaultReferenceAnalysis(), ctaStyle: 'None visible' },
      density: 'Comfortable',
      notes: '',
      pageType: 'Landing page',
      referenceName: 'reference.png',
      tone: 'Calm',
    });
    const sfc = generateVueSfc(plan);

    expect(sfc).not.toContain('generated-page__cta');
  });

  it('escapes quotes and newlines in content so the TS literal cannot break out', () => {
    const plan = planWith();
    plan.page.title = "It's a \"bold\" title\nwith a newline";

    const sfc = generateVueSfc(plan);

    expect(sfc).toContain("const title = 'It\\'s a \"bold\" title\\nwith a newline';");
    expect(sfc).not.toContain("It's a");
  });
});
