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
const publicUser = (u) => ({ email: u.email, name: u.name, role: u.role, createdAt: u.createdAt });

/* seed the admin account from env on boot */
async function seedAdmin() {
  const email = normEmail(process.env.ADMIN_EMAIL);
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) return;
  const salt = crypto.randomBytes(16).toString("hex");
  await db.insertIfAbsent("user:" + email, { email, name: "Admin", role: "admin",
    salt, hash: hashPassword(pass, salt), createdAt: Date.now() });
}

module.exports = { init, register, login, fromRequest, seedAdmin, normEmail };
