# coby-booking

The scheduling backend for `coby.lk/chat`. A single Cloudflare Worker that reads
your Google Calendar free/busy, shows open slots, and creates events (with a
Google Meet link for virtual meetings) so Google emails the invite. The booking
UI lives in the Quartz site (`quartz/components/ChatBooking.tsx` +
`scripts/booking.inline.ts`), bound to this Worker at `/api/book/*` on the same
origin.

```
coby.lk/chat            → Quartz page (UI), served by Cloudflare Pages
coby.lk/api/book/*      → this Worker
   └─ Google Calendar REST API (freeBusy + events.insert)
```

## What you edit

- **Halls, campus spots, durations, windows, notice** — `src/config.ts`. The
  frontend fetches the public slice via `GET /api/book/config`, so both sides
  stay in sync. This is the only file you normally touch.

## One-time setup

### 1. Google Cloud / OAuth

1. Create a project at <https://console.cloud.google.com> and enable the
   **Google Calendar API**.
2. **OAuth consent screen**: User type "External", publishing status "Testing".
   Add `cobylkassner@gmail.com` as a Test user. (Testing-mode refresh tokens for
   your own account do not expire from the 7-day rule when you are a listed test
   user; if a token ever stops working, re-run step 4.)
3. **Credentials → Create OAuth client ID → Web application.** Under *Authorized
   redirect URIs* add exactly:
   ```
   http://localhost:5858/callback
   ```
   Copy the Client ID and Client secret.
4. Get a refresh token:
   ```bash
   npm install
   cp .dev.vars.example .dev.vars   # fill in GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
   npm run get-refresh-token        # opens a consent URL; approve; token prints
   ```
   Paste the printed refresh token into `.dev.vars` as `GOOGLE_REFRESH_TOKEN`.

### 2. Turnstile (bot protection)

1. Cloudflare dashboard → **Turnstile → Add widget**. Allowed hostnames:
   `coby.lk`, `cobylk.io`, `localhost`. Copy the **site key** and **secret key**.
2. Put the **site key** in `quartz/components/ChatBooking.tsx`
   (`TURNSTILE_SITE_KEY`, currently the always-passes test key).
3. The **secret key** becomes the Worker secret `TURNSTILE_SECRET` (below).
   (Leaving it unset locally bypasses the captcha in dev.)

### 3. KV namespace

```bash
npx wrangler kv namespace create BOOKING_KV
```
Put the returned `id` into `wrangler.jsonc` (`kv_namespaces[0].id`).

## Local development

```bash
npm install
# .dev.vars holds GOOGLE_* (and optionally TURNSTILE_SECRET)
npm run dev          # wrangler dev on http://localhost:8787
```
The frontend auto-targets `http://localhost:8787` when served from `localhost`,
so in another terminal run the site from the repo root:
```bash
npx quartz build --serve   # http://localhost:8080  → open /chat
```

Smoke-test the API directly:
```bash
curl 'http://localhost:8787/api/book/config'
curl 'http://localhost:8787/api/book/availability?type=virtual&date=2026-07-02'
```

## Deploy

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put TURNSTILE_SECRET
npm run typegen      # regenerate Env types from wrangler.jsonc (optional)
npm run deploy
```
The `routes` in `wrangler.jsonc` bind this Worker to `/api/book/*` on both
`coby.lk` and `cobylk.io`; Cloudflare Pages keeps serving everything else. Then
push the Quartz changes so Pages rebuilds `/chat`, and book a real test slot.

## Notes

- `Env` in `src/index.ts` is hand-written so the project type-checks before
  `wrangler types` runs; keep it in sync with `wrangler.jsonc`, or run
  `npm run typegen` and switch to the generated global.
- Rate limit: `RATE_LIMIT_PER_HOUR` per IP (`src/index.ts`), backed by KV.
- The POST handler re-checks free/busy immediately before insert, which both
  validates the slot and closes the last-moment double-book race.
