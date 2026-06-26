/**
 * Vercel serverless function: AI-assisted reference analysis.
 *
 * This is the optional Tier 2 of the hybrid analyzer. Tier 1 — real, free,
 * no-key color/luminance extraction — runs entirely in the browser
 * (src/utils/colorExtraction.ts) and always works. This endpoint adds the
 * semantic fields pixel math cannot reach (hero composition, layout pattern,
 * CTA style) by asking a vision-capable model. See docs/ai-analysis.md.
 *
 * KEY SAFETY: the model API key lives only as a server-side environment
 * variable (ANTHROPIC_API_KEY) and never reaches the browser — that is the
 * entire reason this proxy exists.
 *
 * BUDGET SAFETY: this endpoint is reachable by anyone with the deployed link,
 * so it refuses to call the (billable) model unless BOTH are configured:
 *   1. ANTHROPIC_API_KEY                          — the provider key
 *   2. UPSTASH_REDIS_REST_URL + _TOKEN            — the durable rate-limit store
 * If the rate-limit store is missing it responds `not_configured` rather than
 * exposing an uncapped billable endpoint. The true spend ceiling is still the
 * prepaid balance on the API account (load $5, auto-reload OFF) — the rate
 * limiter only stops that balance being burned in a single burst. See
 * docs/ai-analysis.md → "Guaranteeing you never exceed $5".
 *
 * NOT using `@vercel/node`'s request/response types — that package is not a
 * project dependency. The minimal local types below cover the subset Vercel
 * invokes this function with; swapping to the real types later is a zero-
 * behavior-change upgrade once `@vercel/node` is approved as a devDependency.
 */
import Anthropic from '@anthropic-ai/sdk';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type {
  CtaStyle,
  HeroComposition,
  LayoutPattern,
  MediaEmphasis,
  ReferenceAnalysis,
} from '../src/types/referenceAnalysis';

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
  /** Data URL (e.g. "data:image/png;base64,...") of the (downscaled) reference. */
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
// Allowed values — must stay in sync with src/types/referenceAnalysis.ts.
// The model output is validated against these; anything off-list is dropped.
// ---------------------------------------------------------------------------

const CTA_STYLES: readonly CtaStyle[] = ['Button-led', 'Text-link', 'Form-first', 'None visible'];
const HERO_COMPOSITIONS: readonly HeroComposition[] = [
  'Text left, media right',
  'Media left, text right',
  'Centered hero',
  'Full-bleed media',
];
const LAYOUT_PATTERNS: readonly LayoutPattern[] = [
  'Single hero',
  'Hero plus feature cards',
  'Dashboard grid',
  'Product finder flow',
];
const MEDIA_EMPHASES: readonly MediaEmphasis[] = ['Decorative', 'Supporting', 'Primary', 'Immersive'];

// ---------------------------------------------------------------------------
// Durable rate limiting (Upstash Redis — shared across all serverless instances)
// ---------------------------------------------------------------------------

const PER_IP_LIMIT = 10; // requests per minute, per client IP
const GLOBAL_DAILY_LIMIT = 500; // requests per day, across the whole deployment

interface Limiters {
  ip: Ratelimit;
  global: Ratelimit;
}

let cachedLimiters: Limiters | null = null;

/**
 * Returns the Upstash-backed limiters, or null if the store is not configured.
 * Null is treated as "refuse to serve the billable endpoint" upstream — we do
 * not silently fall back to an in-memory limiter, because that would not be a
 * real cap across instances.
 */
function getLimiters(): Limiters | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!cachedLimiters) {
    const redis = Redis.fromEnv();
    cachedLimiters = {
      ip: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(PER_IP_LIMIT, '60 s'),
        prefix: 'figma2vue:ip',
      }),
      global: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(GLOBAL_DAILY_LIMIT, '86400 s'),
        prefix: 'figma2vue:global',
      }),
    };
  }

  return cachedLimiters;
}

function resolveClientIp(req: ApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() ?? 'unknown';
}

// ---------------------------------------------------------------------------
// Provider call — claude-haiku-4-5 vision → validated Partial<ReferenceAnalysis>
// ---------------------------------------------------------------------------

