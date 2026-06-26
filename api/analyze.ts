/**
 * Vercel serverless function: AI-assisted reference analysis (stubbed).
 *
 * STATUS: scaffolding only. The actual vision-model call is NOT implemented —
 * see `callVisionProvider()` below for exactly what the next increment needs
 * to fill in. Every other piece (request validation, rate limiting, error
 * shape) is real and intended to ship as-is once a provider is wired up.
 *
 * WHY THIS EXISTS: the frontend already has a free, zero-key, no-LLM analysis
 * path (see src/utils/colorExtraction.ts — real palette/luminance extraction
 * that runs entirely in the browser). This endpoint is the *optional* second
 * tier: an "Enhance with AI" action that asks a vision-capable LLM to fill in
 * the semantic fields color math cannot reach (hero composition, layout
 * pattern, CTA style — see docs/ai-analysis.md for the full breakdown of
 * what classic CV can and cannot do here).
 *
 * Until a provider is wired up, every request resolves with `notConfigured`
 * below, and the frontend is expected to keep using the local analyzer. This
 * is intentional — it means this file can ship and be exercised end-to-end
 * (rate limiting, error handling, frontend fallback) before any API key,
 * billing decision, or extra dependency is introduced.
 *
 * NOT using `@vercel/node`'s `VercelRequest`/`VercelResponse` types here —
 * that package is not currently a project dependency (see CLAUDE.md: "don't
 * add dependencies beyond the stack without flagging"). The minimal local
 * types below cover the subset of the Node request/response shape Vercel
 * actually invokes this function with. Swapping to the real types later is a
 * one-line, zero-behavior-change upgrade once `@vercel/node` is approved as a
 * devDependency.
 */
import type { ReferenceAnalysis } from '../src/types/referenceAnalysis';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
}

interface AnalyzeRequestBody {
  /** Data URL (e.g. "data:image/png;base64,...") of the uploaded reference. */
  image?: unknown;
}

type AnalyzeSuccessResponse = {
  ok: true;
  analysis: Partial<ReferenceAnalysis>;
};

type AnalyzeErrorResponse = {
  ok: false;
  reason: 'method_not_allowed' | 'invalid_request' | 'rate_limited' | 'not_configured' | 'provider_error';
  message: string;
};

// ---------------------------------------------------------------------------
// Rate limiting (scaffold — NOT durable across instances; see warning below)
// ---------------------------------------------------------------------------

/**
 * ⚠️ KNOWN LIMITATION, READ BEFORE RELYING ON THIS IN PRODUCTION:
 *
 * Vercel serverless functions are stateless and may run on many concurrent
 * instances, each with its own copy of this module-level Map. This in-memory
 * limiter only bounds traffic *within a single warm instance* — it does NOT
 * give you a real global or per-IP cap across the deployment. It's enough to
 * (a) stop a single runaway client loop in dev/preview, and (b) prove the
 * request/response contract the frontend already codes against.
 *
 * For a real cap once a provider is wired up, replace this with a shared
 * store — Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`) or Vercel
 * KV are the standard pairing for this exact use case. That's a new
 * dependency, so it should be a deliberate, flagged decision — not bundled
 * silently into the provider integration. See docs/ai-analysis.md.
 */
const PER_IP_LIMIT = 10;
const PER_IP_WINDOW_MS = 60_000;
const GLOBAL_DAILY_LIMIT = 500;
const GLOBAL_WINDOW_MS = 24 * 60 * 60 * 1000;

const ipRequestLog = new Map<string, number[]>();
let globalRequestLog: number[] = [];

function pruneAndCount(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  globalRequestLog = pruneAndCount(globalRequestLog, GLOBAL_WINDOW_MS, now);
  if (globalRequestLog.length >= GLOBAL_DAILY_LIMIT) {
    return true;
  }

  const existing = pruneAndCount(ipRequestLog.get(ip) ?? [], PER_IP_WINDOW_MS, now);
  if (existing.length >= PER_IP_LIMIT) {
    ipRequestLog.set(ip, existing);
    return true;
  }

  existing.push(now);
  globalRequestLog.push(now);
  ipRequestLog.set(ip, existing);
  return false;
}

function resolveClientIp(req: ApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() ?? 'unknown';
}

// ---------------------------------------------------------------------------
// Provider call — NOT IMPLEMENTED. This is the one piece the next increment adds.
// ---------------------------------------------------------------------------

/**
 * Fill this in once a provider + API key decision is made. It should:
 *
 * 1. Take the image data URL and ask a vision-capable model to return JSON
 *    matching (a subset of) `ReferenceAnalysis` from
 *    src/types/referenceAnalysis.ts — heroComposition, mediaEmphasis,
 *    layoutPattern, sectionCount, ctaStyle, visualNotes.
 * 2. Use structured output / a JSON schema response format so the result is
 *    guaranteed parseable — do not free-text parse a model's prose.
 * 3. Read the API key from an environment variable (e.g. `ANTHROPIC_API_KEY`
 *    or `GEMINI_API_KEY`), set in the Vercel project's environment settings
 *    — never hardcoded, never sent to the client.
 * 4. Use a small/cheap model — this is a simple classification task, not a
 *    reasoning task (e.g. Claude Haiku, Gemini Flash, or gpt-4o-mini).
 * 5. Apply a short request timeout (a few seconds) so a slow provider call
 *    can't hold the serverless function open indefinitely.
 *
 * See docs/ai-analysis.md for the full provider comparison and the prepaid
 * spend-cap recommendation that should accompany turning this on.
 */
async function callVisionProvider(_imageDataUrl: string): Promise<Partial<ReferenceAnalysis>> {
  throw new Error('AI_PROVIDER_NOT_CONFIGURED');
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024; // ~8MB of base64 text

function parseRequestBody(body: unknown): { image: string } | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { image } = body as AnalyzeRequestBody;
  if (typeof image !== 'string' || !image.startsWith('data:image/') || image.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return null;
  }

  return { image };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    respond(res, 405, { ok: false, reason: 'method_not_allowed', message: 'Use POST.' });
    return;
  }

  const clientIp = resolveClientIp(req);
  if (isRateLimited(clientIp)) {
    respond(res, 429, {
      ok: false,
      reason: 'rate_limited',
      message: 'Too many AI analysis requests right now. Falling back to local analysis is recommended.',
    });
    return;
  }

  const parsedBody = parseRequestBody(req.body);
  if (!parsedBody) {
    respond(res, 400, {
      ok: false,
      reason: 'invalid_request',
      message: 'Expected a JSON body with an "image" data URL.',
    });
    return;
  }

  try {
    const analysis = await callVisionProvider(parsedBody.image);
    const success: AnalyzeSuccessResponse = { ok: true, analysis };
    respond(res, 200, success);
  } catch (error) {
    if (error instanceof Error && error.message === 'AI_PROVIDER_NOT_CONFIGURED') {
      respond(res, 501, {
        ok: false,
        reason: 'not_configured',
        message: 'AI analysis is not configured yet. Use the local (free, no-LLM) analyzer instead.',
      });
      return;
    }

    respond(res, 502, {
      ok: false,
      reason: 'provider_error',
      message: 'The AI analysis provider failed. Falling back to local analysis is recommended.',
    });
  }
}

function respond(res: ApiResponse, status: number, payload: AnalyzeSuccessResponse | AnalyzeErrorResponse): void {
  res.status(status).json(payload);
}
