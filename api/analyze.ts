/**
 * Vercel serverless function: AI-assisted reference analysis.
 *
 * This is the optional Tier 2 of the hybrid analyzer. Tier 1 — real, free,
 * no-key color/luminance extraction — runs entirely in the browser
 * (src/utils/colorExtraction.ts) and always works. This endpoint adds the
 * semantic fields pixel math cannot reach (hero composition, layout pattern,
 * CTA style) by asking a vision-capable model. See docs/ai-analysis.md.
 *
 * IMAGE SOURCES: the reference can come from either path the app supports —
 * an uploaded file (sent as an "image" data URL, downscaled client-side) or a
 * Figma URL import (sent as an "imageUrl" pointing at the rendered preview
 * Figma returned via api/figma.ts). The imageUrl path is fetched server-side
 * (never by the browser) and is restricted to Figma's own preview hosts — see
 * isAllowedFigmaPreviewHost() — so this endpoint cannot be used as an open
 * SSRF proxy for arbitrary URLs.
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
import type { GeneratedContent } from '../src/types/pagePlan';
import type {
  ReconstructionElement,
  ReconstructionPlan,
  ReconstructionRegion,
  ReconstructionStyle,
  ReconstructionTag,
} from '../src/types/reconstructionPlan';

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
  /** Remote preview URL from a Figma import (see api/figma.ts). Fetched server-side. */
  imageUrl?: unknown;
}

type AnalyzeSuccessResponse = {
  ok: true;
  analysis: Partial<ReferenceAnalysis>;
  content?: GeneratedContent;
  /**
   * Validated spatial reconstruction plan inferred from the image, in the
   * same v2 schema the Figma path produces. Only structured data crosses this
   * boundary — the model never returns code, and every field is sanitized
   * against the schema before it reaches the renderer.
   */
  reconstruction?: ReconstructionPlan;
};

type AnalyzeErrorResponse = {
  ok: false;
  reason: 'method_not_allowed' | 'invalid_request' | 'rate_limited' | 'not_configured' | 'provider_error';
  message: string;
  /**
   * On a provider_error, the underlying Anthropic HTTP status (e.g. 401 = bad
   * key, 403 = no credit/model access, 404 = unknown model, 429 = rate limit)
   * and a sanitized snippet of the provider's own message. These never contain
   * the API key — they make a misconfigured key diagnosable from the response
   * instead of a generic 502.
   */
  providerStatus?: number;
  providerError?: string;
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
// Provider call — claude-sonnet-4-6 vision → validated analysis + generated content
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
  '',
  'ALSO generate the page copy under a "content" object so a premium one-page',
  'website can be built from it:',
  '- "content.kicker": a short eyebrow label (2-5 words)',
  '- "content.title": a punchy hero headline',
  '- "content.summary": one or two sentences of supporting subtext',
  '- "content.sections": an array of 2 to 4 objects, each {"title", "body"},',
  '  where body is one or two sentences',
  '',
  'Content rules:',
  '- If the reference clearly contains real text (a polished mockup or exported',
  '  Figma frame), READ and adapt that actual copy faithfully.',
  '- If the reference is vague (a rough sketch, scribbles, a wireframe), INVENT',
  '  coherent, plausible, premium copy that fits the apparent product and intent.',
  '- Always return complete, non-empty content. Never leave fields blank and',
  '  never refuse — produce the best premium page you can from whatever is shown.',
  '',
  'ALSO capture the page structure geometrically under a "reconstruction"',
  'object. Work in a fixed coordinate space 1440 units wide: mentally scale the',
  'design so its width is 1440, and give all positions/sizes in that space as',
  'GLOBAL page coordinates (relative to the top-left of the whole page, never',
  'to the parent region):',
  '- "reconstruction.pageHeight": total page height in that space (integer)',
  '- "reconstruction.regions": the visible layout regions in reading order.',
  '  Each region is {"name": short descriptive layer name, "element": one of',
  `  ${JSON.stringify(['section', 'group', 'card', 'text', 'media', 'button', 'link', 'input'])},`,
  '  "x", "y", "width", "height": integers, "confidence": 0 to 1 (how certain',
  '  you are about this region), and optionally: "text" (the visible copy for',
  '  text/button/link elements — read it faithfully), "background" ("#rrggbb"',
  '  fill if clearly visible), "color" ("#rrggbb" text color), "fontSize"',
  '  (integer, in the same 1440-wide space), "fontWeight" (400/500/600/700),',
  '  "children" (nested regions of the same shape, at most 2 levels deep).',
  '- Use at most 40 regions total. Cover the page top to bottom; regions may',
  '  overlap where the design overlaps.',
  '- Mark photographs/illustrations as "media"; mark clickable-looking pills or',
  '  filled rectangles with short labels as "button".',
  '- If the reference is too vague to place regions at all, omit',
  '  "reconstruction" entirely rather than inventing geometry.',
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

function sanitizeContent(raw: unknown): GeneratedContent | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }

  const candidate = raw as Record<string, unknown>;
  const content: GeneratedContent = {};

  if (typeof candidate.kicker === 'string' && candidate.kicker.trim()) {
    content.kicker = candidate.kicker.trim().slice(0, 80);
  }
  if (typeof candidate.title === 'string' && candidate.title.trim()) {
    content.title = candidate.title.trim().slice(0, 160);
  }
  if (typeof candidate.summary === 'string' && candidate.summary.trim()) {
    content.summary = candidate.summary.trim().slice(0, 400);
  }
  if (Array.isArray(candidate.sections)) {
    const sections = candidate.sections
      .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
      .map((entry) => ({
        title: typeof entry.title === 'string' ? entry.title.trim().slice(0, 120) : '',
        body: typeof entry.body === 'string' ? entry.body.trim().slice(0, 400) : '',
      }))
      .filter((entry) => entry.title || entry.body)
      .slice(0, 4);
    if (sections.length > 0) {
      content.sections = sections;
    }
  }

  return Object.keys(content).length > 0 ? content : undefined;
}

