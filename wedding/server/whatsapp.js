/* ============================================================================
   WhatsApp OTP sender — supports two backends, chosen by which env is set:

   1) OpenWA gateway (https://github.com/rmyndharis/OpenWA) — self-hosted,
      links a normal WhatsApp number by QR, no Meta approval needed.
        OPENWA_URL       e.g. https://wa.yourdomain.com   (the gateway base)
        OPENWA_API_KEY   the X-API-Key from the OpenWA dashboard
        OPENWA_SESSION   the session id you started (default: "default")

   2) Meta WhatsApp Business Cloud API (official templates).
        WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE, WHATSAPP_LANG

   If neither is set, OTP is disabled (OTP_DEBUG=true returns the code inline
   for local testing).
   ============================================================================ */
const API_VERSION = "v20.0";
const BRAND = process.env.OTP_BRAND || "Wedding & Co";

function provider() {
  if (process.env.OPENWA_URL) return "openwa";
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) return "meta";
  return null;
}
function isConfigured() { return provider() !== null; }

/* digits only, no '+', WhatsApp chat id form: 96890000000@c.us */
function chatId(phoneE164) {
  return phoneE164.replace(/[^\d]/g, "") + "@c.us";
}

async function sendOtp(phoneE164, code) {
  const p = provider();
  if (!p) return { sent: false, reason: "whatsapp_not_configured" };
  const text = `${BRAND}: your verification code is ${code}\n\nIt expires in 5 minutes. Do not share this code with anyone.`;
  try {
    if (p === "openwa") return await sendViaOpenWA(phoneE164, code, text);
    return await sendViaMeta(phoneE164, code);
  } catch (e) {
    console.error("WhatsApp send error:", e.message);
    return { sent: false, reason: "whatsapp_unreachable" };
  }
}

/* ---- OpenWA gateway ---- */
async function sendViaOpenWA(phoneE164, code, text) {
  const base = process.env.OPENWA_URL.replace(/\/$/, "");
  const session = process.env.OPENWA_SESSION || "default";
  const url = `${base}/api/sessions/${encodeURIComponent(session)}/messages/send-text`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": process.env.OPENWA_API_KEY || "" },
    body: JSON.stringify({ chatId: chatId(phoneE164), text }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("OpenWA send failed:", r.status, JSON.stringify(data).slice(0, 300));
    return { sent: false, reason: (data && (data.message || data.error)) || ("openwa_" + r.status) };
  }
  return { sent: true, id: data.id || data.messageId || null };
}

/* ---- Meta WhatsApp Business Cloud API ---- */
async function sendViaMeta(phoneE164, code) {
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: phoneE164.replace(/^\+/, ""),
    type: "template",
    template: {
      name: process.env.WHATSAPP_TEMPLATE || "otp_code",
      language: { code: process.env.WHATSAPP_LANG || "en" },
      components: [
        { type: "body", parameters: [{ type: "text", text: code }] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
      ],
    },
  };
  const r = await fetch(url, { method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.WHATSAPP_TOKEN },
    body: JSON.stringify(payload) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Meta WhatsApp send failed:", JSON.stringify(data.error || data).slice(0, 300));
    return { sent: false, reason: data.error?.message || "whatsapp_send_failed" };
  }
  return { sent: true, id: data.messages?.[0]?.id };
}

module.exports = { isConfigured, sendOtp, provider, chatId };
