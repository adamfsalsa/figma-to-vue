import type { ReferenceAnalysis } from '../types/referenceAnalysis';

export type AiAnalysisResult =
  | { ok: true; analysis: Partial<ReferenceAnalysis> }
  | { ok: false; reason: string; message: string };

interface AnalyzeApiPayload {
  ok?: boolean;
  analysis?: Partial<ReferenceAnalysis>;
  reason?: string;
  message?: string;
}

const REQUEST_TIMEOUT_MS = 8000;

/**
 * Calls the optional /api/analyze proxy (see api/analyze.ts). The provider
 * call behind that endpoint is currently stubbed, so this will normally
 * resolve to `{ ok: false, reason: 'not_configured', ... }` until a provider
 * is wired up — that is expected, not a bug. Callers should always have a
 * fallback path (the local, no-LLM analyzer) ready to use on any `ok: false`
 * result, regardless of `reason`.
 */
export async function requestAiAnalysis(imageDataUrl: string): Promise<AiAnalysisResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl }),
      signal: controller.signal,
    });

    const payload: AnalyzeApiPayload | null = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.ok !== true) {
      return {
        ok: false,
        reason: payload?.reason ?? 'network_error',
        message: payload?.message ?? 'AI analysis is unavailable right now. Using local analysis instead.',
      };
    }

    return { ok: true, analysis: payload.analysis ?? {} };
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
