import { render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import GeneratedPagePreview from '../src/components/GeneratedPagePreview.vue';
import type { GeneratedPage } from '../src/types/generatedPage';
import { sanitizeReconstruction } from '../api/analyze';

/**
 * The image→plan sanitizer is the safety boundary of the AI tier: the model
 * proposes a region tree, and only schema-valid structured data may cross
 * into the renderer (docs/reconstruction-contract.md, "Safety Boundary").
 */
describe('sanitizeReconstruction (image evidence → reconstruction plan)', () => {
  it('normalizes a well-formed model proposal into a renderable v2 plan', () => {
    const plan = sanitizeReconstruction(makeModelProposal(), 'landing.png');

    expect(plan).toBeDefined();
    expect(plan!.schemaVersion).toBe('figma-to-vue.reconstruction-plan.v2');
    expect(plan!.source).toEqual({ kind: 'image', name: 'landing.png' });
    expect(plan!.viewport).toEqual({ width: 1440, height: 2400 });

    const page = plan!.regions[0];
    expect(page).toMatchObject({
      element: 'page',
      tag: 'main',
      layout: { mode: 'free' },
      bounds: { x: 0, y: 0, width: 1440, height: 2400 },
    });

    const [hero, gallery] = page.children;
    expect(hero).toMatchObject({ element: 'section', tag: 'section', layout: { mode: 'free' } });
    const [headline, subcopy, cta] = hero.children;
    // First large text becomes the single h1; body copy becomes p.
    expect(headline).toMatchObject({ tag: 'h1', text: 'Ride farther with Area', style: { fontSize: 56, color: '#111827' } });
    expect(subcopy).toMatchObject({ tag: 'p' });
    expect(cta).toMatchObject({
      tag: 'button',
      control: { type: 'button', label: 'Get started' },
      style: { background: '#4a7c14' },
    });
    // Media has no materializable source pixels → placeholder + review flag.
    expect(gallery.children[0]).toMatchObject({
      tag: 'img',
      asset: { kind: 'image', url: null, delivery: 'missing' },
    });
    expect(plan!.confidence.reviewRequired).toContain(gallery.children[0].id);
    // Low-confidence guesses are flagged for review, not silently trusted.
    expect(plan!.confidence.reviewRequired).toContain(subcopy.id);
    expect(plan!.confidence.overall).toBeGreaterThan(0);
    expect(plan!.confidence.overall).toBeLessThanOrEqual(1);
  });

  it('drops or clamps hostile and malformed model output', () => {
    const plan = sanitizeReconstruction({
      pageHeight: 999_999, // clamped
      regions: [
        {
          name: 'Injected',
          element: 'script', // off-list → coerced to group
          x: -50, // clamped to 0
          y: 100,
          width: 90_000, // clamped to viewport width
          height: 300,
          background: 'url(javascript:alert(1))', // rejected: not #rrggbb
          color: 'red;}body{display:none', // rejected: not #rrggbb
          fontWeight: 950, // off-list → dropped
          children: [
            { name: 'No bounds', element: 'text', text: 'dropped: non-finite geometry', x: Number.NaN, y: 0, width: 10, height: 10 },
            {
              name: 'Level 2',
              element: 'group',
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              children: [
                {
                  name: 'Level 3 pruned',
                  element: 'text',
                  text: 'too deep',
                  x: 0,
                  y: 0,
                  width: 50,
                  height: 20,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(plan).toBeDefined();
    expect(plan!.viewport.height).toBe(40_000);
    const region = plan!.regions[0].children[0];
    expect(region.element).toBe('group');
    expect(region.tag).toBe('div');
    expect(region.bounds).toMatchObject({ x: 0, width: 1440 });
    expect(region.style).toBeUndefined();
    // The NaN-geometry child is dropped entirely; depth is capped at two
    // authored levels, so "Level 3 pruned" has no children of its own kept
    // beyond the cap.
    expect(region.children).toHaveLength(1);
    expect(region.children[0].name).toBe('Level 2');
    expect(region.children[0].children[0].children).toHaveLength(0);
  });

  it('caps the total region count', () => {
    const plan = sanitizeReconstruction({
      pageHeight: 4000,
      regions: Array.from({ length: 80 }, (_, index) => ({
        name: `Block ${index}`,
        element: 'group',
        x: 0,
        y: index * 40,
        width: 1440,
        height: 40,
      })),
    });

    expect(plan).toBeDefined();
    const count = (regions: { children: unknown[] }[]): number =>
      regions.reduce((sum, region) => sum + 1 + count(region.children as { children: unknown[] }[]), 0);
    expect(count(plan!.regions[0].children as { children: unknown[] }[])).toBeLessThanOrEqual(48);
  });

  it('returns undefined for vague or structurally unusable proposals', () => {
    expect(sanitizeReconstruction(undefined)).toBeUndefined();
    expect(sanitizeReconstruction('not an object')).toBeUndefined();
    expect(sanitizeReconstruction({ pageHeight: 900 })).toBeUndefined();
    expect(sanitizeReconstruction({ pageHeight: 900, regions: [] })).toBeUndefined();
    expect(sanitizeReconstruction({ pageHeight: Number.NaN, regions: [{}] })).toBeUndefined();
    // All regions invalid → no plan rather than an empty shell.
    expect(
      sanitizeReconstruction({ pageHeight: 900, regions: [{ name: 'x', element: 'text', x: Number.NaN, y: 0, width: 1, height: 1 }] }),
    ).toBeUndefined();
  });

  it('renders through the live preview with source positions and zero axe violations', async () => {
    const plan = sanitizeReconstruction(makeModelProposal(), 'landing.png');
    const page = makeGeneratedPage({ reconstruction: plan });
    const { container } = render(GeneratedPagePreview, { props: { page } });

    expect(screen.getByRole('heading', { level: 1, name: 'Ride farther with Area' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument();
    const hero = container.querySelector('[data-reconstruction-region="image-1"]') as HTMLElement;
    expect(hero.style.position).toBe('absolute');
    expect(hero.style.width).toBe('100%');
    const headline = container.querySelector('[data-reconstruction-region="image-2"]') as HTMLElement;
    expect(headline.style.position).toBe('absolute');

    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations).toHaveLength(0);
  });
});

function makeModelProposal(): unknown {
  return {
    pageHeight: 2400,
    regions: [
      {
        name: 'Hero',
        element: 'section',
        x: 0,
        y: 0,
        width: 1440,
        height: 800,
        background: '#F5F1E8',
        confidence: 0.85,
        children: [
          {
            name: 'Headline',
            element: 'text',
            text: 'Ride farther with Area',
            x: 120,
            y: 200,
            width: 720,
            height: 140,
            fontSize: 56,
            fontWeight: 700,
            color: '#111827',
            confidence: 0.9,
          },
          {
            name: 'Subcopy',
            element: 'text',
            text: 'Regional insight without the data overload.',
            x: 120,
            y: 380,
            width: 560,
            height: 60,
            fontSize: 18,
            confidence: 0.4,
          },
          {
            name: 'Primary CTA',
            element: 'button',
            text: 'Get started',
            x: 120,
            y: 520,
            width: 200,
            height: 56,
            background: '#4A7C14',
            color: '#FFFFFF',
            fontSize: 18,
            confidence: 0.8,
          },
        ],
      },
      {
        name: 'Gallery',
        element: 'section',
        x: 0,
        y: 900,
        width: 1440,
        height: 700,
        confidence: 0.7,
        children: [
          {
            name: 'Product photo',
            element: 'media',
            x: 160,
            y: 980,
            width: 520,
            height: 400,
            confidence: 0.75,
          },
        ],
      },
    ],
  };
}

function makeGeneratedPage(overrides: Partial<GeneratedPage> = {}): GeneratedPage {
  return {
    densityKey: 'comfortable',
    layoutPattern: 'Single hero',
    kicker: 'Fallback',
    title: 'Fallback template title',
    summary: 'Fallback summary',
    palette: [],
    referenceName: 'landing.png',
    referencePreview: 'blob:reference',
    sections: [],
    cta: { kind: 'none', label: '' },
    ...overrides,
  };
}
