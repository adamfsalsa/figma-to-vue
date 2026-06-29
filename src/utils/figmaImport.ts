import type { FigmaDocumentImport, FigmaImportResult } from '../types/figmaImport';

interface FigmaImportPayload {
  ok?: boolean;
  document?: FigmaDocumentImport;
  reason?: string;
  message?: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

export async function requestFigmaImport(url: string): Promise<FigmaImportResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/figma', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    const payload: FigmaImportPayload | null = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok || !payload.document) {
      return {
        ok: false,
        reason: payload?.reason ?? 'network_error',
        message: payload?.message ?? 'Figma import is unavailable right now.',
      };
    }
    return { ok: true, document: payload.document };
  } catch {
    return { ok: false, reason: 'network_error', message: 'Figma import is unavailable right now.' };
  } finally {
    clearTimeout(timeout);
  }
}
