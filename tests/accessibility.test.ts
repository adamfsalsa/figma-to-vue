import { render } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import App from '../src/App.vue';

describe('accessibility', () => {
  it('has no automated axe violations', async () => {
    const { container } = render(App);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    expect(results.violations).toHaveLength(0);
  });
});
