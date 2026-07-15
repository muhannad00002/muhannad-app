/* ============================================================================
   Zaffa storage layer.
   - Production: PostgreSQL when DATABASE_URL is set (Render/Railway/Supabase…)
   - Local dev:  a JSON file next to this module (zero setup)
   One tiny key/value API with JSONB values keeps both backends identical:
     user:<email>     account record
     sub:<userId>     subscription record
     order:<orderId>  payment order record
     catalog:<key>    admin-managed content (categories/vendors/tips/ads)
     meta:<key>       server secrets (generated auth secret, …)
   ============================================================================ */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, ".data.json");
let pool = null;
const usePg = !!process.env.DATABASE_URL;

async function init() {
  if (!usePg) return;
  const { Pool } = require("pg");  // lazy: only needed in production
  pool = new Pool({ connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "off" ? false : { rejectUnauthorized: false } });
  await pool.query(`CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

/* ---- file fallback ---- */
function fileRead() { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; } }
function fileWrite(o) { fs.writeFileSync(FILE, JSON.stringify(o, null, 2)); }

/* ---- kv api ---- */
async function get(key) {
  if (usePg) { const r = await pool.query("SELECT value FROM kv WHERE key=$1", [key]); return r.rows[0]?.value ?? null; }
  return fileRead()[key] ?? null;
}
async function set(key, value) {
  if (usePg) { await pool.query(
    "INSERT INTO kv(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2, updated_at=now()", [key, value]); return; }
  const o = fileRead(); o[key] = value; fileWrite(o);
}
/* atomic create — returns false if the key already exists (e.g. duplicate email) */
async function insertIfAbsent(key, value) {
  if (usePg) { const r = await pool.query(
    "INSERT INTO kv(key,value) VALUES($1,$2) ON CONFLICT(key) DO NOTHING", [key, value]); return r.rowCount === 1; }
  const o = fileRead(); if (key in o) return false; o[key] = value; fileWrite(o); return true;
}
async function del(key) {
  if (usePg) { await pool.query("DELETE FROM kv WHERE key=$1", [key]); return; }
  const o = fileRead(); delete o[key]; fileWrite(o);
}
async function list(prefix) {
  if (usePg) { const r = await pool.query("SELECT key,value FROM kv WHERE key LIKE $1", [prefix + "%"]);
    return r.rows.map(x => ({ key: x.key, value: x.value })); }
  const o = fileRead();
  return Object.keys(o).filter(k => k.startsWith(prefix)).map(k => ({ key: k, value: o[k] }));
}

module.exports = { init, get, set, insertIfAbsent, del, list, usePg };
