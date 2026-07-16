/* ============================================================================
   Zaffa auth — email/password accounts with scrypt hashing and HMAC tokens.
   No dependencies. Passwords are never stored, only salted scrypt hashes.
   ============================================================================ */
const crypto = require("crypto");
const db = require("./db");

let SECRET = process.env.AUTH_SECRET || null;
async function init() {
  if (SECRET) return;
  SECRET = await db.get("meta:auth_secret");
  if (!SECRET) { SECRET = crypto.randomBytes(32).toString("hex"); await db.set("meta:auth_secret", SECRET); }
}

const normEmail = (e) => String(e || "").trim().toLowerCase();
function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 32).toString("hex");
}

/* ---- tokens: base64url(email|expiry) + hmac ---- */
function sign(email, days = 90) {
  const exp = Date.now() + days * 86400e3;
  const body = Buffer.from(email + "|" + exp).toString("base64url");
  const mac = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return body + "." + mac;
}
function verify(token) {
  try {
    const [body, mac] = String(token || "").split(".");
    const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
    const [email, exp] = Buffer.from(body, "base64url").toString().split("|");
    if (Date.now() > Number(exp)) return null;
    return email;
  } catch { return null; }
}

/* ---- account operations ---- */
async function register({ name, email, password, role = "bride" }) {
  email = normEmail(email);
  if (!/.+@.+\..+/.test(email)) return { error: "Please enter a valid email address." };
  if (String(password || "").length < 6) return { error: "Password must be at least 6 characters." };
  const salt = crypto.randomBytes(16).toString("hex");
  const user = { email, name: String(name || "").trim() || email.split("@")[0],
    role, salt, hash: hashPassword(password, salt), createdAt: Date.now() };
  const created = await db.insertIfAbsent("user:" + email, user);
  if (!created) return { error: "An account with this email already exists." };
  return { user: publicUser(user), token: sign(email) };
}
async function login({ email, password }) {
  email = normEmail(email);
  const user = await db.get("user:" + email);
  if (!user || user.hash !== hashPassword(password, user.salt))
    return { error: "Email or password is incorrect." };
  return { user: publicUser(user), token: sign(email) };
}
async function fromRequest(req) {
  const m = String(req.headers.authorization || "").match(/^Bearer (.+)$/);
  const email = m && verify(m[1]);
  if (!email) return null;
  const user = await db.get("user:" + email);
  return user ? publicUser(user) : null;
}
const publicUser = (u) => ({ id: u.id || u.email || u.phone, email: u.email, phone: u.phone,
  name: u.name, age: u.age, city: u.city, role: u.role, createdAt: u.createdAt });

/* ================= WhatsApp OTP flow =================
   Codes are 6 digits, stored only as HMAC hashes, valid 5 minutes.
   Rate limits: 60s between sends, 5 sends/hour, 5 verify attempts/code. */
const whatsapp = require("./whatsapp");
const OTP_TTL = 5 * 60e3;

/* Oman-friendly normalization to E.164: 8-digit local numbers get +968. */
function normPhone(raw) {
  let d = String(raw || "").replace(/[^\d]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 8) d = "968" + d;
  if (d.length < 10 || d.length > 15) return null;
  return "+" + d;
}
const hashCode = (phone, code) =>
  crypto.createHmac("sha256", SECRET).update(phone + "|" + code).digest("hex");

async function startOtp({ phone }) {
  const p = normPhone(phone);
  if (!p) return { error: "Please enter a valid phone number." };
  const now = Date.now();
  const rec = (await db.get("otp:" + p)) || { sends: [] };
  rec.sends = (rec.sends || []).filter(t => now - t < 3600e3);
  if (rec.lastSentAt && now - rec.lastSentAt < 60e3)
    return { error: "Please wait a minute before requesting another code." };
  if (rec.sends.length >= 5)
    return { error: "Too many codes requested. Try again in an hour." };

  const code = String(crypto.randomInt(100000, 1000000));
  const send = whatsapp.isConfigured()
    ? await whatsapp.sendOtp(p, code)
    : (process.env.OTP_DEBUG === "true" ? { sent: true, debug: true } : { sent: false, reason: "whatsapp_not_configured" });
  if (!send.sent)
    return { error: send.reason === "whatsapp_not_configured"
      ? "WhatsApp sign-in isn't available yet. Please try again later."
      : "We couldn't send the code. Check the number and try again." };

  rec.hash = hashCode(p, code); rec.exp = now + OTP_TTL; rec.attempts = 0;
  rec.lastSentAt = now; rec.sends.push(now);
  await db.set("otp:" + p, rec);
  const existing = !!(await db.get("user:" + p));
  const out = { sent: true, phone: p, existing };
  if (send.debug) out.devCode = code;           // OTP_DEBUG=true only (local testing)
  return out;
}

async function verifyOtp({ phone, code, name, age, city }) {
  const p = normPhone(phone);
  if (!p) return { error: "Please enter a valid phone number." };
  const rec = await db.get("otp:" + p);
  if (!rec || !rec.hash || Date.now() > rec.exp)
    return { error: "This code has expired. Request a new one." };
  if ((rec.attempts || 0) >= 5)
    return { error: "Too many attempts. Request a new code." };
  if (hashCode(p, String(code || "").trim()) !== rec.hash) {
    rec.attempts = (rec.attempts || 0) + 1; await db.set("otp:" + p, rec);
    return { error: "That code doesn't match. Please check and try again." };
  }
  let user = await db.get("user:" + p);
  if (!user) {
    // validate the profile BEFORE consuming the code, so a missing field
    // doesn't burn the OTP — the bride can fix it and resubmit the same code
    const n = String(name || "").trim();
    const a = parseInt(age, 10);
    const c = String(city || "").trim();
    if (!n) return { error: "Please enter your name." };
    if (!(a >= 18 && a <= 100)) return { error: "Please enter your age (18 or over)." };
    if (!c) return { error: "Please choose your city." };
    user = { id: p, phone: p, name: n, age: a, city: c, role: "bride", createdAt: Date.now() };
    await db.set("user:" + p, user);
  }
  // consume the code (single use) but keep the send history so rate limits survive
  await db.set("otp:" + p, { sends: rec.sends || [], lastSentAt: rec.lastSentAt });
  return { user: publicUser(user), token: sign(p) };
}

/* seed the admin account from env on boot */
async function seedAdmin() {
  const email = normEmail(process.env.ADMIN_EMAIL);
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) return;
  const salt = crypto.randomBytes(16).toString("hex");
  await db.insertIfAbsent("user:" + email, { email, name: "Admin", role: "admin",
    salt, hash: hashPassword(pass, salt), createdAt: Date.now() });
}

module.exports = { init, register, login, fromRequest, seedAdmin, normEmail,
  startOtp, verifyOtp, normPhone };
