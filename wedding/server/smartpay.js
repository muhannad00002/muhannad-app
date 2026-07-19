/* ============================================================================
   Bank Muscat SmartPay — server-side integration (Bank Hosted redirect flow)
   ----------------------------------------------------------------------------
   Implements the exact contract from the SmartPay Merchant Integration Guide
   (v1.8): AES-256/GCM/NoPadding, 16-byte IV, 16-byte tag,
   encRequest = HEX(IV) + HEX(CIPHER+TAG); the same scheme decrypts encResponse.

   The Working Key, Access Code and Merchant ID are SECRET and must live only
   here on the server — never ship them to the browser or the mobile app.

   Onboarding credentials (set as environment variables):
     SMARTPAY_MERCHANT_ID   numeric merchant id
     SMARTPAY_ACCESS_CODE   static access token
     SMARTPAY_WORKING_KEY   32-char alphanumeric AES key
     SMARTPAY_TXN_URL       hosted transaction URL given at onboarding
                            (e.g. https://spayuatmars.bmtest.om/.../transaction)
     PUBLIC_BASE_URL        your server's public base (for redirect/cancel URLs)
     APP_RETURN_URL         where to bounce the browser back into the app
   ============================================================================ */
const crypto = require("crypto");

const CFG = {
  merchantId: process.env.SMARTPAY_MERCHANT_ID || "",
  accessCode: process.env.SMARTPAY_ACCESS_CODE || "",
  workingKey: process.env.SMARTPAY_WORKING_KEY || "",
  txnUrl:     process.env.SMARTPAY_TXN_URL     || "https://smartpaytrns.bankmuscat.com/transaction.do?command=initiateTransaction",
  publicBase: process.env.PUBLIC_BASE_URL      || "http://localhost:8787",
  appReturn:  process.env.APP_RETURN_URL       || "http://localhost:8742/index.html",
  currency:   process.env.SMARTPAY_CURRENCY    || "OMR",
};

/* Apply admin-managed config (from the DB) over the env defaults. Only
   non-empty fields override, so clearing a box in the admin panel won't wipe
   a value that's set via environment. */
function setConfig(o = {}) {
  ["merchantId", "accessCode", "workingKey", "txnUrl", "currency"].forEach(k => {
    if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== "") CFG[k] = String(o[k]).trim();
  });
}
/* Safe view for the admin UI — never returns the full working key. */
function publicConfig() {
  const mask = (s) => (s ? "•".repeat(Math.max(0, s.length - 4)) + s.slice(-4) : "");
  return {
    merchantId: CFG.merchantId,
    accessCode: CFG.accessCode,
    workingKeyMasked: mask(CFG.workingKey),
    workingKeySet: !!CFG.workingKey,
    txnUrl: CFG.txnUrl,
    currency: CFG.currency,
    configured: isConfiguredNow(),
  };
}
function isConfiguredNow() {
  return !!(CFG.merchantId && CFG.workingKey && CFG.accessCode && CFG.txnUrl);
}

/* ---- AES-256-GCM per SmartPay appendix 11.1 ---- */
function encrypt(plain, workingKey = CFG.workingKey) {
  const key = Buffer.from(workingKey, "utf8");            // 32 chars => AES-256
  const iv  = crypto.randomBytes(16);
  const c   = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const ct  = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  // official kit emits lowercase hex: hex(nonce) + hex(cipher + tag)
  return iv.toString("hex") + Buffer.concat([ct, tag]).toString("hex");
}
function decrypt(encHex, workingKey = CFG.workingKey) {
  const key = Buffer.from(workingKey, "utf8");
  const buf = Buffer.from(encHex, "hex");
  const iv  = buf.subarray(0, 16);
  const tag = buf.subarray(buf.length - 16);
  const ct  = buf.subarray(16, buf.length - 16);
  const d   = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

/* ---- request/response string helpers (key=value&key=value) ---- */
function toRequestString(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`)             // SmartPay uses raw key=value pairs
    .join("&");
}
function parseResponseString(str) {
  const out = {};
  str.split("&").forEach(pair => {
    const i = pair.indexOf("=");
    if (i > -1) out[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1));
  });
  return out;
}

/* Plans → price (kept under US$3 / month). Amounts are in OMR (NUMERIC 10,3). */
const PLANS = {
  monthly: { amount: "1.150", label: "Zaffa Premium — Monthly" },   // ≈ $2.99
  annual:  { amount: "9.200", label: "Zaffa Premium — Annual"  },   // ≈ $23.9 / yr
};

/* ---- Build the auto-submitting redirect form for the Bank-hosted page ---- */
function createSession({ planId, orderId, customer = {} }) {
  if (!CFG.merchantId || !CFG.workingKey || !CFG.accessCode || !CFG.txnUrl)
    throw new Error("SmartPay is not configured — set SMARTPAY_* environment variables.");
  const plan = PLANS[planId];
  if (!plan) throw new Error("Unknown plan: " + planId);

  const req = {
    merchant_id:  CFG.merchantId,
    order_id:     orderId,
    currency:     CFG.currency,
    amount:       plan.amount,
    redirect_url: `${CFG.publicBase}/api/payments/smartpay/callback`,
    cancel_url:   `${CFG.publicBase}/api/payments/smartpay/callback`,
    language:     "EN",
    billing_name:  customer.name  || "",
    billing_email: customer.email || "",
    merchant_param1: planId,
    merchant_param2: customer.userId || "",
  };
  // kit builds the string with a trailing '&'
  const encRequest = encrypt(toRequestString(req) + "&");
  return {
    action: CFG.txnUrl,
    fields: { access_code: CFG.accessCode, encRequest },
    orderId,
  };
}

/* ---- Handle the encrypted response posted back by SmartPay ---- */
function handleCallback(body) {
  const encResponse = body.encResponse || body.encResp || "";
  if (!encResponse) return { ok: false, reason: "missing encResponse" };
  let data;
  try { data = parseResponseString(decrypt(encResponse)); }
  catch (e) { return { ok: false, reason: "decrypt_failed" }; }

  const status = (data.order_status || "").toLowerCase();
  const success = status === "success";
  return {
    ok: success,
    status: data.order_status,
    orderId: data.order_id,
    trackingId: data.tracking_id,
    bankRef: data.bank_ref_no,
    amount: data.amount,
    planId: data.merchant_param1,
    userId: data.merchant_param2,
    failureMessage: data.failure_message || data.status_message,
    raw: data,
  };
}

module.exports = {
  CFG, PLANS, encrypt, decrypt, toRequestString, parseResponseString,
  createSession, handleCallback, setConfig, publicConfig,
  isConfigured: isConfiguredNow,
};
