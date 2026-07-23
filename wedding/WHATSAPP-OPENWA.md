# WhatsApp OTP via OpenWA

The app can send sign-up OTP codes through **OpenWA**
(https://github.com/rmyndharis/OpenWA) — a self-hosted WhatsApp gateway that
links a normal WhatsApp number by QR code, so you don't need Meta's official
Business API or template approval.

## How it fits together
```
  App ──▶ Wedding & Co backend ──▶ OpenWA gateway ──▶ WhatsApp ──▶ customer's phone
           (Vercel / Render)        (always-on host)
```
Our backend just makes one HTTP call to OpenWA to send the code
(`server/whatsapp.js`). Everything else (linking the number, keeping the
session alive) happens inside OpenWA.

## ⚠️ Two things to know first
1. **OpenWA needs an always-on host** — it keeps a live WhatsApp session
   (a headless Chromium or socket) and **cannot run on Vercel's serverless
   functions**. Run it on a small VPS, Railway, Render (as a Docker/web
   service), or your own server. Our backend can stay on Vercel and simply
   call OpenWA's URL.
2. **Unofficial gateways carry a ban risk.** Reverse-engineered WhatsApp
   access is against WhatsApp's Terms; use a **dedicated number** you're
   willing to risk, warm it up gradually, and keep OTP volume reasonable.
   (The official Meta Cloud API path is still available — set the `WHATSAPP_*`
   vars instead — if you prefer zero ban risk.)

## Set up OpenWA (once)
1. On your always-on host:
   ```sh
   git clone https://github.com/rmyndharis/OpenWA.git
   cd OpenWA
   docker compose -f docker-compose.dev.yml up -d      # serves on port 2785
   ```
   Put it behind HTTPS (a domain/reverse proxy) so the backend can reach it,
   e.g. `https://wa.yourdomain.com`.
2. Open the OpenWA dashboard → **create a session** (e.g. `wedco`) → **start**
   it → **scan the QR** with the WhatsApp number you'll send codes from.
3. In the dashboard, **create an API key**.

## Connect it to Wedding & Co
Set these environment variables on the backend (Vercel/Render) and redeploy:

| Variable | Value |
|----------|-------|
| `OPENWA_URL` | your gateway base, e.g. `https://wa.yourdomain.com` |
| `OPENWA_API_KEY` | the X-API-Key from the OpenWA dashboard |
| `OPENWA_SESSION` | the session id you started (e.g. `wedco`) |
| `OTP_BRAND` | (optional) name shown in the message — defaults to `Wedding & Co` |

That's it — sign-ups now send a real code to the customer's WhatsApp. Verify
`/api/payments/status` shows `"whatsapp": true`.

## What the customer receives
> **Wedding & Co: your verification code is 482913**
> It expires in 5 minutes. Do not share this code with anyone.

## What I need from you to finish this
1. **Where OpenWA will be hosted** (a URL I can point the backend at) — or tell
   me you want help choosing/standing up a host.
2. Once it's running: **`OPENWA_URL`, `OPENWA_API_KEY`, `OPENWA_SESSION`** — add
   them to the backend env (I can't scan the QR or read your dashboard; that's
   your WhatsApp number and account).
3. The WhatsApp **number** you'll dedicate to sending codes (just so you've set
   one aside — you link it by QR, you don't share it with me).
