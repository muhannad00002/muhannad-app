/* ============================================================================
   Apple In-App Purchase — server-side receipt / transaction verification.
   ----------------------------------------------------------------------------
   The iOS app buys a product via StoreKit and sends the signed transaction
   (StoreKit 2 JWS) or the base64 receipt (StoreKit 1) here to be verified
   before Premium is granted. Never trust the client's word alone.

   Product IDs (configure the same in App Store Connect):
     com.zaffa.premium.monthly   (auto-renewable, ≈ $2.99/mo)
     com.zaffa.premium.annual    (auto-renewable, ≈ $23.99/yr)

   Env:
     APPLE_BUNDLE_ID            e.g. com.zaffa.app
     APPLE_SHARED_SECRET        App-specific shared secret (App Store Connect)
     APPLE_ENVIRONMENT          "sandbox" | "production" (StoreKit 1 fallback)
   ============================================================================ */
const https = require("https");

const PRODUCTS = {
  "com.zaffa.premium.monthly": { plan: "monthly" },
  "com.zaffa.premium.annual":  { plan: "annual"  },
};

/* --- StoreKit 1: verifyReceipt (legacy but still widely used) --- */
function post(host, path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({ host, path, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } },
      res => { let b = ""; res.on("data", c => b += c); res.on("end", () => {
        try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); });
    req.on("error", reject); req.write(data); req.end();
  });
}

async function verifyReceipt(receiptBase64) {
  const payload = {
    "receipt-data": receiptBase64,
    password: process.env.APPLE_SHARED_SECRET || "",
    "exclude-old-transactions": true,
  };
  // Always try production first; status 21007 => it's a sandbox receipt, retry.
  let r = await post("buy.itunes.apple.com", "/verifyReceipt", payload);
  if (r.status === 21007) r = await post("sandbox.itunes.apple.com", "/verifyReceipt", payload);
  if (r.status !== 0) return { ok: false, status: r.status };

  const items = (r.latest_receipt_info || r.receipt?.in_app || []);
  const now = Date.now();
  const active = items.filter(i => {
    const exp = Number(i.expires_date_ms || 0);
    return PRODUCTS[i.product_id] && (!exp || exp > now);
  });
  if (!active.length) return { ok: false, reason: "no_active_subscription" };
  const latest = active.sort((a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms))[0];
  return {
    ok: true,
    productId: latest.product_id,
    plan: PRODUCTS[latest.product_id].plan,
    expiresAt: Number(latest.expires_date_ms) || null,
    originalTransactionId: latest.original_transaction_id,
  };
}

/* --- StoreKit 2: verify a signed JWS transaction ---
   For production, verify the JWS signature chain against Apple's root CA and
   check bundleId/environment using Apple's App Store Server Library. Here we
   decode the payload defensively; swap in full signature verification before
   going live (see INTEGRATION.md). */
function decodeJWSPayload(jws) {
  const parts = String(jws).split(".");
  if (parts.length !== 3) throw new Error("bad_jws");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}
function verifyTransactionJWS(jws) {
  const p = decodeJWSPayload(jws);
  const prod = PRODUCTS[p.productId];
  const bundleOk = !process.env.APPLE_BUNDLE_ID || p.bundleId === process.env.APPLE_BUNDLE_ID;
  const notExpired = !p.expiresDate || p.expiresDate > Date.now();
  const ok = !!prod && bundleOk && notExpired;
  return { ok, plan: prod?.plan, productId: p.productId, expiresAt: p.expiresDate || null,
    originalTransactionId: p.originalTransactionId, reason: ok ? undefined : "invalid_transaction" };
}

module.exports = { PRODUCTS, verifyReceipt, verifyTransactionJWS, decodeJWSPayload };
