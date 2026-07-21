# RoomScan

Camera-ready, responsive web app that turns a couple of room photos into an editable appliance
inventory and a monthly electricity bill estimate, using Google's Gemini vision model.

## What it does

- Upload or take up to 3 photos of a room (`+ Add` in the hero card).
- Gemini identifies electrical/electronic appliances in the photos and estimates a wattage range
  for each — images are downscaled server-side before being sent to Gemini to keep this fast and
  cheap without meaningfully hurting detection accuracy.
- Every detected item (name, category, watts, hours/day) is fully editable, and you can add or
  remove items manually.
- Pick a tariff/state (Tamil Nadu, Karnataka, Maharashtra, Delhi, or a custom ₹/unit + fixed
  charge) and the monthly bill estimate — plus a per-appliance cost breakdown — recalculates live.
- Export the inventory + bill breakdown as a CSV, and your inventory is saved in the browser
  (`localStorage`) so a page refresh doesn't lose your data. "Reset" clears it back to the demo
  state.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` in any modern desktop or mobile browser.

Add `GEMINI_API_KEY` to `.env.local` to enable photo detection (get one free at
https://aistudio.google.com/apikey). Never commit or share `.env.local` — it's already excluded
via `.gitignore`.

In development, rate limiting and the Upstash variables are not required (there's an in-memory
fallback). They're required once `NODE_ENV=production` — see hosting below.

## Production build

```bash
npm run build
npm start
```

## Security notes

- The Gemini API key is only ever used server-side (`app/api/detect/route.ts`, `runtime = "nodejs"`)
  and is never sent to the browser.
- Uploaded photos are validated for type/size (image/*, ≤10MB, ≤3 per scan) before being sent
  anywhere.
- The API route checks the request's `Origin` header against `APP_URL` in production, so another
  site can't quietly call your Gemini quota from a hidden background request.
- Rate limiting is enforced per-IP (5 scans/minute) via Upstash Redis in production, since a
  serverless function's in-memory state doesn't persist reliably across invocations. **Without
  Upstash configured, the API deliberately fails closed in production rather than allowing
  unlimited requests against your Gemini billing** — see the hosting steps below.
- Basic hardening headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  a restrictive `Permissions-Policy`) are set in `next.config.js`, and the `X-Powered-By` header
  is disabled.
- Dependencies are pinned to patched versions (Next.js 14.2.35, which fixes the React Server
  Components CVEs disclosed in Dec 2025) — run `npm audit` periodically and re-run
  `npm install next@latest` within the 14.x line if a new advisory appears.

## Host it for free (Vercel + Upstash)

Vercel is the natural fit since it's built by the Next.js team and has a generous free ("Hobby")
tier with no credit card required.

1. **Push this project to GitHub** (a new empty repo is fine):
   ```bash
   git init && git add . && git commit -m "RoomScan"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. **Create a free Upstash Redis database** (needed for rate limiting in production):
   go to https://upstash.com → sign up free → *Create Database* → pick a nearby region → open the
   database → copy the **REST URL** and **REST Token** shown on its dashboard.
3. **Import the repo into Vercel**: go to https://vercel.com → sign up free (can use your GitHub
   login) → *Add New → Project* → select your repo. Vercel auto-detects Next.js — no build
   configuration needed.
4. **Before deploying**, add these Environment Variables in the Vercel project settings:
   - `GEMINI_API_KEY` — your Gemini key
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — from step 2
   - `APP_URL` — you won't know your final `*.vercel.app` URL until after the first deploy, so put
     a placeholder for now (e.g. `https://placeholder.vercel.app`)
5. **Deploy.** Once it's live, copy the actual assigned URL (e.g.
   `https://roomscan-yourname.vercel.app`), go back into the project's Environment Variables, fix
   `APP_URL` to that exact URL, and redeploy (Vercel → Deployments → ⋯ → Redeploy) so the origin
   check picks it up. If you attach a custom domain later (Vercel's free tier supports this),
   update `APP_URL` again the same way.
6. **Try a scan** on the live URL to confirm everything's wired up.

Notes on the free tier:
- Vercel's Hobby plan restricts serverless functions to personal/non-commercial use and caps
  function execution time (historically ~10s by default, more with Fluid Compute — check
  Vercel's current docs at https://vercel.com/docs/functions/limitations, since these limits do
  change). A scan that needs a retry due to a transient Gemini overload can occasionally take
  longer than a few seconds; if you see timeouts under load, that's the likely cause.
- `sharp` (used for image downscaling) needs no special hosting configuration — Vercel supports it
  natively (it's the same library `next/image` uses internally).
- Google's Gemini API free tier has its own separate request-per-minute/day limits — check your
  usage at https://aistudio.google.com/apikey if scans start failing under real traffic.
- Nothing here needs a database. `supabase/schema.sql` is unused scaffolding for a possible future
  "saved scans + login" feature — the app works fully today without any Supabase setup.
# RoomScan
