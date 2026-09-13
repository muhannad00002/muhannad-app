# WhatsApp Webhook Setup - Meta Business Manager

## Your Configuration

**Callback URL:**
```
https://weddingandco.vercel.app/webhook/whatsapp
```

**Verify Token:**
```
80a89438e96ad337b658ce2c4fe6051589697f8a1a6e4c80d97f52d0d6695e86
```

**Business Account ID:** 1358023363153523
**Phone Number ID:** 1341879095676595
**Domain:** weddingandco.vercel.app

---

## Step-by-Step Setup in Meta Business Manager

### 1. Go to Your WhatsApp App Configuration
1. Open https://developers.facebook.com/apps
2. Select your WhatsApp app
3. Go to **WhatsApp** → **Configuration** (in left sidebar)

### 2. Add Webhook URL
Look for "Webhooks" section:
- **Callback URL:** `https://weddingandco.vercel.app/webhook/whatsapp`
- **Verify Token:** `80a89438e96ad337b658ce2c4fe6051589697f8a1a6e4c80d97f52d0d6695e86`
- Click **Verify & Save**

Meta will send a GET request to your callback URL with the verify token. Your server will automatically respond with the challenge.

### 3. Subscribe to Webhook Events
After verification succeeds, check these boxes:
- ✅ **messages** (receive incoming messages)
- ✅ **message_template_status_change** (template approval status)
- ✅ **message_status_update** (delivery/read receipts)

Click **Save** after selecting.

### 4. Generate System Token (If Not Already Done)
Your access token expires. For production, use a system user token:

1. Go to **Settings** → **Users & Roles** → **System Users**
2. Click **Create System User**
3. Give it admin role
4. Click **Generate Token**
5. Select **Never** expiration (or choose your renewal period)
6. Copy the token and update:
   - Locally: Add to `.env` as `WHATSAPP_ACCESS_TOKEN`
   - Production: Update on Render environment variables

### 5. Create Message Templates
Go to **Message Templates** tab and create these:

#### Template 1: OTP Code (Required)
- **Name:** `otp_code`
- **Category:** Utility
- **Language:** English (en)
- **Message Body:**
  ```
  Your verification code is {{1}}
  ```
- Click **Submit for Approval**

#### Template 2: Wedding Reminder (Optional)
- **Name:** `wedding_reminder`
- **Category:** Utility
- **Language:** English (en)
- **Message Body:**
  ```
  Hi {{1}}, your wedding is in {{2}} days!
  ```
- Click **Submit for Approval**

#### Template 3: Order Confirmation (Optional)
- **Name:** `order_confirmation`
- **Category:** Utility
- **Language:** English (en)
- **Message Body:**
  ```
  Thank you {{1}}, your {{2}} package is confirmed for {{3}}.
  ```
- Click **Submit for Approval**

---

## Testing

### 1. Use WhatsApp Sandbox (No Approval Needed)
In Configuration → Sandbox Mode:
- Add your test phone number
- Send test messages from your number
- All messages routed to sandbox (no real customers see them)

### 2. Test Webhook Verification
```bash
curl -X GET "https://weddingandco.vercel.app/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=80a89438e96ad337b658ce2c4fe6051589697f8a1a6e4c80d97f52d0d6695e86&hub.challenge=test123"
```

Should return: `test123`

### 3. Send Test Message
```bash
curl -X POST https://weddingandco.vercel.app/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "phone": "+96890000000",
    "message": "Hello from WhatsApp API!"
  }'
```

---

## Deployment to Vercel

Your `.env` is ready locally. Now deploy:

### 1. Set Environment Variables on Vercel
1. Go to https://vercel.com/dashboard
2. Select "weddingandco" project (or your project)
3. Click **Settings** → **Environment Variables**
4. Add these variables:
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`: `1358023363153523`
   - `WHATSAPP_PHONE_NUMBER_ID`: `1341879095676595`
   - `WHATSAPP_ACCESS_TOKEN`: (your access token)
   - `WHATSAPP_API_VERSION`: `v20.0`
   - `WHATSAPP_PHONE_NUMBER`: `+96871766009`
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: `80a89438e96ad337b658ce2c4fe6051589697f8a1a6e4c80d97f52d0d6695e86`

### 2. Redeploy
- Projects page → Select project
- Click **Redeploy** or push new commit
- (or it auto-deploys on git push if connected)

---

## Verify It's Working

1. **Check webhook configuration in Meta Dashboard**
   - Should show "Active" status
   - Last verified: today's date

2. **Check logs on Render**
   - Service page → Logs
   - Send a test message from WhatsApp
   - Should see "WhatsApp incoming: message" in logs

3. **Check database**
   - Incoming messages stored as `whatsapp:msg:*` keys
   - Can query via your admin API

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Webhook verification failed" | Check token matches exactly (no extra spaces) |
| Webhook shows "Inactive" | Redeploy service after adding env variables |
| No incoming messages | Check "messages" is checked in Meta webhook events |
| Message send fails | Verify access token, check phone format (+country-number) |
| Template stuck in "pending" | Templates require review by Meta (24-48 hours typical) |

---

## What's Ready Now

✅ Server code deployed (webhook routes, message sending)
✅ `.env` configured locally
✅ Webhook routes at `/webhook/whatsapp`
✅ API endpoints ready:
  - POST /api/whatsapp/send (text)
  - POST /api/whatsapp/template (approved templates)
  - POST /api/whatsapp/read (mark as read)
  - GET /api/whatsapp/status (config check)

TODO:
- [ ] Add env variables to Render
- [ ] Redeploy on Render
- [ ] Configure webhook in Meta Dashboard
- [ ] Create templates and wait for approval
- [ ] Test with WhatsApp Sandbox
