# WhatsApp Business API Integration Guide

This document covers the complete setup for the official Meta WhatsApp Business API integration for your wedding planning app.

## Your Credentials

You have been provided with:
- Business Account ID (WABA ID)
- Phone Number ID  
- Access Token (keep this secret!)
- Phone Number
- API Version (v20.0)

**IMPORTANT:** Never commit credentials to git. Store them as environment variables only.

## Step 1: Set Environment Variables

Create `wedding/server/.env` (gitignored, local only):
```bash
# WhatsApp Business API (Meta Official)
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_API_VERSION=v20.0
WHATSAPP_PHONE_NUMBER=+96871766009
WHATSAPP_WEBHOOK_VERIFY_TOKEN=generate_random_string_here
OTP_BRAND=Wedding & Co
```

### Production Deployment

**On Render:**
- Dashboard → Your Project → Environment
- Add each variable with exact names above
- Redeploy

**On Vercel:**
- Project Settings → Environment Variables
- Add each variable
- Redeploy

## Step 2: Add Webhook Routes to server.js

The extended `whatsapp.js` module is committed. Insert these routes to `wedding/server/server.js` **before the AI Assistant section** (around line 499).

See the complete route block at the bottom of this file.

## Step 3: Configure Webhook in Meta Business Manager

1. Go to **https://business.facebook.com/wa/manage/**
2. Select your phone number → **Configuration**
3. Under "Webhooks":
   - **Callback URL**: `https://your-deployment-domain.com/webhook/whatsapp`
   - **Verify Token**: Match your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to: `messages`, `message_template_status_change`, `message_status_update`
4. Click **Verify & Save**

## Step 4: Create Message Templates

Create templates in Meta Business Manager → Message Templates:

### Template 1: OTP Code (required)
- **Name**: `otp_code`
- **Category**: Utility (can't be used for marketing)
- **Language**: English
- **Body**: `Your verification code is {{1}}`
- **Buttons**: Optional (can add "Copy Code" button)
- Status: Submit for approval

### Template 2: Wedding Reminder (optional)
- **Name**: `wedding_reminder`
- **Category**: Utility
- **Body**: `Hi {{1}}, your wedding is in {{2}} days!`

### Template 3: Order Confirmation (optional)
- **Name**: `order_confirmation`
- **Category**: Utility
- **Body**: `Thank you {{1}}, your {{2}} package is confirmed.`

## API Endpoints

All endpoints require authentication. Admin only.

### Send Text Message
```
POST /api/whatsapp/send
{
  "phone": "+96890000000",
  "message": "Hello from Wedding & Co!"
}
```

### Send Template Message
```
POST /api/whatsapp/template
{
  "phone": "+96890000000",
  "templateName": "otp_code",
  "languageCode": "en",
  "parameters": ["123456"]
}
```

### Mark Message as Read
```
POST /api/whatsapp/read
{
  "messageId": "wamid.xxxxx"
}
```

### Check Status
```
GET /api/whatsapp/status
```

Returns:
```json
{
  "configured": true,
  "provider": "meta",
  "phoneNumber": "+96871766009",
  "webhookUrl": "https://your-domain.com/webhook/whatsapp"
}
```

## Module API

```javascript
const whatsapp = require("./whatsapp");

// Send OTP
await whatsapp.sendOtp("+96890000000", "123456")
// → { sent: true, id: "wamid.xxxxx" } or { sent: false, reason: "..." }

// Send text message
await whatsapp.sendMessage("+96890000000", "Hello!")
// → { sent: true, id: "..." }

// Send template
await whatsapp.sendTemplate("+96890000000", "otp_code", "en", ["123456"])
// → { sent: true, id: "..." }

// Parse webhook
whatsapp.parseIncomingMessage(webhookData)
// → { type: "message", from: "...", text: "...", ... }
// or { type: "status", status: "delivered", ... }

// Mark as read
await whatsapp.markAsRead("wamid.xxxxx")
// → { ok: true }
```

## Integration Examples

### Use Case 1: OTP via WhatsApp
Already integrated! When `WHATSAPP_TEMPLATE=otp_code`, OTP codes send via WhatsApp.

### Use Case 2: Order Confirmation
```javascript
// After payment
await whatsapp.sendTemplate(bride.phone, "order_confirmation", "en", [
  bride.name,
  "Gold Package"
]);
```

### Use Case 3: Wedding Countdown
```javascript
const daysLeft = Math.ceil((bride.weddingDate - Date.now()) / 86400000);
await whatsapp.sendMessage(bride.phone, 
  `🎉 Only ${daysLeft} days until your wedding! Complete your setup.`
);
```

### Use Case 4: Customer Support
- Incoming messages auto-stored in database (`whatsapp:msg:*`)
- Build admin dashboard to view/reply
- Mark as read when handled

## Testing

### Local Development
1. Enable WhatsApp Sandbox in Meta Dashboard
2. Add your personal number to test numbers
3. All messages routed to sandbox
4. No approval needed for templates during testing

### Webhook Testing with ngrok
```bash
# Terminal 1: Start local server
cd wedding && node server/server.js

# Terminal 2: Expose via ngrok
ngrok http 8787

# Dashboard webhook URL: https://xxxx.ngrok.io/webhook/whatsapp
```

## Webhook Routes to Add to server.js

Insert before the "AI assistant" section:

```javascript
    /* ---------- WhatsApp Webhook Setup & Verification ---------- */
    if (p === "/webhook/whatsapp" && req.method === "GET") {
      const mode = req.url.split("?")[1];
      const params = new URLSearchParams(mode);
      const token = params.get("hub.verify_token");
      const challenge = params.get("hub.challenge");
      const mode_param = params.get("hub.mode");

      if (mode_param === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        return res.writeHead(200, { "Content-Type": "text/plain" }), res.end(challenge);
      }
      return json(res, 403, { error: "invalid_token" });
    }

    /* ---------- WhatsApp Incoming Messages & Status Updates ---------- */
    if (p === "/webhook/whatsapp" && req.method === "POST") {
      const raw = await body(req);
      let b;
      try { b = JSON.parse(raw); } catch (e) { return json(res, 400, { error: "invalid_json" }); }

      // Parse incoming message
      const msg = whatsapp.parseIncomingMessage(b);
      if (msg) {
        console.log("WhatsApp incoming:", msg.type, {
          from: msg.from,
          messageId: msg.messageId,
          ...(msg.type === "message" && { text: msg.text?.slice(0, 100) }),
          ...(msg.type === "status" && { status: msg.status }),
        });

        // Store incoming message
        if (msg.type === "message") {
          await db.set("whatsapp:msg:" + msg.messageId, {
            ...msg,
            receivedAt: Date.now(),
          });
        }
      }

      return json(res, 200, { ok: true });
    }

    /* ---------- Send WhatsApp Text Message ---------- */
    if (p === "/api/whatsapp/send" && req.method === "POST") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });

      const b = parseBody(await body(req), req.headers["content-type"]);
      const { phone, message } = b;

      if (!phone || !message) return json(res, 400, { error: "missing_phone_or_message" });

      const result = await whatsapp.sendMessage(phone, message);
      if (result.sent) {
        return json(res, 200, { ok: true, messageId: result.id });
      }
      return json(res, 400, { error: result.reason });
    }

    /* ---------- Send WhatsApp Template Message ---------- */
    if (p === "/api/whatsapp/template" && req.method === "POST") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });

      const b = parseBody(await body(req), req.headers["content-type"]);
      const { phone, templateName, languageCode, parameters } = b;

      if (!phone || !templateName) return json(res, 400, { error: "missing_phone_or_template" });

      const result = await whatsapp.sendTemplate(phone, templateName, languageCode || "en", parameters || []);
      if (result.sent) {
        return json(res, 200, { ok: true, messageId: result.id });
      }
      return json(res, 400, { error: result.reason });
    }

    /* ---------- Mark WhatsApp Message as Read ---------- */
    if (p === "/api/whatsapp/read" && req.method === "POST") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });

      const b = parseBody(await body(req), req.headers["content-type"]);
      const { messageId } = b;

      if (!messageId) return json(res, 400, { error: "missing_messageId" });

      const result = await whatsapp.markAsRead(messageId);
      if (result.ok) {
        return json(res, 200, { ok: true });
      }
      return json(res, 400, { error: result.reason });
    }

    /* ---------- WhatsApp Configuration Status ---------- */
    if (p === "/api/whatsapp/status" && req.method === "GET") {
      const user = await auth.fromRequest(req);
      if (!user || user.role !== "admin") return json(res, 403, { error: "admin_only" });

      return json(res, 200, {
        configured: whatsapp.isConfigured(),
        provider: whatsapp.provider(),
        phoneNumber: process.env.WHATSAPP_PHONE_NUMBER || "not configured",
        webhookUrl: process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL + "/webhook/whatsapp" : "not configured",
      });
    }
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "not_configured" | Check `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` env vars |
| Webhook not verifying | Token must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` exactly |
| Messages fail to send | Verify access token (sandbox tokens expire), check phone format |
| Template not found | Template must be created and approved in Meta Business Manager |
| Incoming messages missing | Webhook events subscribe status—verify in Meta dashboard |

## Next Steps

1. ✅ Credentials provided
2. ✅ Module extended and committed
3. TODO: Create `.env` locally with credentials
4. TODO: Add webhook routes to server.js
5. TODO: Deploy and set environment variables
6. TODO: Configure webhook in Meta Business Manager
7. TODO: Create message templates
8. TODO: Test with WhatsApp sandbox
9. TODO: Integrate into app workflows