// ---------------------------------------------------------------------------
// Image → reconstruction-plan sanitizer
//
// The model proposes a region tree; nothing it returns is trusted. Every
// field is validated/clamped here into the same reconstruction-plan v2 schema
// the Figma path produces, so the downstream renderer contract is identical
// for both intake paths. Exported for unit tests (tests/analyzeReconstruction
// .test.ts), matching the isAllowedFigmaPreviewHost precedent.
// ---------------------------------------------------------------------------

const RECONSTRUCTION_ELEMENTS: readonly ReconstructionElement[] = [
  'section',
  'group',
  'card',
  'text',
  'media',
  'button',
  'link',
  'input',
];
const IMAGE_PLAN_WIDTH = 1440;
const MAX_IMAGE_PAGE_HEIGHT = 40_000;
const MAX_IMAGE_REGIONS = 48;
const MAX_IMAGE_REGION_DEPTH = 3; // page root + two authored levels

interface ImageRegionContext {
  headingCount: number;
  index: number;
  remaining: number;
}

export function sanitizeReconstruction(
  raw: unknown,
  referenceName = 'Uploaded reference',
): ReconstructionPlan | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const candidate = raw as Record<string, unknown>;
  const pageHeight = clampNumber(candidate.pageHeight, 200, MAX_IMAGE_PAGE_HEIGHT);
  if (pageHeight === undefined || !Array.isArray(candidate.regions)) return undefined;

  const context: ImageRegionContext = { headingCount: 0, index: 0, remaining: MAX_IMAGE_REGIONS };
  const children: ReconstructionRegion[] = [];
  for (const entry of candidate.regions) {
    if (context.remaining <= 0) break;
    const region = sanitizeImageRegion(entry, context, 1, pageHeight);
    if (region) children.push(region);
  }
  if (children.length === 0) return undefined;

  const reviewRequired: string[] = [];
  let confidenceSum = 0;
  let confidenceCount = 0;
  (function walk(regions: ReconstructionRegion[]): void {
    for (const region of regions) {
      confidenceSum += region.evidence.confidence;
      confidenceCount += 1;
      // Media has no source asset to materialize from a flat image, and
      // low-confidence guesses need human review before they are trusted.
      if (region.element === 'media' || region.evidence.confidence < 0.5) {
        reviewRequired.push(region.id);
      }
      walk(region.children);
    }
  })(children);
  const overall = Math.round((confidenceSum / confidenceCount) * 100) / 100;

  return {
    schemaVersion: 'figma-to-vue.reconstruction-plan.v2',
    source: { kind: 'image', name: referenceName.slice(0, 160) },
    viewport: { width: IMAGE_PLAN_WIDTH, height: pageHeight },
    regions: [
      {
        id: 'image-page',
        name: 'Page',
        element: 'page',
        tag: 'main',
        bounds: { x: 0, y: 0, width: IMAGE_PLAN_WIDTH, height: pageHeight },
        layout: { mode: 'free' },
        evidence: { source: 'image', confidence: overall },
        children,
        metadata: { sourceType: 'IMAGE_INFERENCE' },
      },
    ],
    confidence: { overall, reviewRequired },
    overrides: {},
  };
}

