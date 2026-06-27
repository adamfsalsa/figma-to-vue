import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import App from '../src/App.vue';

describe('App pipeline console', () => {
  it('renders the intake, assistant, brief, and delivery lane', () => {
    render(App);

    expect(screen.getByRole('heading', { level: 1, name: 'Figma to Vue pipeline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Reference intake' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '2. Formatting assistant' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Reference analyzer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Generated implementation brief')).toHaveTextContent('Pipeline gates:');
    expect(screen.getByLabelText('Generated JSON page plan')).toHaveTextContent(
      'No JSON plan generated yet',
    );
    expect(screen.getByRole('button', { name: 'Generate JSON plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate inline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Vue component' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'No page generated yet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'UI to Git to deployed page' })).toBeInTheDocument();
  });

  it('updates the generated brief from formatting answers', async () => {
    const user = userEvent.setup();
    render(App);

    await user.selectOptions(screen.getByLabelText('What are we building?'), 'Landing page');
    await user.click(screen.getByRole('radio', { name: 'Editorial' }));
    await user.clear(screen.getByLabelText('UI tone'));
    await user.type(screen.getByLabelText('UI tone'), 'Quiet and polished');
    await user.type(screen.getByLabelText('Formatting notes'), 'Keep the first viewport focused.');

    const brief = screen.getByLabelText('Generated implementation brief');

    expect(brief).toHaveTextContent('Page type: Landing page');
    expect(brief).toHaveTextContent('Visual density: Editorial');
    expect(brief).toHaveTextContent('UI tone: Quiet and polished');
    expect(brief).toHaveTextContent('Keep the first viewport focused.');
  });

  it('previews a dropped reference image name in the brief', async () => {
    render(App);

    const file = new File(['reference'], 'finder-reference.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload reference image');

    await userEvent.upload(input, file);

    expect(await screen.findAllByText('finder-reference.png')).toHaveLength(2);
    expect(screen.getByLabelText('Generated implementation brief')).toHaveTextContent(
      'Reference: finder-reference.png',
    );
  });

  it('generates a constrained JSON page plan from the current answers', async () => {
    const user = userEvent.setup();
    render(App);

    await user.selectOptions(screen.getByLabelText('What are we building?'), 'Dashboard view');
    await user.click(screen.getByRole('radio', { name: 'Editorial' }));
    await user.selectOptions(screen.getByLabelText('Hero composition'), 'Centered hero');
    await user.selectOptions(screen.getByLabelText('Media emphasis'), 'Primary');
    await user.selectOptions(screen.getByLabelText('Layout pattern'), 'Dashboard grid');
    await user.clear(screen.getByLabelText('Expected content sections'));
    await user.type(screen.getByLabelText('Expected content sections'), '5');
    await user.selectOptions(screen.getByLabelText('CTA style'), 'Text-link');
    await user.type(screen.getByLabelText('Visual translation notes'), 'Use a strong visual hierarchy.');
    await user.type(screen.getByLabelText('Formatting notes'), 'Keep charts simple and readable.');
    await user.click(screen.getByRole('button', { name: 'Generate JSON plan' }));

    const planText = screen.getByLabelText('Generated JSON page plan').textContent ?? '';
    const plan = JSON.parse(planText);

    expect(plan.schemaVersion).toBe('figma-to-vue.page-plan.v1');
    expect(plan.source.generator).toBe('local-deterministic');
    expect(plan.page.type).toBe('Dashboard view');
    expect(plan.page.density).toBe('Editorial');
    expect(plan.reference.analysis.heroComposition).toBe('Centered hero');
    expect(plan.reference.analysis.mediaEmphasis).toBe('Primary');
    expect(plan.reference.analysis.layoutPattern).toBe('Dashboard grid');
    expect(plan.reference.analysis.sectionCount).toBe(5);
    expect(plan.reference.analysis.ctaStyle).toBe('Text-link');
    expect(plan.sections).toHaveLength(3);
    expect(plan.sections[1].body).toContain('dashboard grid');
    expect(plan.sections[1].body).toContain('5 content sections');
    expect(plan.sections[2].body).toBe('Use a strong visual hierarchy.');
    expect(plan.accessibility.notes).toContain('Use a single h1 for the generated page.');

    const sfc = screen.getByLabelText('Generated Vue single-file component').textContent ?? '';
    expect(sfc).toContain('<script setup lang="ts">');
    expect(sfc).toContain('Dashboard view from design reference');
    expect(sfc).toContain('v-for="section in sections"');
  });

  it('opens and closes a focused live preview dialog', async () => {
    const user = userEvent.setup();
    render(App);

    await user.click(screen.getByRole('button', { name: '▶ Preview page' }));

    const dialog = screen.getByRole('dialog', { name: 'Live preview of the generated page' });
    expect(dialog).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close preview' });
    expect(closeButton).toHaveFocus();

    await user.click(closeButton);

    expect(
      screen.queryByRole('dialog', { name: 'Live preview of the generated page' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '▶ Preview page' })).toHaveFocus();
  });

  it('generates a static one-page preview from the current brief', async () => {
    const user = userEvent.setup();
    render(App);

    await user.selectOptions(screen.getByLabelText('What are we building?'), 'Marketing section');
    await user.click(screen.getByRole('radio', { name: 'Compact' }));
    await user.clear(screen.getByLabelText('UI tone'));
    await user.type(screen.getByLabelText('UI tone'), 'Sharp and minimal');
    await user.type(screen.getByLabelText('Formatting notes'), 'Lead with a narrow hero and clear proof points.');
    await user.click(screen.getByRole('button', { name: 'Generate inline' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Generated page' })).toHaveFocus();
    expect(screen.getByLabelText('Generated JSON page plan')).toHaveTextContent(
      '"schemaVersion": "figma-to-vue.page-plan.v1"',
    );
    expect(screen.getByRole('article', { name: 'Generated one-page website preview' })).toHaveTextContent(
      'Marketing section from design reference',
    );
    expect(screen.getByRole('article', { name: 'Generated one-page website preview' })).toHaveTextContent(
      'Lead with a narrow hero and clear proof points.',
    );
  });
});
