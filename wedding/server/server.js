/* ============================================================================
   Zaffa backend — accounts, catalog, subscriptions, payments.

   Storage: PostgreSQL when DATABASE_URL is set (production), JSON file locally.
   Auth:    email/password (scrypt) with HMAC bearer tokens — see auth.js.
   Payments: Bank Muscat SmartPay (hosted redirect) + Apple IAP verification.

   Run:  node wedding/server/server.js     (reads wedding/server/.env if present)
   ============================================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// tiny .env loader (no dependency) — must run BEFORE requiring the provider
// modules, which snapshot their configuration from process.env at load time.
(function loadEnv() {
  const p = path.join(__dirname, ".env");
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, "utf8").split("\n").forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
})();
// Derive the public base from the host platform when not set explicitly.
if (!process.env.PUBLIC_BASE_URL && process.env.RENDER_EXTERNAL_URL)
  process.env.PUBLIC_BASE_URL = process.env.RENDER_EXTERNAL_URL;
if (!process.env.PUBLIC_BASE_URL && process.env.VERCEL_URL)
  process.env.PUBLIC_BASE_URL = "https://" + process.env.VERCEL_URL;
// On Vercel the app and API share one origin, so the SmartPay redirect can
// return the browser straight back to the app on the same domain.
if (!process.env.APP_RETURN_URL && process.env.VERCEL_URL)
  process.env.APP_RETURN_URL = "https://" + process.env.VERCEL_URL + "/index.html";

const smartpay = require("./smartpay");
const apple = require("./apple");
const db = require("./db");
const auth = require("./auth");
const assistant = require("./assistant");

const PORT = process.env.PORT || 8787;
const APP_RETURN = process.env.APP_RETURN_URL || "http://localhost:8742/index.html";

/* voucher codes: WED-XXXX-XXXX using unambiguous characters */
function genVoucherCode() {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1
  const pick = (n) => Array.from({ length: n }, () => alpha[crypto.randomInt(alpha.length)]).join("");
  return "WED-" + pick(4) + "-" + pick(4);
}

/* Payment order reference: strictly alphanumeric, <= 16 chars (Bank Muscat
   SmartPay requires the order id to be alphanumeric with no special
   characters). A base36 timestamp keeps it short and time-ordered, plus a
   random suffix for uniqueness within the same millisecond. */
function genOrderId(prefix = "WC") {
  const t = Date.now().toString(36);                       // ~8 chars, alphanumeric
  const rand = crypto.randomBytes(8).toString("hex");      // hex = alphanumeric
  return (prefix + t + rand).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);
}

/* ---- subscriptions & orders (persisted) ---- */
async function grantPremium(userId, plan, meta = {}) {
  await db.set("sub:" + (userId || "anon"),
    { plan: "premium", tier: plan, since: Date.now(), ...meta });
}
async function getSubscription(userId) {
  return (await db.get("sub:" + userId)) || { plan: "free" };
}

/* ---- helpers ---- */
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" }); res.end(JSON.stringify(obj)); };
// Read the request body with a hard size cap so a malicious client can't
// exhaust memory. 8 MB comfortably covers image-bearing catalog/vendor saves.
const MAX_BODY = 8 * 1024 * 1024;
function body(req) {
  return new Promise((resolve, reject) => {
    let b = "", size = 0, aborted = false;
    req.on("data", c => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY) { aborted = true; req.destroy(); return reject(new Error("payload_too_large")); }
      b += c;
    });
    req.on("end", () => { if (!aborted) resolve(b); });
    req.on("error", reject);
  });
}
function parseBody(raw, ctype = "") {
  if (ctype.includes("application/json")) { try { return JSON.parse(raw || "{}"); } catch { return {}; } }
  return Object.fromEntries(new URLSearchParams(raw)); // form-urlencoded (SmartPay callback)
}

// one-time init (shared by the local server and the Vercel serverless handler)
let _ready;
function ready() {
  if (!_ready) _ready = (async () => {
    await db.init();
    await auth.init();
    await auth.seedAdmin();
    const spCfg = await db.get("config:smartpay");
    if (spCfg) smartpay.setConfig(spCfg);
  })().catch((e) => {
    // Never cache a failed init — otherwise one transient DB hiccup on a cold
    // start poisons this function instance forever. Clear it so the next
    // request retries a fresh connection.
    _ready = null;
    throw e;
  });
  return _ready;
}

