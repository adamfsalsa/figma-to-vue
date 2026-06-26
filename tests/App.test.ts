import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import App from '../src/App.vue';

describe('App pipeline console', () => {
  it('renders the intake, assistant, brief, and delivery lane', () => {
    render(App);

    expect(screen.getByRole('heading', { level: 1, name: 'Figma to Vue pipeline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Reference intake' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '2. Formatting assistant' })).toBeInTheDocument();
    expect(screen.getByLabelText('Generated implementation brief')).toHaveTextContent('Pipeline gates:');
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

    expect(await screen.findByText('finder-reference.png')).toBeInTheDocument();
    expect(screen.getByLabelText('Generated implementation brief')).toHaveTextContent(
      'Reference: finder-reference.png',
    );
  });
});
