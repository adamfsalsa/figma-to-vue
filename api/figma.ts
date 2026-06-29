import { buildFigmaDocumentImport, parseFigmaUrl, type FigmaNode } from '../src/utils/figmaDocument';
import type { FigmaDocumentImport } from '../src/types/figmaImport';

interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
}

interface FigmaNodesResponse {
  name?: string;
  thumbnailUrl?: string;
  nodes?: Record<string, { document?: FigmaNode } | null>;
}

interface FigmaFileResponse {
  name?: string;
  thumbnailUrl?: string;
  document?: FigmaNode;
}

interface FigmaImagesResponse {
  images?: Record<string, string | null>;
}

class FigmaApiError extends Error {
  constructor(public readonly status: number) {
    super(`Figma API returned ${status}`);
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    respond(res, 405, { ok: false, reason: 'method_not_allowed', message: 'Use POST.' });
    return;
  }

  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    respond(res, 501, {
      ok: false,
      reason: 'not_configured',
      message: 'Figma import is not configured. Add a server-side FIGMA_ACCESS_TOKEN.',
    });
    return;
  }

  const inputUrl = readUrl(req.body);
  const parsed = inputUrl ? parseFigmaUrl(inputUrl) : null;
  if (!parsed) {
    respond(res, 400, {
      ok: false,
      reason: 'invalid_url',
      message: 'Enter a valid Figma design or frame URL.',
    });
    return;
  }

  try {
    const { fileName, node, thumbnailUrl } = parsed.nodeId
      ? await fetchNode(parsed.fileKey, parsed.nodeId, token)
      : await fetchFirstFrame(parsed.fileKey, token);
    const previewUrl = await fetchPreview(parsed.fileKey, node.id, token).catch(() => thumbnailUrl);
    const document: FigmaDocumentImport = buildFigmaDocumentImport(fileName, node, previewUrl);
    respond(res, 200, { ok: true, document });
  } catch (error) {
    if (error instanceof FigmaApiError && (error.status === 401 || error.status === 403)) {
      respond(res, 403, {
        ok: false,
        reason: 'forbidden',
        message: 'The configured Figma token cannot read this file or lacks file_content:read.',
      });
      return;
    }
    if (error instanceof FigmaApiError && error.status === 404) {
      respond(res, 404, { ok: false, reason: 'not_found', message: 'The Figma file or frame was not found.' });
      return;
    }
    respond(res, 502, {
      ok: false,
      reason: 'provider_error',
      message: 'Figma could not return that document right now.',
    });
  }
}

async function fetchNode(fileKey: string, nodeId: string, token: string) {
  const payload = await figmaFetch<FigmaNodesResponse>(
    `/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(nodeId)}&depth=6`,
    token,
  );
  const node = payload.nodes?.[nodeId]?.document;
  if (!node) throw new FigmaApiError(404);
  return { fileName: payload.name ?? 'Figma file', node, thumbnailUrl: payload.thumbnailUrl ?? null };
}

async function fetchFirstFrame(fileKey: string, token: string) {
  const payload = await figmaFetch<FigmaFileResponse>(
    `/v1/files/${encodeURIComponent(fileKey)}?depth=3`,
    token,
  );
  const pages = payload.document?.children ?? [];
  const candidates = pages.flatMap((page) => page.children ?? []);
  const node = candidates.find((candidate) =>
    ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'SECTION'].includes(candidate.type),
  );
  if (!node) throw new FigmaApiError(404);
  return { fileName: payload.name ?? 'Figma file', node, thumbnailUrl: payload.thumbnailUrl ?? null };
}

async function fetchPreview(fileKey: string, nodeId: string, token: string): Promise<string | null> {
  const payload = await figmaFetch<FigmaImagesResponse>(
    `/v1/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`,
    token,
  );
  return payload.images?.[nodeId] ?? null;
}

async function figmaFetch<T>(path: string, token: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`https://api.figma.com${path}`, {
      headers: { 'X-Figma-Token': token },
      signal: controller.signal,
    });
    if (!response.ok) throw new FigmaApiError(response.status);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

function readUrl(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const value = (body as { url?: unknown }).url;
  return typeof value === 'string' && value.length <= 2_000 ? value : null;
}

function respond(res: ApiResponse, status: number, payload: unknown): void {
  res.status(status).json(payload);
}
