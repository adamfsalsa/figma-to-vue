import { render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import GeneratedPagePreview from '../src/components/GeneratedPagePreview.vue';
import type { GeneratedPage } from '../src/types/generatedPage';
import type { ReconstructionPlan } from '../src/types/reconstructionPlan';
import { createDefaultReferenceAnalysis } from '../src/types/referenceAnalysis';
import { generatePageHtml } from '../src/utils/htmlExport';
import { buildPagePlan } from '../src/utils/pagePlan';
import { generateVueSfc } from '../src/utils/vueCodegen';
import { buildFigmaDocumentImport, type FigmaNode } from '../src/utils/figmaDocument';

describe('source-dependent reconstruction rendering', () => {
  it('renders the Figma region tree and independent node assets instead of the source screenshot', () => {
    const page = makeGeneratedPage();
    const { container } = render(GeneratedPagePreview, { props: { page } });

    expect(screen.getByRole('heading', { level: 1, name: 'Ride beyond the map' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Cyclist on a gravel road' })).toHaveAttribute(
      'src',
      'https://figma.example/hero-asset.png',
    );
    expect(container.querySelectorAll('[data-reconstruction-region]')).toHaveLength(4);
    expect(container.querySelector('img[src="blob:complete-reference"]')).toBeNull();
    expect(screen.queryByText('Fallback template title')).not.toBeInTheDocument();
  });

  it('keeps HTML and Vue exports on the same source region contract', () => {
    const reconstruction = makeReconstructionPlan();
    const page = makeGeneratedPage({ reconstruction });
    const plan = buildPagePlan({
      analysis: createDefaultReferenceAnalysis(),
      density: 'Comfortable',
      notes: '',
      pageType: 'Landing page',
      referenceName: 'Figma frame',
      tone: 'Faithful',
      reconstruction,
    });

    const html = generatePageHtml(page);
    const sfc = generateVueSfc(plan);

    for (const artifact of [html, sfc]) {
      expect(artifact).toContain('data-reconstruction-region="figma-root"');
      expect(artifact).toContain('data-reconstruction-region="figma-title"');
      expect(artifact).toContain('https://figma.example/hero-asset.png');
      expect(artifact).not.toContain('blob:complete-reference');
    }
    expect(sfc).toContain('reconstruction-plan v2');
    expect(html).toContain('<h1');
  });

  it('emits materially different markup and CSS for row and column source compositions', () => {
    const row = makeReconstructionPlan('row');
    const column = makeReconstructionPlan('column');
    const rowPlan = buildPagePlan({
      analysis: createDefaultReferenceAnalysis(),
      density: 'Comfortable',
      notes: '',
      pageType: 'Landing page',
      referenceName: 'row.fig',
      tone: 'Faithful',
      reconstruction: row,
    });
    const columnPlan = buildPagePlan({
      analysis: createDefaultReferenceAnalysis(),
      density: 'Comfortable',
      notes: '',
      pageType: 'Landing page',
      referenceName: 'column.fig',
      tone: 'Faithful',
      reconstruction: column,
    });

    const rowSfc = generateVueSfc(rowPlan);
    const columnSfc = generateVueSfc(columnPlan);

    expect(rowSfc).not.toBe(columnSfc);
    expect(rowSfc).toContain('rr--row');
    expect(rowSfc).toContain('flex-direction: row');
    expect(rowSfc).toContain('flex-basis: 50%');
    expect(rowSfc).toContain('max-width: 1200px');
    expect(columnSfc).toContain('rr--column');
    expect(columnSfc).toContain('flex-direction: column');
    expect(columnSfc).toContain('width: 50%');
    expect(columnSfc).not.toContain('flex-basis: 50%');
  });

  it('renders Figma controls, grid constraints, and effects as usable native output', async () => {
    const root: FigmaNode = {
      id: 'controls-root',
      name: 'Signup grid',
      type: 'FRAME',
      absoluteBoundingBox: { width: 800, height: 600, x: 0, y: 0 },
      effects: [{
        type: 'DROP_SHADOW',
        offset: { x: 0, y: 6 },
        radius: 18,
        color: { r: 0, g: 0, b: 0, a: 0.2 },
      }],
      children: [
        controlNode('email', 'Email input', 0, 0, 'you@example.com'),
        controlNode('search', 'Search field', 400, 0, 'Search'),
        {
          id: 'link',
          name: 'Learn more link',
          type: 'INSTANCE',
          absoluteBoundingBox: { width: 360, height: 100, x: 0, y: 300 },
          children: [{ id: 'link-text', name: 'Label', type: 'TEXT', characters: 'Learn more' }],
        },
        {
          id: 'button',
          name: 'Submit button',
          type: 'COMPONENT',
          absoluteBoundingBox: { width: 360, height: 100, x: 400, y: 300 },
          children: [{ id: 'button-text', name: 'Label', type: 'TEXT', characters: 'Create account' }],
        },
      ],
    };
    const reconstruction = buildFigmaDocumentImport('Controls', root, null).reconstruction;
    const page = makeGeneratedPage({ reconstruction });
    const { container } = render(GeneratedPagePreview, { props: { page } });

    expect(screen.getByRole('textbox', { name: 'Email input' })).toHaveAttribute('type', 'email');
    expect(screen.getByRole('searchbox', { name: 'Search field' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect((container.querySelector('[data-reconstruction-region="figma-controls-root"]') as HTMLElement).style.display).toBe('grid');
    const axeResults = await axe(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(axeResults.violations).toHaveLength(0);

    const plan = buildPagePlan({
      analysis: createDefaultReferenceAnalysis(),
      density: 'Comfortable',
      notes: '',
      pageType: 'Signup',
      referenceName: 'controls.fig',
      tone: 'Faithful',
      reconstruction,
    });
    const sfc = generateVueSfc(plan);
    const html = generatePageHtml(page);
    for (const artifact of [sfc, html]) {
      expect(artifact).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
      expect(artifact).toContain('box-shadow: 0px 6px 18px 0px rgba(0, 0, 0, 0.2)');
      expect(artifact).toContain('type="email"');
      expect(artifact).toContain('href="#"');
      expect(artifact).toContain('<button type="button"');
    }
  });
});

function makeGeneratedPage(overrides: Partial<GeneratedPage> = {}): GeneratedPage {
  return {
    densityKey: 'comfortable',
    layoutPattern: 'Hero plus feature cards',
    kicker: 'Fallback',
    title: 'Fallback template title',
    summary: 'Fallback summary',
    palette: [],
    referenceName: 'reference.png',
    referencePreview: 'blob:complete-reference',
    reconstruction: makeReconstructionPlan(),
    sections: [],
    cta: { kind: 'none', label: '' },
    ...overrides,
  };
}

function makeReconstructionPlan(mode: 'row' | 'column' = 'row'): ReconstructionPlan {
  return {
    schemaVersion: 'figma-to-vue.reconstruction-plan.v2',
    source: { kind: 'figma', name: 'Fixture', rootNodeId: 'root' },
    viewport: { width: 1200, height: 720 },
    confidence: { overall: 0.95, reviewRequired: [] },
    overrides: {},
    regions: [
      {
        id: 'figma-root',
        name: 'Hero',
        element: 'page',
        tag: 'main',
        bounds: { width: 1200, height: 720 },
        layout: {
          mode,
          gap: 32,
          padding: { top: 48, right: 48, bottom: 48, left: 48 },
        },
        style: { background: '#f5f5f5' },
        evidence: { source: 'figma', nodeId: 'root', confidence: 0.98 },
        children: [
          {
            id: 'figma-copy',
            name: 'Hero copy',
            element: 'group',
            tag: 'div',
            bounds: { width: 600, height: 400 },
            layout: { mode: 'column', gap: 16 },
            evidence: { source: 'figma', nodeId: 'copy', confidence: 0.96 },
            children: [
              {
                id: 'figma-title',
                name: 'Hero title',
                element: 'text',
                tag: 'h1',
                text: 'Ride beyond the map',
                style: { color: '#111111', fontSize: 56, fontWeight: 700, lineHeight: 60 },
                evidence: { source: 'figma', nodeId: 'title', confidence: 0.99 },
                children: [],
              },
            ],
          },
          {
            id: 'figma-media',
            name: 'Cyclist on a gravel road',
            element: 'media',
            tag: 'img',
            bounds: { width: 500, height: 600 },
            style: { borderRadius: 24 },
            asset: {
              kind: 'image',
              delivery: 'remote',
              sourceNodeId: 'media',
              url: 'https://figma.example/hero-asset.png',
              alt: 'Cyclist on a gravel road',
            },
            evidence: { source: 'figma', nodeId: 'media', confidence: 0.94 },
            children: [],
          },
        ],
      },
    ],
  };
}

function controlNode(
  id: string,
  name: string,
  x: number,
  y: number,
  placeholder: string,
): FigmaNode {
  return {
    id,
    name,
    type: 'FRAME',
    absoluteBoundingBox: { width: 360, height: 100, x, y },
    children: [{ id: `${id}-text`, name: 'Placeholder', type: 'TEXT', characters: placeholder }],
  };
}