function sanitizeImageRegion(
  entry: unknown,
  context: ImageRegionContext,
  depth: number,
  pageHeight: number,
): ReconstructionRegion | undefined {
  if (typeof entry !== 'object' || entry === null) return undefined;
  const candidate = entry as Record<string, unknown>;

  const x = clampNumber(candidate.x, 0, IMAGE_PLAN_WIDTH);
  const y = clampNumber(candidate.y, 0, pageHeight);
  const width = clampNumber(candidate.width, 1, IMAGE_PLAN_WIDTH);
  const height = clampNumber(candidate.height, 1, pageHeight);
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return undefined;
  }

  context.remaining -= 1;
  context.index += 1;
  const id = `image-${context.index}`;
  const element: ReconstructionElement =
    typeof candidate.element === 'string'
    && RECONSTRUCTION_ELEMENTS.includes(candidate.element as ReconstructionElement)
      ? (candidate.element as ReconstructionElement)
      : 'group';

  const children: ReconstructionRegion[] = [];
  if (depth < MAX_IMAGE_REGION_DEPTH && element !== 'media' && Array.isArray(candidate.children)) {
    for (const childEntry of candidate.children) {
      if (context.remaining <= 0) break;
      const child = sanitizeImageRegion(childEntry, context, depth + 1, pageHeight);
      if (child) children.push(child);
    }
  }

  const text = typeof candidate.text === 'string' && candidate.text.trim()
    ? candidate.text.trim().slice(0, 600)
    : undefined;
  const fontSize = clampNumber(candidate.fontSize, 6, 200);
  const name = (typeof candidate.name === 'string' && candidate.name.trim()
    ? candidate.name.trim()
    : element
  ).slice(0, 120);
  const confidence = clampNumber(candidate.confidence, 0, 1) ?? 0.6;
  const tag = inferImageTag(element, fontSize, context);

  const style: ReconstructionStyle = {
    ...(hexColor(candidate.background) && element !== 'text'
      ? { background: hexColor(candidate.background) }
      : {}),
    ...(hexColor(candidate.color) ? { color: hexColor(candidate.color) } : {}),
    ...(fontSize !== undefined && ['text', 'button', 'link'].includes(element)
      ? { fontSize }
      : {}),
    ...(fontWeightValue(candidate.fontWeight) && ['text', 'button', 'link'].includes(element)
      ? { fontWeight: fontWeightValue(candidate.fontWeight) }
      : {}),
  };

  const region: ReconstructionRegion = {
    id,
    name,
    element,
    tag,
    evidence: { source: 'image', confidence },
    children,
    bounds: { x, y, width, height },
    ...(children.length > 0 ? { layout: { mode: 'free' as const } } : {}),
    ...(text && element === 'text' ? { text } : {}),
    ...(Object.keys(style).length > 0 ? { style } : {}),
    metadata: { sourceType: 'IMAGE_INFERENCE' },
  };

  if (element === 'button' || element === 'link') {
    region.control = { type: element, label: (text ?? name).slice(0, 160) };
    if (text && children.length === 0) region.text = text;
  }
  if (element === 'input') {
    region.control = {
      type: 'text',
      label: name.slice(0, 160),
      ...(text ? { placeholder: text.slice(0, 160) } : {}),
    };
  }
  if (element === 'media') {
    region.asset = {
      kind: 'image',
      sourceNodeId: region.id,
      url: null,
      alt: name,
      delivery: 'missing',
    };
  }

  return region;
}

function inferImageTag(
  element: ReconstructionElement,
  fontSize: number | undefined,
  context: ImageRegionContext,
): ReconstructionTag {
  if (element === 'button') return 'button';
  if (element === 'link') return 'a';
  if (element === 'input') return 'input';
  if (element === 'media') return 'img';
  if (element === 'section') return 'section';
  if (element === 'card') return 'article';
  if (element !== 'text') return 'div';
  if (fontSize !== undefined && fontSize >= 36) {
    context.headingCount += 1;
    return context.headingCount === 1 ? 'h1' : 'h2';
  }
  if (fontSize !== undefined && fontSize >= 22) return 'h2';
  return 'p';
}

function clampNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

function hexColor(value: unknown): string | undefined {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : undefined;
}

