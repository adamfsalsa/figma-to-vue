import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import RideFinder from '../src/components/RideFinder.vue';

describe('RideFinder', () => {
  it('renders the first step as a labeled radio group', () => {
    render(RideFinder);

    expect(screen.getByRole('heading', { level: 2, name: 'Where do you want to ride?' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Where do you want to ride?' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('advances to the next step and moves focus to the new heading', async () => {
    const user = userEvent.setup();
    render(RideFinder);

    await user.click(screen.getByRole('radio', { name: 'Open road Long miles mostly on pavement' }));

    const nextHeading = await screen.findByRole('heading', {
      level: 2,
      name: 'What kind of support matters most?',
    });

    expect(nextHeading).toHaveFocus();
  });

  it('uses one native radio group name per step', () => {
    render(RideFinder);

    const radios = screen.getAllByRole('radio');
    const names = new Set(radios.map((radio) => radio.getAttribute('name')));

    expect(names).toEqual(new Set(['ride-environment-options']));
  });
});
