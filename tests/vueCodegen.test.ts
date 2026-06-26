import { generateVueSfc } from '../src/utils/vueCodegen';
import { buildPagePlan } from '../src/utils/pagePlan';
import { createDefaultReferenceAnalysis } from '../src/types/referenceAnalysis';
import type { VisualTokens } from '../src/types/visualTokens';

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

  it('escapes quotes and newlines in content so the TS literal cannot break out', () => {
    const plan = planWith();
    plan.page.title = "It's a \"bold\" title\nwith a newline";

    const sfc = generateVueSfc(plan);

    expect(sfc).toContain("const title = 'It\\'s a \"bold\" title\\nwith a newline';");
    expect(sfc).not.toContain("It's a");
  });
});
