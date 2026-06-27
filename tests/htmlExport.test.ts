import { generatePageHtml } from '../src/utils/htmlExport';
import type { GeneratedPage, GeneratedPageCta } from '../src/types/generatedPage';

function makePage(overrides: Partial<GeneratedPage> = {}): GeneratedPage {
  return {
    densityKey: 'comfortable',
    kicker: 'Concept',
    title: 'Generated title',
    summary: 'A short summary line.',
    palette: [],
    referenceName: 'reference.png',
    referencePreview: null,
    sections: [
      { title: 'Design signals', body: 'First signal.' },
      { title: 'Implementation plan', body: 'Second signal.' },
    ],
    cta: { kind: 'button', label: 'Get started' },
    ...overrides,
  };
}

describe('generatePageHtml', () => {
  it('emits a self-styled standalone document', () => {
    const html = generatePageHtml(makePage());

    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Generated title</title>');
    expect(html).toContain('<style>');
    expect(html.match(/<h1>/g)).toHaveLength(1);
  });

  it('renders all sections', () => {
    const html = generatePageHtml(makePage());

    expect(html).toContain('<h2>Design signals</h2>');
    expect(html).toContain('<h2>Implementation plan</h2>');
  });

  it('includes the CTA matching the page (button)', () => {
    const html = generatePageHtml(makePage());

    expect(html).toContain('<button type="button" class="cta">Get started</button>');
  });

  it('renders an accessible email form for Form-first pages', () => {
    const cta: GeneratedPageCta = { kind: 'form', label: 'Sign up' };
    const html = generatePageHtml(makePage({ cta }));

    expect(html).toContain('class="cta-form"');
    expect(html).toContain('for="cta-email"');
    expect(html).toContain('<button type="submit" class="cta">Sign up</button>');
  });

  it('omits the CTA when none is visible', () => {
    const cta: GeneratedPageCta = { kind: 'none', label: '' };
    const html = generatePageHtml(makePage({ cta }));

    expect(html).not.toContain('class="cta"');
  });

  it('bakes an extracted palette into custom properties', () => {
    const html = generatePageHtml(makePage({ palette: ['#0a0ac8', '#f0f0f0'] }));

    expect(html).toContain('--token-accent: #0a0ac8');
    expect(html).toContain('--token-surface-soft: #f0f0f0');
  });

  it('escapes content so generated text cannot inject markup', () => {
    const html = generatePageHtml(makePage({ title: '<script>alert(1)</script>' }));

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
