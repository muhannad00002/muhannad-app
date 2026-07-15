/* Round-trip test for the SmartPay integration (no real gateway needed).
   Simulates: create session -> gateway encrypts a Success response ->
   our callback handler decrypts & verifies it. Run: node test.js */
process.env.SMARTPAY_MERCHANT_ID = "123456";
process.env.SMARTPAY_ACCESS_CODE = "TEST_ACCESS_CODE";
process.env.SMARTPAY_WORKING_KEY = "1234567890abcdef1234567890abcdef"; // 32 chars
process.env.SMARTPAY_TXN_URL     = "https://spayuatmars.bmtest.om/transaction/transaction.do";
process.env.PUBLIC_BASE_URL      = "https://api.zaffa.app";

const sp = require("./smartpay");
let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : fail++; console.log((cond ? "  ✓ " : "  ✗ ") + name); };

// 1) session creation
const s = sp.createSession({ planId: "monthly", orderId: "ZF-TEST-1",
  customer: { name: "Sarah", email: "s@x.com", userId: "u1" } });
ok("session has action URL", s.action === process.env.SMARTPAY_TXN_URL);
ok("session posts access_code", s.fields.access_code === "TEST_ACCESS_CODE");
ok("session posts encRequest (hex)", /^[0-9A-F]+$/.test(s.fields.encRequest));
ok("encRequest decrypts back to request string", (() => {
  const str = sp.decrypt(s.fields.encRequest);
  return str.includes("merchant_id=123456") && str.includes("amount=1.150") &&
         str.includes("order_id=ZF-TEST-1") && str.includes("merchant_param1=monthly");
})());

// 2) simulate the gateway's encrypted Success response, then run our callback
const respStr = ["order_id=ZF-TEST-1", "tracking_id=99887766", "bank_ref_no=APPROVED123",
  "order_status=Success", "amount=1.150", "merchant_param1=monthly", "merchant_param2=u1",
  "status_code=0", "status_message=Approved"].join("&");
const encResponse = sp.encrypt(respStr);
const r = sp.handleCallback({ encResponse });
ok("callback verifies Success", r.ok === true);
ok("callback extracts plan", r.planId === "monthly");
ok("callback extracts userId", r.userId === "u1");
ok("callback extracts tracking id", r.trackingId === "99887766");

// 3) a failed/aborted response must NOT grant premium
const failEnc = sp.encrypt("order_id=ZF-TEST-1&order_status=Aborted&failure_message=Cancelled");
ok("callback rejects Aborted", sp.handleCallback({ encResponse: failEnc }).ok === false);

// 4) tampered ciphertext must fail (GCM auth tag)
const tampered = s.fields.encRequest.slice(0, -2) + (s.fields.encRequest.endsWith("A") ? "B" : "A");
ok("tampered ciphertext is rejected", (() => { try { sp.decrypt(tampered); return false; } catch { return true; } })());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