const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const ANALYSIS_SYSTEM_PROMPT = [
  'You analyze a single design reference image (a screenshot or exported frame)',
  'and return structured observations about its layout. Respond with a JSON',
  'object ONLY — no prose, no markdown fences. Use exactly these keys and pick',
  'values only from the allowed lists:',
  '',
  `- "heroComposition": one of ${JSON.stringify(HERO_COMPOSITIONS)}`,
  `- "mediaEmphasis": one of ${JSON.stringify(MEDIA_EMPHASES)}`,
  `- "layoutPattern": one of ${JSON.stringify(LAYOUT_PATTERNS)}`,
  '- "sectionCount": an integer from 1 to 6 (distinct content sections you see)',
  `- "ctaStyle": one of ${JSON.stringify(CTA_STYLES)}`,
  '- "visualNotes": one short sentence of plain-text translation guidance',
].join('\n');

function parseImageDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) {
    return null;
  }
  return { mediaType: match[1], data: match[2] };
}

function sanitizeAnalysis(raw: unknown): Partial<ReferenceAnalysis> {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  const candidate = raw as Record<string, unknown>;
  const result: Partial<ReferenceAnalysis> = {};

  if (typeof candidate.heroComposition === 'string' && HERO_COMPOSITIONS.includes(candidate.heroComposition as HeroComposition)) {
    result.heroComposition = candidate.heroComposition as HeroComposition;
  }
  if (typeof candidate.mediaEmphasis === 'string' && MEDIA_EMPHASES.includes(candidate.mediaEmphasis as MediaEmphasis)) {
    result.mediaEmphasis = candidate.mediaEmphasis as MediaEmphasis;
  }
  if (typeof candidate.layoutPattern === 'string' && LAYOUT_PATTERNS.includes(candidate.layoutPattern as LayoutPattern)) {
    result.layoutPattern = candidate.layoutPattern as LayoutPattern;
  }
  if (typeof candidate.ctaStyle === 'string' && CTA_STYLES.includes(candidate.ctaStyle as CtaStyle)) {
    result.ctaStyle = candidate.ctaStyle as CtaStyle;
  }
  if (typeof candidate.sectionCount === 'number' && Number.isFinite(candidate.sectionCount)) {
    result.sectionCount = Math.min(6, Math.max(1, Math.round(candidate.sectionCount)));
  }
  if (typeof candidate.visualNotes === 'string') {
    result.visualNotes = candidate.visualNotes.trim().slice(0, 400);
  }

  return result;
}

function extractJsonText(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callVisionProvider(imageDataUrl: string): Promise<Partial<ReferenceAnalysis>> {
  const parsed = parseImageDataUrl(imageDataUrl);
  if (!parsed || !SUPPORTED_MEDIA_TYPES.has(parsed.mediaType)) {
    throw new Error('UNSUPPORTED_IMAGE');
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: parsed.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: parsed.data,
            },
          },
          { type: 'text', text: 'Analyze this reference image and return the JSON described in the system prompt.' },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
  if (!textBlock) {
    return {};
  }

  return sanitizeAnalysis(extractJsonText(textBlock.text));
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

  if (!process.env.ANTHROPIC_API_KEY) {
    respond(res, 501, {
      ok: false,
      reason: 'not_configured',
      message: 'AI analysis is not configured (no provider key). Use the local (free, no-LLM) analyzer instead.',
    });
    return;
  }

  const limiters = getLimiters();
  if (!limiters) {
    respond(res, 501, {
      ok: false,
      reason: 'not_configured',
      message:
        'AI analysis is disabled because no durable rate-limit store is configured. Refusing to expose a billable endpoint without a cap.',
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
    const [globalResult, ipResult] = await Promise.all([
      limiters.global.limit('global'),
      limiters.ip.limit(resolveClientIp(req)),
    ]);

    if (!globalResult.success || !ipResult.success) {
      respond(res, 429, {
        ok: false,
        reason: 'rate_limited',
        message: 'Too many AI analysis requests right now. The free local analyzer is still available.',
      });
      return;
    }
  } catch {
    // If the rate-limit store itself is unreachable, fail closed: do not call
    // the billable model without a working cap.
    respond(res, 503, {
      ok: false,
      reason: 'rate_limited',
      message: 'Rate-limit store is unavailable. Skipping AI analysis; the free local analyzer is still available.',
    });
    return;
  }

  try {
    const analysis = await callVisionProvider(parsedBody.image);
    const success: AnalyzeSuccessResponse = { ok: true, analysis };
    respond(res, 200, success);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNSUPPORTED_IMAGE') {
      respond(res, 400, {
        ok: false,
        reason: 'invalid_request',
        message: 'Unsupported image format. Expected PNG, JPEG, GIF, or WebP.',
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
