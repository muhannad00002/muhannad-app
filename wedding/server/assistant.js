/* ============================================================================
   Wedding & Co — AI assistant (Aya)

   Wraps Anthropic's Messages API so the bride's chat is powered by Claude with:
     • live web search  — up-to-date answers to any question (2026 trends,
       prices, etiquette, weather for a date, anything)
     • vision           — she can attach a photo (a dress, a venue, an
       inspiration shot) and Aya analyses it and replies accordingly
     • marketplace-aware recommendations — the request carries a compact
       snapshot of her plan + the real vendors in the app, so Aya suggests
       actual vendors she can tap through to.

   The Anthropic API key lives ONLY here, server-side (process.env.ANTHROPIC_API_KEY).
   No SDK dependency — a single HTTPS call keeps the serverless bundle lean and
   matches the rest of this backend (smartpay.js / whatsapp.js use raw fetch too).
   ============================================================================ */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ASSISTANT_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = parseInt(process.env.ASSISTANT_MAX_TOKENS, 10) || 1024;

function isConfigured() { return !!process.env.ANTHROPIC_API_KEY; }

/* Build Aya's system prompt from the bride's live context. Keeping the persona
   and all the marketplace facts server-side means the client only sends a small,
   structured snapshot — smaller prompt-injection surface, consistent voice. */
function systemPrompt(ctx) {
  ctx = ctx || {};
  const lines = [];
  lines.push(
    "You are Aya, the warm, upbeat AI wedding assistant inside the \"Wedding & Co\" app — " +
    "a wedding-planning app and vendor marketplace for brides in Oman. You help the bride " +
    "plan her wedding: next steps, budgeting, timelines, etiquette, décor and style ideas, " +
    "and recommending real vendors from the app's marketplace."
  );
  lines.push(
    "Voice: friendly, encouraging and concise — like a stylish, organised big sister. " +
    "Use the bride's name when you know it. A tasteful emoji here and there is welcome; don't overdo it. " +
    "Keep answers short and skimmable (a few sentences or a short bullet list). Prices and budgets are in Omani Rial (OMR)."
  );
  lines.push(
    "You can search the web for anything current (2026 trends, real prices, seasonal flowers, weather, etiquette). " +
    "When the bride attaches a photo, describe what you see and give specific, useful feedback (style, colours, fit, how it suits a wedding, what would pair well)."
  );
  lines.push(
    "When recommending vendors, prefer the ones listed under \"Vendors in the app\" below and name them exactly, " +
    "so she can tap through to them in the app. Only mention outside options if the app has nothing suitable, and say so. " +
    "Never invent vendors, prices, phone numbers or facts about a vendor that aren't given to you."
  );
  lines.push("Be safe and kind. If asked something outside weddings, help briefly, then gently steer back to planning.");

  const b = [];
  if (ctx.name) b.push("Bride's name: " + ctx.name);
  if (ctx.governorate) b.push("Governorate: " + ctx.governorate);
  if (ctx.weddingDate) b.push("Wedding date: " + ctx.weddingDate);
  if (ctx.daysLeft != null) b.push("Days until the wedding: " + ctx.daysLeft);
  if (ctx.budget != null) b.push("Total budget: OMR " + ctx.budget);
  if (ctx.progressPct != null) b.push("Planning progress: " + ctx.progressPct + "%");
  if (Array.isArray(ctx.nextTasks) && ctx.nextTasks.length)
    b.push("Suggested next tasks: " + ctx.nextTasks.slice(0, 6).join("; "));
  if (b.length) lines.push("\nHer plan right now:\n" + b.map(x => "- " + x).join("\n"));

  if (Array.isArray(ctx.vendors) && ctx.vendors.length) {
    const rows = ctx.vendors.slice(0, 60).map(v => {
      const parts = [v.name];
      if (v.category) parts.push(v.category);
      if (v.city) parts.push(v.city);
      if (v.featured) parts.push("★ featured");
      return "- " + parts.join(" · ");
    });
    lines.push("\nVendors in the app (recommend these by exact name):\n" + rows.join("\n"));
  } else {
    lines.push("\nThe app has no vendors published yet — if she asks for a recommendation, say new vendors are added often and offer general guidance meanwhile.");
  }
  lines.push("\nToday's date: " + new Date().toISOString().slice(0, 10) + ".");
  return lines.join("\n");
}

/* Sanitise the client's message history into valid Anthropic content blocks.
   Accepts text and base64 image blocks only; caps sizes so a rogue client can't
   blow up the request. */
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const OK_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const out = [];
  for (const m of messages.slice(-24)) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const blocks = [];
    const content = Array.isArray(m.content) ? m.content : [{ type: "text", text: String(m.content ?? "") }];
    for (const c of content) {
      if (!c) continue;
      if (c.type === "text" && typeof c.text === "string" && c.text.trim()) {
        blocks.push({ type: "text", text: c.text.slice(0, 8000) });
      } else if (c.type === "image" && c.source && c.source.type === "base64" &&
                 OK_MEDIA.includes(c.source.media_type) && typeof c.source.data === "string") {
        // ~7MB of base64 max per image
        if (c.source.data.length <= 9_500_000) {
          blocks.push({ type: "image", source: { type: "base64", media_type: c.source.media_type, data: c.source.data } });
        }
      }
    }
    if (blocks.length) out.push({ role: m.role, content: blocks });
  }
  // The conversation must start with a user turn.
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

/* Pull the plain-text reply out of a completed Anthropic response. */
function extractText(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks.filter(b => b && b.type === "text").map(b => b.text).join("").trim();
}

async function callAnthropic(payload) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data && data.error && data.error.message) || ("HTTP " + r.status);
    const e = new Error(msg); e.status = r.status; throw e;
  }
  return data;
}

/* Main entry. Returns { text }. Handles the web-search server-tool loop:
   Claude returns stop_reason "pause_turn" while it runs searches — we feed its
   partial turn back until it finishes. */
async function chat({ messages, context }) {
  if (!isConfigured()) { const e = new Error("assistant_unavailable"); e.status = 503; throw e; }
  let convo = sanitizeMessages(messages);
  if (!convo.length) { const e = new Error("no_message"); e.status = 400; throw e; }

  const base = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt(context),
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
  };

  let last;
  for (let i = 0; i < 5; i++) {
    last = await callAnthropic({ ...base, messages: convo });
    if (last.stop_reason === "pause_turn" && Array.isArray(last.content)) {
      // Claude paused mid-turn (running a server tool) — send its turn back to continue.
      convo = convo.concat([{ role: "assistant", content: last.content }]);
      continue;
    }
    break;
  }

  const text = extractText(last && last.content);
  return { text: text || "I'm here, but I couldn't put that into words just now. Could you try asking a little differently? 💗" };
}

module.exports = { chat, isConfigured, systemPrompt, sanitizeMessages };
