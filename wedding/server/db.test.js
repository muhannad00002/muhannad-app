/* Regression test for the JSONB serialization bug.
   node-postgres serializes a JS array as a Postgres ARRAY literal ({...}),
   which a jsonb column rejects with "invalid input syntax for type json".
   db.set must JSON.stringify the value so arrays/objects/scalars all store as
   valid JSON. We stub the `pg` module so no real database (or install) is needed. */
const Module = require("module");

const queries = [];
const fakePool = {
  query: async (sql, params) => {
    queries.push({ sql, params });
    if (/CREATE TABLE/i.test(sql)) return {};
    if (/SELECT/i.test(sql)) return { rows: [] };
    return { rowCount: 1, rows: [] };
  },
};
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "pg") return { Pool: function () { return fakePool; } };
  return origLoad.call(this, request, ...rest);
};

process.env.DATABASE_URL = "postgres://fake/db"; // force the pg path
const db = require("./db");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ " + name); } };

(async () => {
  await db.init();

  // array of objects — the exact case that used to 500
  await db.set("catalog:vendors", [{ id: "v1", name: "Rose & Ivory" }]);
  let q = queries[queries.length - 1];
  ok("array param is a string (stringified)", typeof q.params[1] === "string");
  ok("array param is valid JSON", (() => { try { const p = JSON.parse(q.params[1]); return Array.isArray(p) && p[0].id === "v1"; } catch { return false; } })());
  ok("uses ::jsonb cast", /\$2::jsonb/.test(q.sql));

  // object, scalar number, and string all round-trip as valid JSON
  await db.set("user:a@b.com", { email: "a@b.com", role: "admin" });
  ok("object stores valid JSON", (() => { try { return JSON.parse(queries[queries.length - 1].params[1]).role === "admin"; } catch { return false; } })());

  await db.set("catalog:version", 1730000000000);
  ok("number stores valid JSON", JSON.parse(queries[queries.length - 1].params[1]) === 1730000000000);

  await db.insertIfAbsent("voucher:X", { code: "X" });
  q = queries[queries.length - 1];
  ok("insertIfAbsent stringifies + casts", typeof q.params[1] === "string" && /\$2::jsonb/.test(q.sql));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("DB TEST ERROR:", e.message); process.exit(1); });
