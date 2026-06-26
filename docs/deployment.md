# Deployment

The target hosted demo is a single-page Vite build deployed through Vercel.

## Vercel Settings

- Framework preset: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

The repository includes `vercel.json` so those defaults are explicit and reviewable.

## Serverless Function & Routing

`api/analyze.ts` is auto-detected by Vercel as a Node serverless function at
`/api/analyze`. Its runtime dependencies (`@anthropic-ai/sdk`, `@upstash/*`)
are in `package.json` so Vercel installs them during the build.

The SPA fallback rewrite in `vercel.json` uses a negative lookahead
(`/((?!api/).*)`) so `/api/*` requests reach the function instead of being
rewritten to `index.html`. After the first deploy, confirm `/api/analyze`
returns JSON (a `not_configured` response until the env vars below are set),
not the SPA HTML.

## Environment Variables (optional AI tier)

The app deploys and runs fully on the free local analyzer with no environment
variables. To enable the optional "Enhance with AI" tier, set these in the
Vercel project (Settings → Environment Variables) — see `.env.example` and
`docs/ai-analysis.md` for the full operator checklist, including the prepaid
$5 spend cap:

- `ANTHROPIC_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Without all of these, `/api/analyze` returns `not_configured` and the app
falls back to the local analyzer — the safe default.

## Pipeline Role

Deployment is the final keystone after frontend implementation and Git review. The deployed URL should become the portfolio-facing final product for this case study.