/* ---- lightweight in-memory rate limiter (per instance) ---- */
const _rl = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const rec = _rl.get(key) || { n: 0, reset: now + windowMs };
  if (now > rec.reset) { rec.n = 0; rec.reset = now + windowMs; }
  rec.n++; _rl.set(key, rec);
  if (_rl.size > 5000) { for (const [k, v] of _rl) if (now > v.reset) _rl.delete(k); } // cheap GC
  return rec.n <= max;
}
function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    (req.socket && req.socket.remoteAddress) || "unknown";
}

async function handle(req, res) {
  try {
    await ready();                   // idempotent; makes the handler serverless-safe
  } catch (e) {
    // Init (usually the DB) is unavailable. Return a clean 503 instead of
    // letting the rejection bubble up as FUNCTION_INVOCATION_FAILED.
    console.error("backend init failed:", (e && e.message) || e);
    return json(res, 503, { error: "backend_unavailable" });
  }
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  if (req.method === "OPTIONS") return json(res, 204, {});

  try {
    /* ---------- friendly root page (humans land here) ---------- */
    if ((p === "/" || p === "/health") && req.method === "GET") {
      if (p === "/health") return json(res, 200, { ok: true });
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wedding &amp; Co backend</title>
<body style="font-family:-apple-system,sans-serif;background:#F4F3F1;color:#2B2B2D;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="text-align:center;padding:40px;max-width:420px">
  <div style="font-size:52px">💍</div>
  <h1 style="font-family:Georgia,serif;margin:10px 0 6px">Wedding &amp; Co backend</h1>
  <p style="color:#7A6A6E">The server is running. This address hosts the API for the
  <a href="${APP_RETURN}" style="color:#B9932F">Wedding &amp; Co app</a> — there's nothing to browse here.</p>
  <p style="font-size:13px;color:#A9989C">Status: <a href="/api/payments/status" style="color:#B9932F">/api/payments/status</a></p>
</div></body>`);
    }

    /* ---------- health & provider status ---------- */
    if (p === "/api/payments/status" && req.method === "GET")
      return json(res, 200, {
        smartpay: smartpay.isConfigured(),
        apple: !!process.env.APPLE_SHARED_SECRET,
        whatsapp: require("./whatsapp").isConfigured() || process.env.OTP_DEBUG === "true",
        db: db.usePg ? "postgres" : "file",
        plans: smartpay.PLANS,
      });

    /* ---------- accounts ---------- */
    if (p === "/api/auth/register" && req.method === "POST") {
      if (!rateLimit("reg:" + clientIp(req), 8, 60 * 60e3))
        return json(res, 429, { error: "Too many attempts. Please try again later." });
      const b = parseBody(await body(req), req.headers["content-type"]);
      const r = await auth.register(b);
      return json(res, r.error ? 400 : 200, r);
    }
    if (p === "/api/auth/login" && req.method === "POST") {
      if (!rateLimit("login:" + clientIp(req), 10, 15 * 60e3))
        return json(res, 429, { error: "Too many attempts. Please try again later." });
      const b = parseBody(await body(req), req.headers["content-type"]);
      const r = await auth.login(b);
      return json(res, r.error ? 401 : 200, r);
    }
    /* WhatsApp OTP: request a code, then verify it (registers on first verify) */
    if (p === "/api/auth/otp/start" && req.method === "POST") {
      if (!rateLimit("otp:" + clientIp(req), 8, 60 * 60e3))
        return json(res, 429, { error: "Too many code requests. Please try again later." });
      const b = parseBody(await body(req), req.headers["content-type"]);
      const r = await auth.startOtp(b);
      return json(res, r.error ? 400 : 200, r);
    }
    if (p === "/api/auth/otp/verify" && req.method === "POST") {
      if (!rateLimit("otpv:" + clientIp(req), 20, 60 * 60e3))
        return json(res, 429, { error: "Too many attempts. Please try again later." });
      const b = parseBody(await body(req), req.headers["content-type"]);
      const r = await auth.verifyOtp(b);
      return json(res, r.error ? 400 : 200, r);
    }
    if (p === "/api/me" && req.method === "GET") {
      const user = await auth.fromRequest(req);
      if (!user) return json(res, 401, { error: "not_signed_in" });
      return json(res, 200, { user, subscription: await getSubscription(user.id) });
    }

    /* ---------- Bank Muscat / SmartPay config (admin-managed) ---------- */
    if (p === "/api/admin/config/smartpay" && req.method === "GET") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });
      return json(res, 200, smartpay.publicConfig());
    }
    if (p === "/api/admin/config/smartpay" && req.method === "PUT") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });
      const b = parseBody(await body(req), req.headers["content-type"]);
      // merge over what's stored, so a blank working key keeps the existing one
      const stored = (await db.get("config:smartpay")) || {};
      const next = {
        merchantId: (b.merchantId ?? stored.merchantId ?? "").toString().trim(),
        accessCode: (b.accessCode ?? stored.accessCode ?? "").toString().trim(),
        workingKey: (b.workingKey && b.workingKey.trim()) ? b.workingKey.trim() : (stored.workingKey || ""),
        txnUrl: (b.txnUrl ?? stored.txnUrl ?? "").toString().trim(),
        currency: (b.currency ?? stored.currency ?? "OMR").toString().trim(),
      };
      await db.set("config:smartpay", next);
      smartpay.setConfig(next);
      return json(res, 200, smartpay.publicConfig());
    }

    /* public list of Oman governorates for the sign-up form */
    if (p === "/api/governorates" && req.method === "GET")
      return json(res, 200, { governorates: auth.OMAN_GOVERNORATES });

    /* ---------- Vendor view counts ---------- */
    if (p === "/api/vendors/views" && req.method === "GET") {
      const out = {};
      for (const { key, value } of await db.list("views:")) out[key.slice(6)] = value || 0;
      return json(res, 200, { views: out });
    }
    const mView = p.match(/^\/api\/vendors\/([^/]+)\/view$/);
    if (mView && req.method === "POST") {
      if (!rateLimit("view:" + clientIp(req), 120, 60e3)) return json(res, 429, { error: "slow_down" });
      const id = decodeURIComponent(mView[1]);
      const n = ((await db.get("views:" + id)) || 0) + 1;
      await db.set("views:" + id, n);
      return json(res, 200, { id, views: n });
    }

    /* ---------- Vouchers (admin creates, customer redeems, single-use) ---------- */
    if (p === "/api/admin/vouchers" && req.method === "POST") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });
      const b = parseBody(await body(req), req.headers["content-type"]);
      const count = Math.min(2000, Math.max(1, parseInt(b.count, 10) || 1));
      const plan = b.plan === "annual" ? "annual" : "premium";
      const made = [];
      for (let i = 0; i < count; i++) {
        const code = genVoucherCode();
        await db.set("voucher:" + code, { code, plan, createdAt: Date.now(), createdBy: user.email, redeemedBy: null, redeemedAt: null });
        made.push(code);
      }
      return json(res, 200, { created: made.length, codes: made });
    }
    if (p === "/api/admin/vouchers" && req.method === "GET") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });
      const rows = (await db.list("voucher:")).map(x => x.value)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return json(res, 200, {
        total: rows.length,
        redeemed: rows.filter(v => v.redeemedBy).length,
        vouchers: rows,
      });
    }
    if (p === "/api/redeem" && req.method === "POST") {
      if (!rateLimit("redeem:" + clientIp(req), 15, 60 * 60e3))
        return json(res, 429, { error: "Too many attempts. Please try again later." });
      const user = await auth.fromRequest(req);
      if (!user) return json(res, 401, { error: "Please sign in first." });
      const b = parseBody(await body(req), req.headers["content-type"]);
      const code = String(b.code || "").trim().toUpperCase().replace(/\s+/g, "");
      const v = await db.get("voucher:" + code);
      if (!v) return json(res, 400, { error: "This code is not valid." });
      if (v.redeemedBy) return json(res, 400, { error: "This code has already been used." });
      v.redeemedBy = user.id; v.redeemedAt = Date.now();
      await db.set("voucher:" + code, v);
      await grantPremium(user.id, v.plan === "annual" ? "annual" : "voucher", { via: "voucher", code });
      return json(res, 200, { ok: true, plan: v.plan });
    }

    /* ---------- catalog (vendors, categories, tips, ads) ----------
       Public read; admin-only write. The admin app publishes whole
       collections — matching how the client edits them in memory. */
    if (p === "/api/catalog" && req.method === "GET") {
      const out = {};
      for (const { key, value } of await db.list("catalog:")) out[key.slice(8)] = value;
      return json(res, 200, out); // {} until an admin publishes; includes `version`
    }
    /* tiny endpoint clients poll for near-real-time updates */
    if (p === "/api/catalog/meta" && req.method === "GET") {
      return json(res, 200, { version: (await db.get("catalog:version")) || 0 });
    }
    if (p === "/api/admin/catalog" && req.method === "PUT") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });
      const raw = await body(req);
      let b;
      try { b = parseBody(raw, req.headers["content-type"]); }
      catch (e) { return json(res, 400, { error: "invalid_json" }); }
      if (!b || typeof b !== "object") return json(res, 400, { error: "empty_body" });
      try {
        const allowed = ["categories", "vendors", "tips", "ads"];
        for (const k of allowed) if (b[k] !== undefined) await db.set("catalog:" + k, b[k]);
        const version = Date.now();               // server-authoritative version
        await db.set("catalog:version", version);
        return json(res, 200, { ok: true, version, published: allowed.filter(k => b[k] !== undefined) });
      } catch (e) {
        // Admin-only endpoint — surface the real reason so publish issues are diagnosable.
        console.error("catalog publish failed:", (e && e.message) || e);
        return json(res, 500, { error: "publish_failed: " + ((e && e.message) || "unknown") });
      }
    }
    /* Robust incremental vendor upsert — the client sends only the changed
       vendor(s), so the request is always tiny (immune to body-size limits).
       Merges by id into the stored catalog and bumps the version. */
    if (p === "/api/admin/vendors" && req.method === "POST") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });
      let b;
      try { b = parseBody(await body(req), req.headers["content-type"]); }
      catch (e) { return json(res, 400, { error: "invalid_json" }); }
      const incoming = Array.isArray(b.vendors) ? b.vendors : (b.vendor ? [b.vendor] : null);
      if (!incoming || !incoming.length) return json(res, 400, { error: "no_vendors" });
      try {
        const cur = (await db.get("catalog:vendors")) || [];
        const byId = new Map(cur.map(v => [v.id, v]));
        for (const v of incoming) { if (v && v.id) byId.set(v.id, v); }
        // seed categories too if the catalog has none yet (first run)
        if (b.categories && !(await db.get("catalog:categories"))) await db.set("catalog:categories", b.categories);
        const merged = [...byId.values()];
        await db.set("catalog:vendors", merged);
        const version = Date.now();
        await db.set("catalog:version", version);
        return json(res, 200, { ok: true, version, count: merged.length });
      } catch (e) {
        console.error("vendor upsert failed:", (e && e.message) || e);
        return json(res, 500, { error: "upsert_failed: " + ((e && e.message) || "unknown") });
      }
    }
    /* Delete a vendor from the published catalog by id. */
    if (p === "/api/admin/vendors/delete" && req.method === "POST") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });
      let b; try { b = parseBody(await body(req), req.headers["content-type"]); } catch (e) { return json(res, 400, { error: "invalid_json" }); }
      try {
        const cur = (await db.get("catalog:vendors")) || [];
        const next = cur.filter(v => v.id !== b.id);
        await db.set("catalog:vendors", next);
        const version = Date.now(); await db.set("catalog:version", version);
        return json(res, 200, { ok: true, version, count: next.length });
      } catch (e) { return json(res, 500, { error: "delete_failed: " + ((e && e.message) || "unknown") }); }
    }

    /* ---------- SmartPay checkout ---------- */
    if (p === "/api/payments/smartpay/session" && req.method === "POST") {
      const b = parseBody(await body(req), req.headers["content-type"]);
      const user = await auth.fromRequest(req);          // prefer the signed-in account
      const userId = user ? user.id : (b.userId || "anon");
      const orderId = genOrderId("WC");
      await db.set("order:" + orderId, { userId, planId: b.planId, status: "created", createdAt: Date.now() });
      const session = smartpay.createSession({ planId: b.planId, orderId,
        customer: { name: user ? user.name : b.name, email: userId, userId } });
      return json(res, 200, session);
    }
    if (p === "/api/payments/smartpay/callback" && (req.method === "POST" || req.method === "GET")) {
      // SmartPay normally POSTs the encrypted response here, but the return/cancel
      // URL can also be hit with GET (browser redirect, or the gateway validating
      // the URL). Read from the body on POST, otherwise from the query string.
      const b = req.method === "POST"
        ? parseBody(await body(req), req.headers["content-type"])
        : Object.fromEntries(url.searchParams);
      if (!(b.encResponse || b.encResp)) {
        // Bare hit with no payment payload — show a friendly holding page instead of a 404.
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font-family:system-ui,sans-serif;padding:48px 24px;max-width:460px;margin:auto;text-align:center;color:#2b2b2f">
<div style="font-size:44px">💍</div>
<h2 style="margin:12px 0 6px">Wedding &amp; Co payments</h2>
<p style="color:#6b6b70">This is the secure payment return page. There's nothing to do here directly — complete a purchase from the app and you'll be brought back automatically.</p>
<p><a href="${APP_RETURN}" style="display:inline-block;margin-top:8px;padding:12px 22px;background:#b3874f;color:#fff;border-radius:12px;text-decoration:none">Open Wedding &amp; Co</a></p>
</body>`);
      }
      const r = smartpay.handleCallback(b);
      const order = r.orderId ? await db.get("order:" + r.orderId) : null;
      if (r.ok) {
        const userId = r.userId || order?.userId;
        await grantPremium(userId, r.planId || order?.planId,
          { via: "smartpay", trackingId: r.trackingId, bankRef: r.bankRef });
      }
      if (order) await db.set("order:" + r.orderId,
        { ...order, status: r.ok ? "paid" : "failed", trackingId: r.trackingId, bankRef: r.bankRef, raw: r.raw });
      const q = new URLSearchParams({ status: r.ok ? "success" : "failed",
        plan: r.planId || order?.planId || "", ref: r.trackingId || "" });
      res.writeHead(302, { Location: `${APP_RETURN}#/premium/return?${q}` });
      return res.end();
    }

    /* ---------- Apple IAP verification ---------- */
    if (p === "/api/payments/apple/verify" && req.method === "POST") {
      const b = parseBody(await body(req), req.headers["content-type"]);
      const user = await auth.fromRequest(req);
      const userId = user ? user.id : b.userId;
      const r = b.jws ? apple.verifyTransactionJWS(b.jws)
              : b.receipt ? await apple.verifyReceipt(b.receipt)
              : { ok: false, reason: "no_proof" };
      if (r.ok) await grantPremium(userId, r.plan, { via: "apple",
        productId: r.productId, expiresAt: r.expiresAt, originalTransactionId: r.originalTransactionId });
      return json(res, r.ok ? 200 : 400, r);
    }

    /* ---------- AI assistant (Aya, powered by Claude) ---------- */
    if (p === "/api/assistant" && req.method === "POST") {
      // Graceful degrade: if no key is configured the client falls back to its
      // built-in offline answers, so the chat never hard-fails.
      if (!assistant.isConfigured()) return json(res, 503, { error: "assistant_unavailable" });
      // Cost + abuse guard: cap messages per client. Signed-in users get more room.
      const user = await auth.fromRequest(req);
      const key = "ai:" + (user ? "u:" + user.id : "ip:" + clientIp(req));
      if (!rateLimit(key, user ? 60 : 20, 60e3))
        return json(res, 429, { error: "You're chatting fast! Give Aya a moment and try again." });
      let b;
      try { b = parseBody(await body(req), req.headers["content-type"]); }
      catch (e) { return json(res, 400, { error: "invalid_json" }); }
      try {
        const out = await assistant.chat({ messages: b.messages, context: b.context });
        return json(res, 200, out);
      } catch (e) {
        console.error("assistant error:", (e && e.message) || e);
        const code = e && e.status && e.status < 500 ? e.status : 502;
        return json(res, code, { error: "assistant_failed" });
      }
    }

    /* ---------- entitlement check ---------- */
    if (p.startsWith("/api/subscription/") && req.method === "GET") {
      const userId = decodeURIComponent(p.split("/").pop());
      return json(res, 200, await getSubscription(userId));
    }

    json(res, 404, { error: "not_found" });
  } catch (e) {
    if (e && e.message === "payload_too_large") return json(res, 413, { error: "payload_too_large" });
    // Log the real error server-side; never leak internals to the client.
    console.error("request error:", (e && e.stack) || e);
    json(res, 500, { error: "server_error" });
  }
}

// Local / Render: run a standalone HTTP server. On Vercel this file is
// required by api/[...path].js and only the exported handler is used.
if (require.main === module) {
  ready().then(() => http.createServer(handle).listen(PORT, () => {
    console.log(`Wedding & Co backend on http://localhost:${PORT}`);
    console.log("  storage:            ", db.usePg ? "PostgreSQL" : "local JSON file");
    console.log("  SmartPay configured:", smartpay.isConfigured());
    console.log("  Apple configured:   ", !!process.env.APPLE_SHARED_SECRET);
    console.log("  Admin seeded:       ", !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD));
  }));
}

module.exports = handle;         // Vercel serverless entry
module.exports.handle = handle;
module.exports.ready = ready;
