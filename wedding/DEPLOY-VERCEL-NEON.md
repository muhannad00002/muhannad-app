# Deploy Wedding & Co on Neon + Vercel

One project on Vercel hosts **both** the app (static `index.html` / `admin.html`)
and the API (serverless functions under `/api`), backed by a **Neon** Postgres
database. No separate backend host, and every push to `main` auto-deploys.

```
  Browser ──▶ https://your-app.vercel.app         (static: index.html, admin.html)
           └▶ https://your-app.vercel.app/api/*   (serverless: server/server.js)
                                        └▶ Neon Postgres (DATABASE_URL)
```

## 1. Create the Neon database (2 min)
1. Sign up at **https://neon.tech** (free tier is fine) → **New Project**.
2. Copy the **connection string** (looks like
   `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`).
   That's your `DATABASE_URL`. The app auto-creates its table on first run.

## 2. Deploy on Vercel (5 min)
1. Sign up at **https://vercel.com** with your GitHub account → **Add New Project**
   → import **muhannad00002/muhannad-app**.
2. Set **Root Directory** to `wedding` (Edit → select the `wedding` folder).
   Vercel reads `wedding/vercel.json` — build `node app/build.js`, static from
   `app/`, functions from `api/`.
3. Add **Environment Variables** (Settings → Environment Variables):

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | your Neon connection string |
   | `AUTH_SECRET` | any long random string |
   | `ADMIN_EMAIL` | your admin login email |
   | `ADMIN_PASSWORD` | a strong admin password |
   | `SMARTPAY_MERCHANT_ID` | `249` |
   | `SMARTPAY_ACCESS_CODE` | your Bank Muscat access code |
   | `SMARTPAY_WORKING_KEY` | your Bank Muscat working key |
   | `SMARTPAY_TXN_URL` | `https://smartpaytrns.bankmuscat.com/transaction.do?command=initiateTransaction` |
   | `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` | from Meta (for OTP sign-up) |

   `PUBLIC_BASE_URL` and `APP_RETURN_URL` are derived from `VERCEL_URL`
   automatically; set them explicitly only when you attach a custom domain.
4. **Deploy.** When it's green, open the URL:
   - App: `https://your-app.vercel.app`
   - Admin: `https://your-app.vercel.app/admin.html`
   - API health: `https://your-app.vercel.app/api/payments/status`

Because the app calls the API on the same origin, there's nothing else to wire —
`PAY_CONFIG.backendBase` is blank on purpose.

## 3. Everything is in SQL (Neon)
All data lives in Neon Postgres in a single `kv(key TEXT PRIMARY KEY, value
JSONB, updated_at TIMESTAMPTZ)` table (created automatically). Inspect it from
the Neon SQL editor:

```sql
-- customers (WhatsApp signups)
select value->>'name' as name, value->>'phone' as phone,
       value->>'governorate' as governorate, value->>'age' as age
from kv where key like 'user:%' and value->>'role' = 'bride';

-- vouchers and their status
select value->>'code' as code,
       case when value->>'redeemedBy' is null then 'available' else 'used' end as status,
       value->>'redeemedBy' as redeemed_by
from kv where key like 'voucher:%' order by (value->>'createdAt');

-- premium subscriptions
select key, value->>'plan' as plan, value->>'via' as via from kv where key like 'sub:%';

-- the published vendor catalog
select jsonb_array_length(value) as vendor_count from kv where key = 'catalog:vendors';
```

Prefer dedicated tables? The `kv` model keeps one deploy simple; the JSON is
first-class SQL (JSONB) so you can index or create views over it, e.g.
`create view users as select value->>'phone' phone, value->>'name' name,
value->>'governorate' gov from kv where key like 'user:%';`

## 4. Local development
```sh
cd wedding/server
cp .env.example .env         # add DATABASE_URL (Neon) or leave blank for a local JSON file
node server.js               # http://localhost:8787
node test.js                 # SmartPay self-test
```
Point the local app at it with
`localStorage.setItem("zaffa.backend","http://localhost:8787")` in the browser
console (only needed locally; on Vercel the API is same-origin).
