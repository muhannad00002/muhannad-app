# Zaffa — Payments Integration Guide

Zaffa's Premium subscription (kept **under US$3 / month**) can be collected two
ways, each wired through a small backend so that **no secret ever touches the
browser or the app bundle**:

| Where the user is | Provider | Why |
|-------------------|----------|-----|
| Native **iOS** app | **Apple In-App Purchase** (StoreKit) | Apple requires IAP for digital goods |
| **Web / Android / PWA** | **Bank Muscat SmartPay** (hosted redirect) | Card payments via the bank gateway |
| Offline / hosted demo | **Demo** | Simulated unlock so the standalone HTML works |

The client picks the provider automatically (`paymentProvider()` in
`app/parts/08-payments.js`). With `PAY_CONFIG.backendBase` blank, the app stays
in **demo** mode; set it to your deployed backend URL to go live.

```
┌────────────┐   session    ┌──────────────┐   redirect    ┌─────────────────┐
│  Zaffa app │ ───────────▶ │  Zaffa backend│ ───────────▶ │ Bank Muscat page │
│ (browser)  │ ◀─────────── │ (holds secrets)│ ◀─────────── │  (SmartPay)      │
└────────────┘  encResponse └──────────────┘   callback     └─────────────────┘
```

---

## 1. Bank Muscat SmartPay (web)

Reference: *SmartPay Application — Merchant Integration Guide v1.8* (Bank Hosted
integration). Implemented in `server/smartpay.js` and verified by `server/test.js`.

**Credentials** (from your onboarding email — keep server-side only):

| Env var | Meaning |
|---------|---------|
| `SMARTPAY_MERCHANT_ID` | numeric merchant id |
| `SMARTPAY_ACCESS_CODE` | static access token, posted as `access_code` |
| `SMARTPAY_WORKING_KEY` | 32-char AES key used for `encRequest` / `encResponse` |
| `SMARTPAY_TXN_URL` | hosted transaction URL given at onboarding |
| `PUBLIC_BASE_URL` | your backend's public URL (builds redirect/cancel URLs) |
| `APP_RETURN_URL` | where to bounce the browser back into the app |

**Crypto** (per appendix 11.1): AES-256/GCM/NoPadding, random 16-byte IV,
16-byte tag, `encRequest = HEX(IV) + HEX(CIPHER+TAG)`. Working key bytes are the
AES key. Decryption reads the first 32 hex chars as the IV. `server/smartpay.js`
matches this exactly (`node server/test.js` proves the round-trip and rejects
tampered ciphertext).

**Flow**

1. App → `POST /api/payments/smartpay/session {planId,userId,name,email}`.
2. Backend builds the request string
   (`merchant_id, order_id, amount, currency=OMR, redirect_url, cancel_url,
   billing_name, merchant_param1=planId, merchant_param2=userId`), AES-encrypts
   it, and returns `{action, fields:{access_code, encRequest}, orderId}`.
3. App auto-submits a hidden POST form to `action` → the Bank-hosted page opens.
4. After payment SmartPay POSTs `order_id` + `encResponse` to
   `/api/payments/smartpay/callback`. The backend decrypts, checks
   `order_status === "Success"` (and you should re-check the amount), records the
   subscription, and 302-redirects the browser to
   `…/index.html#/premium/return?status=success&plan=…`.
5. `/premium/return` (in the app) confirms Premium.

**Go-live checklist**
- Move from the UAT `SMARTPAY_TXN_URL` to the production URL.
- Re-validate `amount` and `order_id` server-side against the order you created.
- Persist orders/subscriptions in a real database (replace the JSON-file store).
- Log every `encRequest`/`encResponse` with timestamps (guide §2.2e).
- Enforce a 30-minute session validity and idempotent, non-duplicate requests.

---

## 2. Apple In-App Purchase (iOS)

Digital subscriptions on iOS must use StoreKit. Steps:

1. **App Store Connect** → create two auto-renewable subscriptions:
   - `com.zaffa.premium.monthly` (≈ $2.99/mo)
   - `com.zaffa.premium.annual` (≈ $23.99/yr)
   Create an **app-specific shared secret** and set it as `APPLE_SHARED_SECRET`.
2. **Wrap the app with Capacitor** (config already in `wedding/capacitor.config.json`):
   ```sh
   cd wedding
   npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/ios
   npx cap add ios
   npx cap copy
   npx cap open ios      # build & sign in Xcode
   ```
   Chromium/Playwright are only for local testing; the shipped app is the
   Capacitor iOS build.
3. **Add a StoreKit bridge** the web layer can call. The client expects either a
   Capacitor IAP plugin or a `window.ZaffaIAP` object:
   ```js
   // window.ZaffaIAP.purchase({productId}) -> resolves { jws } (StoreKit 2)
   //                                                  or { receipt } (StoreKit 1)
   ```
   A minimal Swift plugin calls `Product.purchase()` and returns the verified
   `Transaction`'s JWS (`verificationResult.jwsRepresentation`).
4. **Verify server-side**: the app posts the proof to
   `POST /api/payments/apple/verify {jws|receipt,userId,planId}`. `server/apple.js`
   validates it (StoreKit 2 JWS payload, or legacy `verifyReceipt` with the
   production→sandbox fallback) and grants the entitlement.
   > Before production, verify the JWS **signature chain** against Apple's root
   > CA (use Apple's *App Store Server Library*). The provided decoder is a
   > starting point, not full signature verification.
5. Handle renewals/refunds via **App Store Server Notifications v2** pointed at a
   webhook that updates the subscription store.

---

## 3. Running the backend

```sh
cd wedding/server
cp .env.example .env      # fill in real credentials (never commit .env)
node server.js            # http://localhost:8787
node test.js              # SmartPay round-trip self-test (10 checks)
```

Endpoints: `/api/payments/status`, `/api/payments/smartpay/session`,
`/api/payments/smartpay/callback`, `/api/payments/apple/verify`,
`/api/subscription/:userId`.

Deploy it anywhere that runs Node (or port the handlers to serverless
functions), then set `PAY_CONFIG.backendBase` in `app/parts/08-payments.js` to
its public URL and rebuild (`node app/build.js`).

---

## Security notes
- Secrets (`SMARTPAY_WORKING_KEY`, `APPLE_SHARED_SECRET`) live only on the server.
- Never grant Premium from the client's word — always verify server-side
  (SmartPay `order_status`, Apple receipt/JWS).
- Re-validate amount, currency and order ownership on every callback.
- Use HTTPS/TLS 1.2+ end-to-end; store subscription state in a real database.
