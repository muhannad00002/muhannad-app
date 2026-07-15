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
// Render provides RENDER_EXTERNAL_URL automatically — use it as the public base.
if (!process.env.PUBLIC_BASE_URL && process.env.RENDER_EXTERNAL_URL)
  process.env.PUBLIC_BASE_URL = process.env.RENDER_EXTERNAL_URL;

const smartpay = require("./smartpay");
const apple = require("./apple");
const db = require("./db");
const auth = require("./auth");

const PORT = process.env.PORT || 8787;
const APP_RETURN = process.env.APP_RETURN_URL || "http://localhost:8742/index.html";

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
function body(req) {
  return new Promise(resolve => { let b = ""; req.on("data", c => b += c); req.on("end", () => resolve(b)); });
}
function parseBody(raw, ctype = "") {
  if (ctype.includes("application/json")) { try { return JSON.parse(raw || "{}"); } catch { return {}; } }
  return Object.fromEntries(new URLSearchParams(raw)); // form-urlencoded (SmartPay callback)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  if (req.method === "OPTIONS") return json(res, 204, {});

  try {
    /* ---------- health & provider status ---------- */
    if (p === "/api/payments/status" && req.method === "GET")
      return json(res, 200, {
        smartpay: smartpay.isConfigured(),
        apple: !!process.env.APPLE_SHARED_SECRET,
        db: db.usePg ? "postgres" : "file",
        plans: smartpay.PLANS,
      });

    /* ---------- accounts ---------- */
    if (p === "/api/auth/register" && req.method === "POST") {
      const b = parseBody(await body(req), req.headers["content-type"]);
      const r = await auth.register(b);
      return json(res, r.error ? 400 : 200, r);
    }
    if (p === "/api/auth/login" && req.method === "POST") {
      const b = parseBody(await body(req), req.headers["content-type"]);
      const r = await auth.login(b);
      return json(res, r.error ? 401 : 200, r);
    }
    if (p === "/api/me" && req.method === "GET") {
      const user = await auth.fromRequest(req);
      if (!user) return json(res, 401, { error: "not_signed_in" });
      return json(res, 200, { user, subscription: await getSubscription(user.email) });
    }

    /* ---------- catalog (vendors, categories, tips, ads) ----------
       Public read; admin-only write. The admin app publishes whole
       collections — matching how the client edits them in memory. */
    if (p === "/api/catalog" && req.method === "GET") {
      const out = {};
      for (const { key, value } of await db.list("catalog:")) out[key.slice(8)] = value;
      return json(res, 200, out); // {} until an admin publishes
    }
    if (p === "/api/admin/catalog" && req.method === "PUT") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });
      const b = parseBody(await body(req), req.headers["content-type"]);
      const allowed = ["categories", "vendors", "tips", "ads", "version"];
      for (const k of allowed) if (b[k] !== undefined) await db.set("catalog:" + k, b[k]);
      return json(res, 200, { ok: true, published: allowed.filter(k => b[k] !== undefined) });
    }

    /* ---------- SmartPay credential self-test page ---------- */
    if (p === "/api/payments/smartpay/testpage" && req.method === "GET") {
      const planId = url.searchParams.get("plan") || "monthly";
      const orderId = "ZF-TEST-" + Date.now();
      await db.set("order:" + orderId, { userId: "credential-test", planId, status: "created", createdAt: Date.now() });
      const s = smartpay.createSession({ planId, orderId,
        customer: { name: "Credential Test", email: "", userId: "credential-test" } });
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<!doctype html><meta charset="utf-8"><title>SmartPay credential test</title>
<body style="font-family:sans-serif;padding:40px;max-width:520px;margin:auto">
<h2>SmartPay credential test</h2>
<p>Order <b>${orderId}</b> · plan <b>${planId}</b> · gateway:<br><code>${s.action}</code></p>
<p>Click to send one initiation request. If the credentials pair with this
environment you'll see the Bank Muscat payment page — <b>do not enter a card</b>
unless you intend to pay. An abandoned initiation costs nothing.</p>
<form method="POST" action="${s.action}">
  <input type="hidden" name="access_code" value="${s.fields.access_code}">
  <input type="hidden" name="encRequest" value="${s.fields.encRequest}">
  <button type="submit" style="padding:12px 22px;font-size:16px">Open Bank Muscat payment page</button>
</form></body>`);
    }

    /* ---------- SmartPay checkout ---------- */
    if (p === "/api/payments/smartpay/session" && req.method === "POST") {
      const b = parseBody(await body(req), req.headers["content-type"]);
      const user = await auth.fromRequest(req);          // prefer the signed-in account
      const userId = user ? user.email : (b.userId || "anon");
      const orderId = "ZF-" + Date.now() + "-" + crypto.randomBytes(2).toString("hex");
      await db.set("order:" + orderId, { userId, planId: b.planId, status: "created", createdAt: Date.now() });
      const session = smartpay.createSession({ planId: b.planId, orderId,
        customer: { name: user ? user.name : b.name, email: userId, userId } });
      return json(res, 200, session);
    }
    if (p === "/api/payments/smartpay/callback" && req.method === "POST") {
      const b = parseBody(await body(req), req.headers["content-type"]);
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
      const userId = user ? user.email : b.userId;
      const r = b.jws ? apple.verifyTransactionJWS(b.jws)
              : b.receipt ? await apple.verifyReceipt(b.receipt)
              : { ok: false, reason: "no_proof" };
      if (r.ok) await grantPremium(userId, r.plan, { via: "apple",
        productId: r.productId, expiresAt: r.expiresAt, originalTransactionId: r.originalTransactionId });
      return json(res, r.ok ? 200 : 400, r);
    }

    /* ---------- entitlement check ---------- */
    if (p.startsWith("/api/subscription/") && req.method === "GET") {
      const userId = decodeURIComponent(p.split("/").pop());
      return json(res, 200, await getSubscription(userId));
    }

    json(res, 404, { error: "not_found" });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

(async () => {
  await db.init();
  await auth.init();
  await auth.seedAdmin();
  server.listen(PORT, () => {
    console.log(`Zaffa backend on http://localhost:${PORT}`);
    console.log("  storage:            ", db.usePg ? "PostgreSQL" : "local JSON file");
    console.log("  SmartPay configured:", smartpay.isConfigured());
    console.log("  Apple configured:   ", !!process.env.APPLE_SHARED_SECRET);
    console.log("  Admin seeded:       ", !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD));
  });
})();
