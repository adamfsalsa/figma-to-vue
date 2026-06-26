import { quantizePixelsToVisualTokens } from '../src/utils/colorExtraction';

function solidPixels(r: number, g: number, b: number, count: number, alpha = 255): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i += 1) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = alpha;
  }
  return pixels;
}

describe('quantizePixelsToVisualTokens', () => {
  it('returns placeholder tokens for an empty pixel buffer', () => {
    const tokens = quantizePixelsToVisualTokens(new Uint8ClampedArray(0));

    expect(tokens.source).toBe('placeholder');
    expect(tokens.palette).toEqual([]);
  });

  it('returns placeholder tokens when every pixel is fully transparent', () => {
    const tokens = quantizePixelsToVisualTokens(solidPixels(255, 0, 0, 4, 0));

    expect(tokens.source).toBe('placeholder');
  });

  it('extracts a dominant color from a solid-color image', () => {
    const tokens = quantizePixelsToVisualTokens(solidPixels(220, 20, 20, 16));

    expect(tokens.source).toBe('extracted-from-reference');
    expect(tokens.palette).toHaveLength(1);
    expect(tokens.palette[0]).toMatch(/^#[0-9a-f]{6}$/);
    expect(tokens.palette[0].startsWith('#d')).toBe(true);
  });

  it('ranks the most frequent color first and ignores transparent padding', () => {
    const majority = solidPixels(10, 10, 200, 12);
    const minority = solidPixels(240, 240, 240, 3);
    const transparentPadding = solidPixels(0, 0, 0, 5, 0);
    const pixels = new Uint8ClampedArray([...majority, ...minority, ...transparentPadding]);

    const tokens = quantizePixelsToVisualTokens(pixels, 2);

    expect(tokens.palette[0]).toBe('#0a0ac8');
    expect(tokens.palette).toHaveLength(2);
  });

  it('flags dark images via average luminance', () => {
    const tokens = quantizePixelsToVisualTokens(solidPixels(10, 10, 10, 8));

    expect(tokens.isDark).toBe(true);
    expect(tokens.averageLuminance).toBeLessThan(0.5);
  });

  it('flags light images via average luminance', () => {
    const tokens = quantizePixelsToVisualTokens(solidPixels(250, 250, 250, 8));

    expect(tokens.isDark).toBe(false);
    expect(tokens.averageLuminance).toBeGreaterThan(0.5);
  });
});