function fontWeightValue(value: unknown): number | undefined {
  return typeof value === 'number' && [300, 400, 500, 600, 700, 800].includes(value)
    ? value
    : undefined;
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

interface ProviderResult {
  analysis: Partial<ReferenceAnalysis>;
  content?: GeneratedContent;
  reconstruction?: ReconstructionPlan;
}

async function callVisionProvider(imageDataUrl: string): Promise<ProviderResult> {
  const parsed = parseImageDataUrl(imageDataUrl);
  if (!parsed || !SUPPORTED_MEDIA_TYPES.has(parsed.mediaType)) {
    throw new Error('UNSUPPORTED_IMAGE');
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    // Enough headroom for analysis + copy + a ~40-region reconstruction tree.
    max_tokens: 4096,
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
    return { analysis: {} };
  }

  const parsedJson = extractJsonText(textBlock.text);
  const record = typeof parsedJson === 'object' && parsedJson !== null
    ? (parsedJson as Record<string, unknown>)
    : undefined;

  return {
    analysis: sanitizeAnalysis(parsedJson),
    content: sanitizeContent(record?.content),
    reconstruction: sanitizeReconstruction(record?.reconstruction),
  };
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024; // ~8MB of base64 text
const MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024; // ~8MB of raw image bytes
const REMOTE_FETCH_TIMEOUT_MS = 10_000;

type ImageSource = { image: string } | { imageUrl: string };

/**
 * SSRF guard for the imageUrl path: only Figma's own preview/CDN hosts are
 * fetchable. Figma's file API and image-render API both return URLs under
 * figma.com subdomains (e.g. s3-alpha-sig.figma.com); nothing else is allowed.
 * Exported so the allowlist logic is unit-testable without exercising the
 * full handler (see tests/analyzeImageSource.test.ts).
 */
export function isAllowedFigmaPreviewHost(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  return parsed.hostname === 'figma.com' || parsed.hostname.endsWith('.figma.com');
}

function parseRequestBody(body: unknown): ImageSource | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { image, imageUrl } = body as AnalyzeRequestBody;

  if (typeof image === 'string') {
    if (!image.startsWith('data:image/') || image.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return null;
    }
    return { image };
  }

  if (typeof imageUrl === 'string') {
    if (imageUrl.length > 2000 || !isAllowedFigmaPreviewHost(imageUrl)) {
      return null;
    }
    return { imageUrl };
  }

  return null;
}

/**
 * Fetches a Figma-hosted preview image server-side (the browser never sees or
 * makes this request) and converts it to the same "data:<type>;base64,..."
 * shape the upload path already produces, so callVisionProvider() needs no
 * change. Throws on timeout, non-2xx, a non-image response, or an oversized
 * body — callers treat any throw as an invalid request.
 */
async function fetchRemoteImageAsDataUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error('REMOTE_IMAGE_FETCH_FAILED');
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      throw new Error('REMOTE_IMAGE_NOT_AN_IMAGE');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_REMOTE_IMAGE_BYTES) {
      throw new Error('REMOTE_IMAGE_TOO_LARGE');
    }

    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } finally {
    clearTimeout(timeout);
  }
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
      message: 'Expected a JSON body with an "image" data URL or a Figma "imageUrl".',
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

  let imageDataUrl: string;
  if ('image' in parsedBody) {
    imageDataUrl = parsedBody.image;
  } else {
    try {
      imageDataUrl = await fetchRemoteImageAsDataUrl(parsedBody.imageUrl);
    } catch {
      respond(res, 400, {
        ok: false,
        reason: 'invalid_request',
        message: 'Could not fetch the reference image from the provided Figma preview URL.',
      });
      return;
    }
  }

  try {
    const { analysis, content, reconstruction } = await callVisionProvider(imageDataUrl);
    const success: AnalyzeSuccessResponse = { ok: true, analysis, content, reconstruction };
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

    // Surface the underlying provider failure so a misconfigured key, missing
    // credit, or unknown model is diagnosable from the response. The Anthropic
    // SDK throws errors carrying an HTTP `status` and a `message`; neither
    // contains the API key.
    const providerStatus = typeof (error as { status?: unknown })?.status === 'number'
      ? (error as { status: number }).status
      : undefined;
    const providerError = error instanceof Error ? error.message.slice(0, 300) : undefined;

    respond(res, 502, {
      ok: false,
      reason: 'provider_error',
      message: 'The AI analysis provider failed. Falling back to local analysis is recommended.',
      providerStatus,
      providerError,
    });
  }
}

function respond(res: ApiResponse, status: number, payload: AnalyzeSuccessResponse | AnalyzeErrorResponse): void {
  res.status(status).json(payload);
}
