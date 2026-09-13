/* ============================================================================
   WhatsApp Business API integration — supports two backends:

   1) OpenWA gateway (https://github.com/rmyndharis/OpenWA) — self-hosted
   2) Meta WhatsApp Business Cloud API (official templates)

   This module handles both OTP sending and general messaging.
   ============================================================================ */
const crypto = require("crypto");
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";
const BRAND = process.env.OTP_BRAND || "Wedding & Co";

function provider() {
  if (process.env.OPENWA_URL) return "openwa";
  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) return "meta";
  return null;
}
function isConfigured() { return provider() !== null; }

/* digits only, no '+', WhatsApp chat id form: 96890000000@c.us */
function chatId(phoneE164) {
  return phoneE164.replace(/[^\d]/g, "") + "@c.us";
}

/* ---- OTP Sending (existing functionality) ---- */
async function sendOtp(phoneE164, code) {
  const p = provider();
  if (!p) return { sent: false, reason: "whatsapp_not_configured" };
  const text = `${BRAND}: your verification code is ${code}\n\nIt expires in 5 minutes. Do not share this code with anyone.`;
  try {
    if (p === "openwa") return await sendViaOpenWA(phoneE164, code, text);
    return await sendViaMeta(phoneE164, code);
  } catch (e) {
    console.error("WhatsApp OTP send error:", e.message);
    return { sent: false, reason: "whatsapp_unreachable" };
  }
}

/* ---- General Text Message Sending ---- */
async function sendMessage(phoneE164, message) {
  const p = provider();
  if (!p) return { sent: false, reason: "whatsapp_not_configured" };
  try {
    if (p === "openwa") return await sendTextViaOpenWA(phoneE164, message);
    return await sendTextViaMeta(phoneE164, message);
  } catch (e) {
    console.error("WhatsApp message send error:", e.message);
    return { sent: false, reason: "whatsapp_unreachable" };
  }
}

/* ---- Template Message Sending (notifications, reminders, etc.) ---- */
async function sendTemplate(phoneE164, templateName, languageCode = "en", parameters = []) {
  const p = provider();
  if (!p) return { sent: false, reason: "whatsapp_not_configured" };
  try {
    if (p === "openwa") {
      // OpenWA doesn't support templates, fall back to text message
      const parameterText = parameters.join(" ");
      return await sendTextViaOpenWA(phoneE164, parameterText);
    }
    return await sendTemplateViaMeta(phoneE164, templateName, languageCode, parameters);
  } catch (e) {
    console.error("WhatsApp template send error:", e.message);
    return { sent: false, reason: "whatsapp_unreachable" };
  }
}

/* ---- OpenWA Implementation ---- */
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

async function sendTextViaOpenWA(phoneE164, message) {
  const base = process.env.OPENWA_URL.replace(/\/$/, "");
  const session = process.env.OPENWA_SESSION || "default";
  const url = `${base}/api/sessions/${encodeURIComponent(session)}/messages/send-text`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": process.env.OPENWA_API_KEY || "" },
    body: JSON.stringify({ chatId: chatId(phoneE164), text: message }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("OpenWA text send failed:", r.status, JSON.stringify(data).slice(0, 300));
    return { sent: false, reason: (data && (data.message || data.error)) || ("openwa_" + r.status) };
  }
  return { sent: true, id: data.id || data.messageId || null };
}

/* ---- Meta WhatsApp Business Cloud API Implementation ---- */
async function sendViaMeta(phoneE164, code) {
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
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
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.WHATSAPP_ACCESS_TOKEN },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Meta WhatsApp OTP send failed:", JSON.stringify(data.error || data).slice(0, 300));
    return { sent: false, reason: data.error?.message || "whatsapp_send_failed" };
  }
  return { sent: true, id: data.messages?.[0]?.id };
}

async function sendTextViaMeta(phoneE164, message) {
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: phoneE164.replace(/^\+/, ""),
    type: "text",
    text: { body: message },
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.WHATSAPP_ACCESS_TOKEN },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Meta WhatsApp text send failed:", JSON.stringify(data.error || data).slice(0, 300));
    return { sent: false, reason: data.error?.message || "whatsapp_send_failed" };
  }
  return { sent: true, id: data.messages?.[0]?.id };
}

async function sendTemplateViaMeta(phoneE164, templateName, languageCode, parameters = []) {
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const components = [];
  
  if (parameters.length > 0) {
    components.push({
      type: "body",
      parameters: parameters.map(p => ({ type: "text", text: String(p) })),
    });
  }

  const payload = {
    messaging_product: "whatsapp",
    to: phoneE164.replace(/^\+/, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode || "en" },
      ...(components.length > 0 && { components }),
    },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.WHATSAPP_ACCESS_TOKEN },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Meta WhatsApp template send failed:", JSON.stringify(data.error || data).slice(0, 300));
    return { sent: false, reason: data.error?.message || "whatsapp_send_failed" };
  }
  return { sent: true, id: data.messages?.[0]?.id };
}

/* ---- Webhook Signature Verification ---- */
function verifyWebhookSignature(req, body) {
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!token) return false;
  
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_ACCESS_TOKEN; // fallback
  const hash = crypto.createHmac("sha256", appSecret).update(body).digest("base64");
  const expectedSignature = `sha256=${hash}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  ).catch(() => false);
}

/* ---- Incoming Message Parsing ---- */
function parseIncomingMessage(data) {
  if (data.object !== "whatsapp_business_account") return null;

  const entry = data.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];
  const status = change?.value?.statuses?.[0];

  if (message) {
    return {
      type: "message",
      messageId: message.id,
      from: message.from,
      timestamp: message.timestamp,
      messageType: message.type, // text, image, document, etc.
      text: message.text?.body,
      mediaUrl: message.image?.link || message.document?.link || message.video?.link || null,
      mediaId: message.image?.id || message.document?.id || message.video?.id || null,
    };
  }

  if (status) {
    return {
      type: "status",
      messageId: status.id,
      from: status.recipient_id,
      status: status.status, // sent, delivered, read, failed
      timestamp: status.timestamp,
      errors: status.errors || [],
    };
  }

  return null;
}

/* ---- Mark Message as Read ---- */
async function markAsRead(messageId) {
  const p = provider();
  if (p !== "meta") return { ok: false, reason: "openwa_not_supported" };

  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.WHATSAPP_ACCESS_TOKEN },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Meta WhatsApp read receipt failed:", JSON.stringify(data.error || data).slice(0, 300));
      return { ok: false, reason: data.error?.message || "whatsapp_read_failed" };
    }
    return { ok: true };
  } catch (e) {
    console.error("Mark as read error:", e.message);
    return { ok: false, reason: "network_error" };
  }
}

module.exports = {
  isConfigured,
  provider,
  chatId,
  // OTP
  sendOtp,
  // Messages
  sendMessage,
  sendTemplate,
  // Webhooks
  verifyWebhookSignature,
  parseIncomingMessage,
  markAsRead,
};
