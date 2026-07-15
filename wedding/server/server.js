/* ============================================================================
   Zaffa payments backend — minimal, dependency-free reference server.
   Wires Bank Muscat SmartPay (redirect) and Apple IAP (receipt verify) to a
   subscription store. Replace the JSON-file store with your real database.

   Run:  node wedding/server/server.js         (reads wedding/server/.env if present)
   Port: PORT (default 8787)
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

const smartpay = require("./smartpay");
const apple = require("./apple");

const PORT = process.env.PORT || 8787;
const APP_RETURN = process.env.APP_RETURN_URL || "http://localhost:8742/index.html";

/* ---- subscription store (swap for a real DB) ---- */
const STORE = path.join(__dirname, ".subscriptions.json");
const readStore  = () => { try { return JSON.parse(fs.readFileSync(STORE, "utf8")); } catch { return {}; } };
const writeStore = (o) => fs.writeFileSync(STORE, JSON.stringify(o, null, 2));
function grantPremium(userId, plan, meta = {}) {
  const s = readStore();
  s[userId || "anon"] = { plan: "premium", tier: plan, since: Date.now(), ...meta };
  writeStore(s);
}
const ORDERS = new Map(); // orderId -> {userId, planId}

/* ---- helpers ---- */
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }); res.end(JSON.stringify(obj)); };
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
    /* provider availability — the app calls this to pick a checkout method */
    if (p === "/api/payments/status" && req.method === "GET")
      return json(res, 200, {
        smartpay: smartpay.isConfigured(),
        apple: !!process.env.APPLE_SHARED_SECRET,
        plans: smartpay.PLANS,
      });

    /* Credential self-test page — open in YOUR browser to fire one initiation
       request at the configured gateway and see the hosted page (or the exact
       gateway error). Keeps the live-fire action in the merchant's hands.
       Usage: GET /api/payments/smartpay/testpage?plan=monthly */
    if (p === "/api/payments/smartpay/testpage" && req.method === "GET") {
      const planId = url.searchParams.get("plan") || "monthly";
      const orderId = "ZF-TEST-" + Date.now();
      ORDERS.set(orderId, { userId: "credential-test", planId });
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

    /* SmartPay: create a payment session → client auto-submits the redirect form */
    if (p === "/api/payments/smartpay/session" && req.method === "POST") {
      const b = parseBody(await body(req), req.headers["content-type"]);
      const orderId = "ZF-" + Date.now() + "-" + crypto.randomBytes(2).toString("hex");
      ORDERS.set(orderId, { userId: b.userId, planId: b.planId });
      const session = smartpay.createSession({ planId: b.planId, orderId,
        customer: { name: b.name, email: b.email, userId: b.userId } });
      return json(res, 200, session); // {action, fields:{access_code, encRequest}, orderId}
    }

    /* SmartPay: encrypted response posted back here (redirect_url & cancel_url) */
    if (p === "/api/payments/smartpay/callback" && req.method === "POST") {
      const b = parseBody(await body(req), req.headers["content-type"]);
      const r = smartpay.handleCallback(b);
      if (r.ok) {
        const o = ORDERS.get(r.orderId) || {};
        grantPremium(r.userId || o.userId, r.planId || o.planId,
          { via: "smartpay", trackingId: r.trackingId, bankRef: r.bankRef });
      }
      // bounce the browser back into the app with a status the SPA can read
      const q = new URLSearchParams({ status: r.ok ? "success" : "failed",
        plan: r.planId || "", ref: r.trackingId || "" });
      res.writeHead(302, { Location: `${APP_RETURN}#/premium/return?${q}` });
      return res.end();
    }

    /* Apple IAP: verify a StoreKit purchase, then grant entitlement */
    if (p === "/api/payments/apple/verify" && req.method === "POST") {
      const b = parseBody(await body(req), req.headers["content-type"]);
      const r = b.jws ? apple.verifyTransactionJWS(b.jws)
              : b.receipt ? await apple.verifyReceipt(b.receipt)
              : { ok: false, reason: "no_proof" };
      if (r.ok) grantPremium(b.userId, r.plan, { via: "apple",
        productId: r.productId, expiresAt: r.expiresAt, originalTransactionId: r.originalTransactionId });
      return json(res, r.ok ? 200 : 400, r);
    }

    /* entitlement check — app asks "is this user premium?" */
    if (p.startsWith("/api/subscription/") && req.method === "GET") {
      const userId = decodeURIComponent(p.split("/").pop());
      return json(res, 200, readStore()[userId] || { plan: "free" });
    }

    json(res, 404, { error: "not_found" });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`Zaffa payments backend on http://localhost:${PORT}`);
  console.log("  SmartPay configured:", smartpay.isConfigured());
  console.log("  Apple configured:   ", !!process.env.APPLE_SHARED_SECRET);
});
