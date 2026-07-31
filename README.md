# tiktok-id-gate

Serverless blocklist backend for the 1dleryu extension. The extension reads
the TikTok account that's currently signed into `tiktok.com` in the user's
browser and asks this API "is this account allowed to use the extension?".
If you block an ID here, that install of the extension shows a full block
screen and stays disabled for that account.

## How it works

```
tiktok.com tab (content script)
   -> detects logged-in userId/username
   -> sends it to the extension's background service worker
        -> background calls GET /api/check-user?userId=...&username=...
             -> this repo, backed by Vercel KV
        -> result cached, popup shows/hides the block overlay accordingly
```

Blocking is keyed primarily by TikTok's **numeric user_id**, since usernames
(@handles) can be changed by the account owner at any time. A username index
is kept too, as a fallback for the rare case only a handle is on hand.

## 1. Deploy

1. Push this folder to a new GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import that repo.
3. In the project, go to **Storage -> Create Database -> KV** and connect it
   to this project. Vercel injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`
   automatically — nothing to copy by hand.
4. Go to **Settings -> Environment Variables** and add:
   - `ADMIN_SECRET` — a long random string, e.g. generate one with
     `openssl rand -hex 32`. This protects the admin endpoints.
5. Deploy. Your API base URL will be something like:
   `https://tiktok-id-gate.vercel.app`

## 2. Point the extension at it

In the extension repo:
- `manifest.json` → `host_permissions`: replace the placeholder
  `https://tiktok-id-gate.vercel.app/*` with your real deployed URL.
- `background.js` → `CHECK_URL` constant: same replacement.

Reload the unpacked extension (or ship a new version) after changing these.

## 3. Block / unblock an account

Every admin call needs the header `x-admin-secret: <your ADMIN_SECRET>`.

**Find the numeric TikTok user ID first.** Handles can change, so look the
target account's numeric ID up with one of these (paste the profile URL or
@handle in):
- https://commentpicker.com/tiktok-id.php
- https://findidfb.com/find-tiktok-id/
- https://fameswap.com/tool-tiktok-user-id

**Block:**
```bash
curl -X POST https://tiktok-id-gate.vercel.app/api/admin/block \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"userId":"7123456789012345678","username":"someHandle","reason":"ToS violation"}'
```

**Unblock:**
```bash
curl -X POST https://tiktok-id-gate.vercel.app/api/admin/unblock \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"userId":"7123456789012345678"}'
```

**List everyone currently blocked:**
```bash
curl https://tiktok-id-gate.vercel.app/api/admin/list \
  -H "x-admin-secret: YOUR_ADMIN_SECRET"
```

## 4. Check-user endpoint (what the extension calls)

```
GET /api/check-user?userId=7123456789012345678&username=someHandle
```
```json
{ "allowed": false, "blocked": true, "message": "This TikTok account has been restricted from using this extension." }
```

This endpoint fails **open**: if KV isn't configured yet or errors out, it
returns `allowed: true` so a broken deploy never locks out every user.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in ADMIN_SECRET
npx vercel dev
```
