import { createDefaultVisualTokens, type VisualTokens } from '../types/visualTokens';

const SAMPLE_SIZE = 48;
const MIN_ALPHA = 16;
const CHANNEL_LEVELS = 8;
const CHANNEL_STEP = 256 / CHANNEL_LEVELS;

interface ColorBucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

function toHexChannel(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Pure pixel quantization (no canvas/DOM). Buckets pixels into a coarse RGB
 * grid, keeps the most common buckets as the palette, and derives average
 * luminance from every sampled (non-transparent) pixel. Kept separate from
 * the canvas-drawing wrapper below so the algorithm is unit-testable without
 * a real image decoder.
 */
export function quantizePixelsToVisualTokens(pixels: Uint8ClampedArray, paletteSize = 5): VisualTokens {
  const buckets = new Map<number, ColorBucket>();
  let luminanceSum = 0;
  let sampledPixelCount = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < MIN_ALPHA) {
      continue;
    }

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    luminanceSum += relativeLuminance(r, g, b);
    sampledPixelCount += 1;

    const key =
      Math.floor(r / CHANNEL_STEP) * CHANNEL_LEVELS * CHANNEL_LEVELS +
      Math.floor(g / CHANNEL_STEP) * CHANNEL_LEVELS +
      Math.floor(b / CHANNEL_STEP);

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  if (sampledPixelCount === 0) {
    return createDefaultVisualTokens();
  }

  const palette = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, paletteSize)
    .map((bucket) => {
      const r = bucket.r / bucket.count;
      const g = bucket.g / bucket.count;
      const b = bucket.b / bucket.count;
      return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
    });

  const averageLuminance = luminanceSum / sampledPixelCount;

  return {
    palette,
    averageLuminance,
    isDark: averageLuminance < 0.5,
    source: 'extracted-from-reference',
  };
}

/**
 * Browser-only wrapper: decodes the uploaded file, draws it downscaled to an
 * offscreen canvas, and reads pixels for quantizePixelsToVisualTokens(). Not
 * exercised in the jsdom test environment (no real canvas pixel pipeline) —
 * any failure (unsupported canvas, decode error) resolves to the placeholder
 * tokens rather than throwing, so callers never need a try/catch.
 */
export async function extractVisualTokensFromImage(file: File): Promise<VisualTokens> {
  try {
    const bitmap = await loadBitmap(file);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, SAMPLE_SIZE / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      return createDefaultVisualTokens();
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    return quantizePixelsToVisualTokens(data);
  } catch {
    return createDefaultVisualTokens();
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (event) => {
      URL.revokeObjectURL(url);
      reject(event);
    };
    image.src = url;
  });
}
