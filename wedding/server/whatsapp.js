/* ============================================================================
   WhatsApp OTP sender — Meta WhatsApp Business Cloud API.
   https://developers.facebook.com/docs/whatsapp/cloud-api

   Env:
     WHATSAPP_TOKEN      permanent access token (Meta Business system user)
     WHATSAPP_PHONE_ID   the business phone-number ID (not the number itself)
     WHATSAPP_TEMPLATE   approved *authentication* template name (default: otp_code)
     WHATSAPP_LANG       template language code (default: en)

   Authentication templates on the Cloud API require both a body parameter and
   a copy-code button parameter carrying the OTP.
   ============================================================================ */
const API_VERSION = "v20.0";

function isConfigured() {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

async function sendOtp(phoneE164, code) {
  if (!isConfigured()) return { sent: false, reason: "whatsapp_not_configured" };
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
  try {
    const r = await fetch(url, { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.WHATSAPP_TOKEN },
      body: JSON.stringify(payload) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("WhatsApp send failed:", JSON.stringify(data.error || data).slice(0, 300));
      return { sent: false, reason: data.error?.message || "whatsapp_send_failed" };
    }
    return { sent: true, id: data.messages?.[0]?.id };
  } catch (e) {
    console.error("WhatsApp send error:", e.message);
    return { sent: false, reason: "whatsapp_unreachable" };
  }
}

module.exports = { isConfigured, sendOtp };
