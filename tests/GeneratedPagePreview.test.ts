import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import GeneratedPagePreview from '../src/components/GeneratedPagePreview.vue';
import type { GeneratedPage, GeneratedPageCta } from '../src/types/generatedPage';

function makePage(overrides: Partial<GeneratedPage> = {}): GeneratedPage {
  return {
    densityKey: 'comfortable',
    layoutPattern: 'Hero plus feature cards',
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

describe('GeneratedPagePreview', () => {
  it('renders the hero, summary, and section cards', () => {
    render(GeneratedPagePreview, { props: { page: makePage() } });

    expect(screen.getByRole('heading', { level: 3, name: 'Generated title' })).toBeInTheDocument();
    expect(screen.getByText('A short summary line.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Design signals' })).toBeInTheDocument();
  });

  it('renders a button CTA for Button-led pages', () => {
    render(GeneratedPagePreview, { props: { page: makePage() } });

    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument();
  });

  it('renders a link CTA for Text-link pages', () => {
    const cta: GeneratedPageCta = { kind: 'link', label: 'Learn more' };
    render(GeneratedPagePreview, { props: { page: makePage({ cta }) } });

    expect(screen.getByRole('link', { name: /Learn more/ })).toBeInTheDocument();
  });

  it('renders an accessible email form for Form-first pages', () => {
    const cta: GeneratedPageCta = { kind: 'form', label: 'Sign up' };
    render(GeneratedPagePreview, { props: { page: makePage({ cta }) } });

    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('omits the CTA when none is visible', () => {
    const cta: GeneratedPageCta = { kind: 'none', label: '' };
    render(GeneratedPagePreview, { props: { page: makePage({ cta }) } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders an interactive dropdown for a Product finder flow page', () => {
    render(GeneratedPagePreview, {
      props: { page: makePage({ layoutPattern: 'Product finder flow' }) },
    });

    const select = screen.getByLabelText('What are you looking for?');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('button', { name: 'Show results' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Design signals' })).toBeInTheDocument();
  });

  it('resets finder state when a newly generated page replaces the current page', async () => {
    const user = userEvent.setup();
    const { rerender } = render(GeneratedPagePreview, {
      props: { page: makePage({ layoutPattern: 'Product finder flow' }) },
    });

    await user.selectOptions(screen.getByLabelText('What are you looking for?'), 'Implementation plan');
    await user.click(screen.getByRole('button', { name: 'Show results' }));
    expect(screen.getByRole('status')).toHaveTextContent('Showing: Implementation plan');

    await rerender({
      page: makePage({
        layoutPattern: 'Product finder flow',
        sections: [
          { title: 'New first choice', body: 'Fresh content.' },
          { title: 'New second choice', body: 'More fresh content.' },
        ],
      }),
    });

    expect(screen.getByLabelText('What are you looking for?')).toHaveValue('New first choice');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('omits the finder dropdown for non-finder layouts', () => {
    render(GeneratedPagePreview, { props: { page: makePage() } });

    expect(screen.queryByLabelText('What are you looking for?')).not.toBeInTheDocument();
  });

  it('applies an extracted palette as CSS custom properties', () => {
    const { container } = render(GeneratedPagePreview, {
      props: { page: makePage({ palette: ['#112233', '#445566'] }) },
    });

    const article = container.querySelector('.generated-page') as HTMLElement;
    expect(article.style.getPropertyValue('--token-accent')).toBe('#112233');
    expect(article.style.getPropertyValue('--token-surface-soft')).toBe('#445566');
  });
});
