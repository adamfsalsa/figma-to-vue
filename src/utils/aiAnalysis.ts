import type { ReferenceAnalysis } from '../types/referenceAnalysis';
import type { GeneratedContent } from '../types/pagePlan';

export type AiAnalysisResult =
  | { ok: true; analysis: Partial<ReferenceAnalysis>; content?: GeneratedContent }
  | { ok: false; reason: string; message: string };

interface AnalyzeApiPayload {
  ok?: boolean;
  analysis?: Partial<ReferenceAnalysis>;
  content?: GeneratedContent;
  reason?: string;
  message?: string;
  providerStatus?: number;
}

// 8s was tuned for the original lightweight classify-only Haiku call
// (max_tokens 512). The proxy now uses Sonnet and also generates page copy
// (max_tokens 1536), which legitimately takes longer — especially on a cold
// serverless start. 25s leaves headroom under the 30s server-side limit set
// in vercel.json (functions["api/analyze.ts"].maxDuration) so the client
// times out gracefully before Vercel would kill the function outright.
const REQUEST_TIMEOUT_MS = 25_000;

/** Either an uploaded file's downscaled data URL, or a Figma-imported preview URL. */
export type AiAnalysisSource = { image: string } | { imageUrl: string };

/**
 * Calls the optional /api/analyze proxy (see api/analyze.ts). The provider
 * call behind that endpoint is optional and requires server-side Anthropic and
 * Upstash configuration. Callers always retain the local, no-LLM fallback for
 * any unsuccessful response, regardless of the returned reason. Works for both
 * reference sources the app supports: an uploaded image (`{ image }`) and a
 * Figma URL import (`{ imageUrl }`, fetched server-side from Figma's preview
 * host — see isAllowedFigmaPreviewHost in api/analyze.ts).
 */
export async function requestAiAnalysis(source: AiAnalysisSource): Promise<AiAnalysisResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
      signal: controller.signal,
    });

    const payload: AnalyzeApiPayload | null = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.ok !== true) {
      const base = payload?.message ?? 'AI analysis is unavailable right now. Using local analysis instead.';
      // Surface the upstream HTTP status on a provider failure so a bad key
      // (401) or billing/access issue (403) is visible in the UI, not silent.
      const detail = payload?.providerStatus ? ` (provider status ${payload.providerStatus})` : '';
      return {
        ok: false,
        reason: payload?.reason ?? 'network_error',
        message: base + detail,
      };
    }

    return { ok: true, analysis: payload.analysis ?? {}, content: payload.content };
  } catch {
    return {
      ok: false,
      reason: 'network_error',
      message: 'AI analysis is unavailable right now. Using local analysis instead.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

const MAX_UPLOAD_EDGE = 768;

/**
 * Downscales the reference image to a small PNG data URL before it is sent to
 * /api/analyze. This bounds the per-call input-token cost (the model bills by
 * image size) so spend stays predictable, and it rasterizes SVG/other formats
 * to PNG, which the vision provider accepts. Falls back to the raw data URL if
 * canvas is unavailable or decoding fails — the proxy still validates format
 * and size on its side.
 */
export async function fileToDownscaledDataUrl(file: File, maxEdge = MAX_UPLOAD_EDGE): Promise<string> {
  try {
    const objectUrl = URL.createObjectURL(file);
    const image = await loadImage(objectUrl);
    URL.revokeObjectURL(objectUrl);

    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      return fileToDataUrl(file);
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch {
    return fileToDataUrl(file);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode image.'));
    image.src = src;
  });
}
