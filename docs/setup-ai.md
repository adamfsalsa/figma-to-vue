# Turning On the AI Tier — Step-by-Step Pass-Off

This is the exact, click-by-click checklist to switch on "Enhance with AI". Until
all of it is done, the app runs on the free local analyzer and the AI button
returns "not configured" (which is the safe default — nothing is broken).

You need accounts on three services: **Anthropic** (the model), **Upstash**
(rate-limit store), and **Vercel** (where the app is hosted). Budget ~15 minutes.

**The hard spend ceiling is the prepaid balance you load in Step 1 with
auto-reload OFF.** You cannot be charged more than that.

---

## Step 1 — Anthropic API key + $5 spend cap

1. Go to **https://console.anthropic.com** and sign in (or create an account).
2. **Add a prepaid balance, capped:**
   - Open **Settings → Billing** (or **Plans & Billing**).
   - Click **Add credits** / **Add funds**. Enter **$5**. Complete the purchase.
   - **Turn OFF auto-reload / auto-recharge.** Look for a toggle named "Auto
     reload", "Automatically purchase credits", or similar — make sure it is
     **disabled**. This is the single most important setting: it is what
     guarantees you can never spend more than the $5 you just loaded.
3. **Set a usage limit (belt-and-suspenders):**
   - Open **Settings → Limits** (or **Usage limits**).
   - Set a **monthly spend limit of $5** (or lower). Save.
4. **Create the API key:**
   - Open **Settings → API keys**.
   - Click **Create key**. Name it something like `figma-to-vue`.
   - **Copy the key now** — it starts with `sk-ant-...` and is shown **only
     once**. Paste it somewhere safe temporarily (you'll put it in Vercel in
     Step 3). Do **not** commit it to git or paste it into the app.

When the $5 is used up, AI requests simply start failing and the app falls back
to the free local analyzer. You will not be charged beyond the $5.

---

## Step 2 — Upstash Redis (rate-limit store, free)

The proxy refuses to call the paid model unless a shared rate-limit store is
configured — this stops the budget being burned in one burst. Upstash's free
tier is plenty.

1. Go to **https://console.upstash.com** and sign in (or sign up — GitHub login
   works).
2. Click **Create Database**.
   - **Name:** `figma-to-vue` (anything).
   - **Type / Primary Region:** pick the region closest to you. Defaults are fine.
   - Leave the rest as default and **Create**.
3. Open the new database. Find the **REST API** section (sometimes labeled
   "REST" or "Connect → REST API").
4. Copy these **two** values (keep them with the Anthropic key for Step 3):
   - **`UPSTASH_REDIS_REST_URL`** — looks like `https://xxxx.upstash.io`
   - **`UPSTASH_REDIS_REST_TOKEN`** — a long token string

> If you'd rather not use Upstash, Vercel KV works identically — create a KV
> store in the Vercel dashboard and it exposes the same two REST values. Use
> whichever you prefer; the variable **names** in Step 3 stay the same.

---

## Step 3 — Add the three variables to Vercel, then redeploy

1. Go to **https://vercel.com** → your **figma-to-vue** project.
2. Open **Settings → Environment Variables**.
3. Add **three** variables (Name on the left, the value you copied on the right).
   For each, set the environment to **Production** (and Preview/Development too
   if you want them active there):

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | the `sk-ant-...` key from Step 1 |
   | `UPSTASH_REDIS_REST_URL` | the `https://...upstash.io` URL from Step 2 |
   | `UPSTASH_REDIS_REST_TOKEN` | the token from Step 2 |

   Type each **Name** exactly as written above — they are case-sensitive and
   must match precisely. Click **Save** after each.
4. **Redeploy so the new variables take effect:**
   - Go to the **Deployments** tab.
   - Open the most recent **Production** deployment → the **⋯** menu → **Redeploy**.
   - (Env-var changes only apply to deployments created *after* they're saved, so
     a redeploy is required.)

---

## Step 4 — Smoke test (confirm it's live)

1. Open your live site.
2. Upload any image (a screenshot, a sketch — anything).
3. Click **Enhance with AI**.
4. You should see a success message like *"AI analysis and page copy applied"* —
   **that first successful click is the proof the integration is live.** Then
   click **Preview page** to see the generated result.

If instead you see "AI analysis is not configured" or "unavailable":
- Double-check all three variable **names** are spelled exactly right in Vercel.
- Confirm you **redeployed** after adding them.
- Confirm the Upstash URL and token are from the **REST** section (not the
  redis:// connection string).

---

## What it costs once on

The AI step uses **Claude Sonnet** and now does more than classify — it reads
the image and **generates the page copy** (headline, sections, etc.). That uses
more tokens than the old classify-only step, so:

- Roughly **$0.02–0.05 per "Enhance with AI" generation** (varies with image and
  output length).
- Your **$5 ≈ 100–250 generations**, then it falls back to the free local path.
- The per-IP (10/min) and global (500/day) rate limits in `api/analyze.ts` keep
  any single visitor from draining it quickly.

To change the model or limits, see `api/analyze.ts` and `docs/ai-analysis.md`.

---

## Quick reference — the three variables

```
ANTHROPIC_API_KEY=sk-ant-...
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

Set in **Vercel → Settings → Environment Variables**, then **redeploy**. Never
commit these to git (`.env` is already git-ignored; `.env.example` shows the
names only).
