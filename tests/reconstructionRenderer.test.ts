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
    expect(columnSfc).toContain('rr--column');
    expect(columnSfc).toContain('flex-direction: column');
  });

  it('reconstructs free (non-auto-layout) frames at their source positions', async () => {
    const root: FigmaNode = {
      id: 'free-root',
      name: 'Poster hero',
      type: 'FRAME',
      absoluteBoundingBox: { width: 1000, height: 500, x: 100, y: 50 },
      children: [
        {
          id: 'badge',
          name: 'Badge',
          type: 'RECTANGLE',
          absoluteBoundingBox: { width: 200, height: 50, x: 850, y: 75 },
          fills: [{ type: 'SOLID', color: { r: 1, g: 0.8, b: 0 } }],
        },
        {
          id: 'headline',
          name: 'Headline title',
          type: 'TEXT',
          characters: 'Overlapping, precisely placed copy',
          absoluteBoundingBox: { width: 500, height: 120, x: 350, y: 250 },
        },
      ],
    };
    const imported = buildFigmaDocumentImport('Poster', root, null);
    const region = imported.reconstruction.regions[0];
    expect(region.layout).toMatchObject({ mode: 'free' });

    const page = makeGeneratedPage({ reconstruction: imported.reconstruction });
    const { container } = render(GeneratedPagePreview, { props: { page } });
    const rootEl = container.querySelector('[data-reconstruction-region="figma-free-root"]') as HTMLElement;
    expect(rootEl.style.position).toBe('relative');
    expect(rootEl.style.aspectRatio).toBe('1000 / 500');
    const badgeEl = container.querySelector('[data-reconstruction-region="figma-badge"]') as HTMLElement;
    expect(badgeEl.style.position).toBe('absolute');
    expect(badgeEl.style.left).toBe('75%');
    expect(badgeEl.style.top).toBe('5%');
    expect(badgeEl.style.width).toBe('20%');
    expect(badgeEl.style.height).toBe('10%');
    const headlineEl = container.querySelector('[data-reconstruction-region="figma-headline"]') as HTMLElement;
    expect(headlineEl.style.left).toBe('25%');
    expect(headlineEl.style.top).toBe('40%');
    // Text keeps auto height so wrapped copy is not clipped.
    expect(headlineEl.style.height).toBe('');

    const plan = buildPagePlan({
      analysis: createDefaultReferenceAnalysis(),
      density: 'Comfortable',
      notes: '',
      pageType: 'Landing page',
      referenceName: 'poster.fig',
      tone: 'Faithful',
      reconstruction: imported.reconstruction,
    });
    const sfc = generateVueSfc(plan);
    const html = generatePageHtml(page);
    for (const artifact of [sfc, html]) {
      expect(artifact).toContain('rr--free');
      expect(artifact).toContain('aspect-ratio: 1000 / 500');
      expect(artifact).toContain('position: absolute; left: 75%; top: 5%; width: 20%; height: 10%');
      expect(artifact).toContain('position: absolute; left: 25%; top: 40%; width: 50%; margin: 0');
    }
  });

  it('renders Figma controls, free positioning, and effects as usable native output', async () => {
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
    const rootEl = container.querySelector('[data-reconstruction-region="figma-controls-root"]') as HTMLElement;
    expect(rootEl.style.position).toBe('relative');
    const buttonEl = container.querySelector('[data-reconstruction-region="figma-button"]') as HTMLElement;
    expect(buttonEl.style.position).toBe('absolute');
    expect(buttonEl.style.left).toBe('50%');
    expect(buttonEl.style.top).toBe('50%');
    expect(buttonEl.style.width).toBe('45%');
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
      expect(artifact).toContain('position: relative');
      expect(artifact).toContain('position: absolute; left: 50%; top: 50%; width: 45%');
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
