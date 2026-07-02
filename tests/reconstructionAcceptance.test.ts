import { render } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import GeneratedPagePreview from '../src/components/GeneratedPagePreview.vue';
import type { GeneratedPage } from '../src/types/generatedPage';
import { createDefaultReferenceAnalysis } from '../src/types/referenceAnalysis';
import { buildPagePlan } from '../src/utils/pagePlan';
import { generateVueSfc } from '../src/utils/vueCodegen';
import { buildFigmaDocumentImport, type FigmaNode } from '../src/utils/figmaDocument';
import { generatePageHtml } from '../src/utils/htmlExport';
import { sanitizeReconstruction } from '../api/analyze';

/**
 * Release-blocking acceptance backlog for keystone 18.
 *
 * These tests deliberately remain `todo` while the normalized reconstruction
 * plan and source-dependent renderer do not exist. Do not delete or weaken a
 * case to make the suite green. Implement the behavior, replace fixture setup
 * with the v2 plan/API where necessary, remove `.todo`, and make it pass.
 *
 * See docs/reconstruction-contract.md for the complete requirement and fixture
 * matrix. Unit cases here are the first gate; RCN-07 and RCN-10 additionally
 * require browser-level viewport/screenshot coverage when that harness lands.
 */
describe('core reconstruction acceptance', () => {
  it('RCN-01: composition evidence changes the generated region tree, markup, and CSS', () => {
    const rowReference = makeFigmaComposition('HORIZONTAL');
    const columnReference = makeFigmaComposition('VERTICAL');
    const leftMedia = makePlan({}, rowReference.reconstruction);
    const fullBleed = makePlan({}, columnReference.reconstruction);

    const leftMediaSfc = generateVueSfc(leftMedia);
    const fullBleedSfc = generateVueSfc(fullBleed);

    expect(leftMediaSfc).not.toBe(fullBleedSfc);
    expect(leftMediaSfc).toContain('rr--row');
    expect(leftMediaSfc).toContain('flex-direction: row');
    expect(fullBleedSfc).toContain('rr--column');
    expect(fullBleedSfc).toContain('flex-direction: column');
  });

  it('RCN-02: the full reference screenshot is comparison evidence, never generated page content', () => {
    const page = makeGeneratedPage({ referencePreview: 'blob:complete-source-frame' });
    const { container } = render(GeneratedPagePreview, { props: { page } });

    expect(container.querySelector('img[src="blob:complete-source-frame"]')).toBeNull();
    expect(container.querySelector('[style*="complete-source-frame"]')).toBeNull();
    expect(generatePageHtml(page)).not.toContain('blob:complete-source-frame');
  });

  it('RCN-03: Figma and image evidence normalize to the same versioned spatial plan schema', () => {
    const figmaPlan = makeFigmaComposition('HORIZONTAL').reconstruction;
    const imagePlan = sanitizeReconstruction({
      pageHeight: 900,
      regions: [
        {
          name: 'Hero',
          element: 'section',
          x: 0,
          y: 0,
          width: 1440,
          height: 620,
          confidence: 0.8,
          children: [
            { name: 'Headline', element: 'text', text: 'Observed copy', x: 120, y: 180, width: 700, height: 120, fontSize: 48 },
          ],
        },
      ],
    }, 'reference.png');

    expect(imagePlan).toBeDefined();
    for (const plan of [figmaPlan, imagePlan!]) {
      expect(plan.schemaVersion).toBe('figma-to-vue.reconstruction-plan.v2');
      expect(plan.viewport.width).toBeGreaterThan(0);
      expect(plan.regions.length).toBeGreaterThan(0);
      expect(plan.regions[0].element).toBe('page');
      expect(plan.regions[0].evidence.confidence).toBeGreaterThan(0);
      expect(Array.isArray(plan.confidence.reviewRequired)).toBe(true);
      expect(plan).toHaveProperty('overrides');
    }
    expect(figmaPlan.regions[0].evidence.source).toBe('figma');
    expect(imagePlan!.regions[0].evidence.source).toBe('image');
  });

  it.todo('RCN-04: detected region count, hierarchy, and order survive plan-to-preview rendering', () => {
    const plan = makePlan({ sectionCount: 5 });

    expect(plan.sections).toHaveLength(5);
    const page = makeGeneratedPage({
      sections: plan.sections.map(({ title, body }) => ({ title, body })),
    });
    const { container } = render(GeneratedPagePreview, { props: { page } });
    expect(container.querySelectorAll('[data-reconstruction-region]')).toHaveLength(5);
  });

  it.todo('RCN-05: source typography, spacing, shape, effects, palette, and media treatments reach output', () => {
    const sfc = generateVueSfc(makePlan());

    expect(sfc).toContain('--font-heading:');
    expect(sfc).toContain('--space-section:');
    expect(sfc).toContain('--radius-card:');
    expect(sfc).toContain('--shadow-card:');
    expect(sfc).toContain('object-position:');
  });

  it.todo('RCN-06: detected controls render as native keyboard-usable interactions or review flags', () => {
    const page = makeGeneratedPage({ layoutPattern: 'Product finder flow' });
    const { getByRole, getByLabelText } = render(GeneratedPagePreview, { props: { page } });

    expect(getByLabelText('What are you looking for?')).toBeInstanceOf(HTMLSelectElement);
    expect(getByRole('button', { name: 'Show results' })).toBeInstanceOf(HTMLButtonElement);
    expect(page).toHaveProperty('unsupportedInteractions');
  });

  it.todo('RCN-07: generated layout defines tested mobile, tablet, and desktop behavior without overflow', () => {
    const sfc = generateVueSfc(makePlan());

    expect(sfc).toMatch(/@media[^}]*390|@media[^}]*24\.375rem/s);
    expect(sfc).toMatch(/@media[^}]*768|@media[^}]*48rem/s);
    expect(sfc).toMatch(/@media[^}]*1440|@media[^}]*90rem/s);
    // Browser follow-up: assert document.scrollWidth <= viewport width at all
    // three widths and every visible control has a non-zero client rect.
  });

  it.todo('RCN-08: reconstructed preview has zero axe violations and page-level landmark semantics', async () => {
    const page = makeGeneratedPage();
    const { container } = render(GeneratedPagePreview, { props: { page } });

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
    expect(container.querySelector('main')).not.toBeNull();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it.todo('RCN-09: generated source is constrained Vue, strict-TypeScript compilable, and injection-safe', () => {
    const plan = makePlan();
    plan.page.title = '</h1><script>globalThis.compromised = true</script>';
    const sfc = generateVueSfc(plan);

    expect(sfc).not.toContain('<script>globalThis.compromised');
    expect(sfc).toContain('<script setup lang="ts">');
    // Build follow-up: write the generated fixture SFC into an isolated test
    // project and require vue-tsc --noEmit to exit successfully.
  });

  it.todo('RCN-10: representative fixtures meet visual similarity thresholds at fixed viewports', () => {
    // Browser follow-up: capture each fixture at 390, 768, and 1440px; mask
    // documented dynamic regions; compare geometry and pixels independently;
    // fail when either score drops below the fixture's reviewed threshold.
    expect(REPRESENTATIVE_FIXTURES).toHaveLength(6);
  });

  it.todo('RCN-11: live preview, Vue export, and HTML export preserve equivalent region structures', () => {
    const plan = makePlan({ sectionCount: 4 });
    const sfc = generateVueSfc(plan);

    expect(sfc.match(/data-reconstruction-region/g)).toHaveLength(4);
    // Renderer follow-up: compare semantic region snapshots from the preview,
    // mounted generated SFC, and standalone HTML export.
  });

  it.todo('RCN-12: low-confidence fields are reviewable and corrections survive regeneration', () => {
    const plan = makePlan();

    expect(plan).toHaveProperty('confidence');
    expect(plan).toHaveProperty('overrides');
    // State follow-up: edit a low-confidence region type, regenerate unrelated
    // fields, and assert the explicit override remains authoritative.
  });
});

