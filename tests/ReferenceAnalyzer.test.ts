import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ReferenceAnalyzer from '../src/components/ReferenceAnalyzer.vue';
import { createDefaultReferenceAnalysis } from '../src/types/referenceAnalysis';
import type { ReferenceAnalysis } from '../src/types/referenceAnalysis';

describe('ReferenceAnalyzer', () => {
  it('renders a no-reference state and analysis controls', () => {
    render(ReferenceAnalyzer, {
      props: {
        modelValue: createDefaultReferenceAnalysis(),
        referenceName: null,
        referencePreview: null,
      },
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Reference analyzer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'No reference loaded' })).toBeInTheDocument();
    expect(screen.getByLabelText('Hero composition')).toBeInTheDocument();
    expect(screen.getByLabelText('Visual translation notes')).toBeInTheDocument();
  });

  it('emits structured analysis updates', async () => {
    const user = userEvent.setup();
    const initial = createDefaultReferenceAnalysis();
    const { emitted } = render(ReferenceAnalyzer, {
      props: {
        modelValue: initial,
        referenceName: 'reference.png',
        referencePreview: 'blob:reference-preview',
      },
    });

    await user.selectOptions(screen.getByLabelText('Hero composition'), 'Full-bleed media');

    const events = emitted() as Record<string, ReferenceAnalysis[][]>;
    const payload = events['update:modelValue'][0][0];

    expect(payload).toEqual({
      ...initial,
      heroComposition: 'Full-bleed media',
    });
  });
});
