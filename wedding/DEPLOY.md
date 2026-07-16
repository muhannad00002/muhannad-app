# Deploying Zaffa — the complete beginner guide

Zaffa has two halves, and each lives in a different place:

| Part | What it is | Where it runs | Status |
|------|-----------|---------------|--------|
| **The app** (`wedding/app/`) | What brides & the admin see | GitHub Pages (free) | ✅ already live |
| **The backend** (`wedding/server/`) | Accounts, database, payments | Render (free tier) | one click — below |

The app already works without the backend (demo mode). Deploying the backend
turns on: real customer accounts, a shared vendor database managed by the
admin, and real Bank Muscat payments.

---

## Deploy the backend (about 5 minutes, no coding)

1. **Open this link:**
   👉 https://render.com/deploy?repo=https://github.com/muhannad00002/muhannad-app
2. **Sign in with your GitHub account** (the same one that owns this repo).
   Creating the Render account is free — no credit card needed.
3. Render reads `render.yaml` from the repo and shows a plan:
   *zaffa-backend* (web service) + *zaffa-db* (PostgreSQL database).
   Before clicking **Apply**, it asks for the values marked "sync: false":
   - `SMARTPAY_MERCHANT_ID` → your MID (e.g. `249`)
   - `SMARTPAY_ACCESS_CODE` → from Bank Muscat
   - `SMARTPAY_WORKING_KEY` → from Bank Muscat
   - `ADMIN_EMAIL` → **your** email — this becomes the admin login
   - `ADMIN_PASSWORD` → choose a strong password (this is how you'll sign in
     to publish vendors)
   - `APPLE_SHARED_SECRET` → leave empty for now
4. Click **Apply** and wait ~3 minutes. When it turns green, copy the
   service URL — it looks like `https://zaffa-backend.onrender.com`.
5. **Tell Claude the URL** (or see "Connecting the app" below). That's it.

> Free-tier note: the backend "sleeps" after 15 idle minutes and takes
> ~30 seconds to wake on the first request. Upgrading the service to the
> $7/month plan removes this. The free PostgreSQL database expires after
> 90 days — upgrade it (about $7/month) before then for production use.

## Connecting the app to the backend

The app looks for the backend URL in `PAY_CONFIG.backendBase`
(`wedding/app/parts/08-payments.js`). Set it to your Render URL, run
`node wedding/app/build.js`, commit, and merge to `main` — GitHub Pages
redeploys automatically.

(For a quick test without rebuilding: open the live app, and in the browser
console run `localStorage.setItem("zaffa.backend","https://YOUR-URL.onrender.com"); location.reload()`.)

---

## How production data works after this

**Customer registration** — brides tap *Profile → Sign in with WhatsApp*,
enter their **name, age, city and phone number**, and confirm a 6-digit code
sent to their WhatsApp. No passwords. Accounts are stored in PostgreSQL and a
bride's Premium subscription is tied to her account, so it works on any
device she signs into. (Codes are stored only as hashes, expire in 5 minutes,
and are rate-limited: 60s between sends, 5 sends/hour, 5 attempts/code.)

**Turning WhatsApp sending on** — the OTP is delivered through Meta's free
WhatsApp Business Cloud API. One-time setup (~20 minutes):
1. Go to https://developers.facebook.com → create an app → add the
   **WhatsApp** product. Meta gives you a business phone number (or connect
   your own).
2. In *WhatsApp → API Setup*, copy the **Phone number ID** and create a
   **permanent access token** (System User token with `whatsapp_business_messaging`).
3. In *Message Templates*, create an **Authentication** template named
   `otp_code` (language: English) with the copy-code button — Meta approves
   these within minutes.
4. Paste into Render → zaffa-backend → Environment:
   `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` (template name `otp_code` is
   already configured). Save — Render restarts the service and sign-ups go live.

Until those two values are set, the app shows "WhatsApp sign-in isn't
available yet" on sign-up attempts. For local testing without Meta, set
`OTP_DEBUG=true` in `wedding/server/.env` — the code is returned to the app
and shown on screen instead of being sent.

**Admin sign-in** stays email + password (the `ADMIN_EMAIL` / `ADMIN_PASSWORD`
you set on Render) — admin accounts are seeded, never self-registered.

**Vendors & categories** — the admin manages everything inside the app's
admin dashboard exactly as before, then taps
*Admin → More → Publish catalog to cloud* (signing in with the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` from step 3). Publishing writes the whole
catalog to the database; every user's app loads it automatically on launch.

**Payments** — when a bride pays through Bank Muscat, the bank's callback
hits the backend, which verifies the encrypted response and marks her
account Premium in the database. The app then confirms against the server —
the client's word is never trusted.

**The database itself** — a managed PostgreSQL on Render (daily backups on
paid plans). To browse it: Render dashboard → zaffa-db → *Connect* shows
credentials for any Postgres client (e.g. TablePlus, pgAdmin). Everything is
stored in one `kv` table with JSON values: `user:<email>`, `sub:<userId>`,
`order:<orderId>`, `catalog:<collection>`.

## Verifying Bank Muscat credentials

Once deployed, open `https://YOUR-URL.onrender.com/api/payments/smartpay/testpage`
and click the button. If the credentials pair with the production gateway,
the Bank Muscat payment page opens (abandon it — nothing is charged).
If not, the page shows the exact gateway error to report to the bank.

## Adding Apple In-App Purchase later

Create the two subscriptions in App Store Connect, generate the
app-specific shared secret, paste it into Render → zaffa-backend →
Environment → `APPLE_SHARED_SECRET`. Details: [INTEGRATION.md](INTEGRATION.md).
