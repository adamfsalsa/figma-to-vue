import {
  buildFigmaDocumentImport,
  collectFigmaAssetNodeIds,
  parseFigmaUrl,
  selectFigmaRenderableRoot,
  type FigmaNode,
} from '../src/utils/figmaDocument.js';
import type { FigmaDocumentImport } from '../src/types/figmaImport.js';

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

const MAX_EMBEDDED_ASSET_BYTES = 600_000;
const MAX_EMBEDDED_TOTAL_BYTES = 2_250_000;
const ASSET_FETCH_TIMEOUT_MS = 5_000;
const EMBEDDABLE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

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
    const { fileName, node: selectedNode, thumbnailUrl } = parsed.nodeId
      ? await fetchNode(parsed.fileKey, parsed.nodeId, token)
      : await fetchFirstFrame(parsed.fileKey, token);
    const node = selectFigmaRenderableRoot(selectedNode);
    const assetNodeIds = collectFigmaAssetNodeIds(node);
    const renderedImages: Record<string, string | null> = await fetchRenderedImages(
      parsed.fileKey,
      [node.id, ...assetNodeIds],
      token,
    ).catch((): Record<string, string | null> => ({}));
    const previewUrl = renderedImages[node.id] ?? thumbnailUrl;
    const remoteAssetUrls = Object.fromEntries(assetNodeIds.map((id) => [id, renderedImages[id] ?? null]));
    const assetUrls = await materializeFigmaAssets(remoteAssetUrls);
    const document: FigmaDocumentImport = buildFigmaDocumentImport(fileName, node, previewUrl, assetUrls);
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
    `/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(nodeId)}&depth=10`,
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
  // The shallow file request is only for selecting a sensible first frame.
  // Fetch that frame again at reconstruction depth so a URL without node-id
  // does not silently produce a one-level template.
  const detailed = await fetchNode(fileKey, node.id, token);
  return {
    fileName: payload.name ?? detailed.fileName,
    node: detailed.node,
    thumbnailUrl: payload.thumbnailUrl ?? detailed.thumbnailUrl,
  };
}

async function fetchRenderedImages(
  fileKey: string,
  nodeIds: string[],
  token: string,
): Promise<Record<string, string | null>> {
  if (nodeIds.length === 0) return {};
  const payload = await figmaFetch<FigmaImagesResponse>(
    `/v1/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(nodeIds.join(','))}&format=png&scale=1`,
    token,
  );
  return payload.images ?? {};
}

/** Only Figma-owned HTTPS CDN URLs may be fetched for asset embedding. */
export function isAllowedFigmaAssetHost(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === 'https:'
      && (url.hostname === 'figma.com' || url.hostname.endsWith('.figma.com'));
  } catch {
    return false;
  }
}

export async function materializeFigmaAssets(
  remoteAssets: Record<string, string | null>,
): Promise<Record<string, string | null>> {
  const entries = Object.entries(remoteAssets);
  const fetched = await Promise.all(entries.map(async ([id, url]) => {
    if (!url || !isAllowedFigmaAssetHost(url)) return { id, url, embedded: null };
    const embedded = await fetchEmbeddedAsset(url).catch(() => null);
    return { id, url, embedded };
  }));

  let totalBytes = 0;
  return Object.fromEntries(fetched.map(({ id, url, embedded }) => {
    if (!embedded || totalBytes + embedded.rawBytes > MAX_EMBEDDED_TOTAL_BYTES) {
      return [id, url];
    }
    totalBytes += embedded.rawBytes;
    return [id, embedded.dataUrl];
  }));
}

async function fetchEmbeddedAsset(
  url: string,
): Promise<{ dataUrl: string; rawBytes: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASSET_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { redirect: 'error', signal: controller.signal });
    if (!response.ok) throw new Error('FIGMA_ASSET_FETCH_FAILED');
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].toLowerCase();
    if (!EMBEDDABLE_IMAGE_TYPES.has(contentType)) throw new Error('FIGMA_ASSET_TYPE_REJECTED');
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > MAX_EMBEDDED_ASSET_BYTES) throw new Error('FIGMA_ASSET_TOO_LARGE');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_EMBEDDED_ASSET_BYTES) throw new Error('FIGMA_ASSET_TOO_LARGE');
    return {
      rawBytes: buffer.byteLength,
      dataUrl: `data:${contentType};base64,${buffer.toString('base64')}`,
    };
  } finally {
    clearTimeout(timeout);
  }
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