const REPRESENTATIVE_FIXTURES = [
  'split-marketing-hero',
  'dense-dashboard',
  'editorial-asymmetric',
  'product-finder',
  'mobile-commerce-detail',
  'ambiguous-low-fidelity',
] as const;

function makePlan(
  analysisOverrides: Partial<ReturnType<typeof createDefaultReferenceAnalysis>> = {},
  reconstruction?: ReturnType<typeof buildFigmaDocumentImport>['reconstruction'],
) {
  return buildPagePlan({
    analysis: { ...createDefaultReferenceAnalysis(), ...analysisOverrides },
    density: 'Comfortable',
    notes: '',
    pageType: 'Landing page',
    referenceName: 'fixture.png',
    tone: 'Source faithful',
    reconstruction,
  });
}

function makeFigmaComposition(layoutMode: 'HORIZONTAL' | 'VERTICAL') {
  const root: FigmaNode = {
    id: `root-${layoutMode}`,
    name: 'Marketing hero',
    type: 'FRAME',
    layoutMode,
    absoluteBoundingBox: { width: 1200, height: 720 },
    children: [
      {
        id: `title-${layoutMode}`,
        name: 'Hero title',
        type: 'TEXT',
        characters: 'A source-dependent page',
      },
      {
        id: `media-${layoutMode}`,
        name: 'Hero media',
        type: 'RECTANGLE',
        fills: [{ type: 'IMAGE' }],
      },
    ],
  };
  return buildFigmaDocumentImport('Composition fixture', root, null, {
    [`media-${layoutMode}`]: `https://figma.example/${layoutMode}.png`,
  });
}

function makeGeneratedPage(overrides: Partial<GeneratedPage> = {}): GeneratedPage {
  return {
    densityKey: 'comfortable',
    layoutPattern: 'Hero plus feature cards',
    kicker: 'Fixture',
    title: 'Reconstructed fixture',
    summary: 'Fixture summary',
    palette: ['#112233', '#f5f5f5'],
    referenceName: 'fixture.png',
    referencePreview: null,
    sections: [
      { title: 'First region', body: 'First body' },
      { title: 'Second region', body: 'Second body' },
    ],
    cta: { kind: 'button', label: 'Continue' },
    ...overrides,
  };
}
