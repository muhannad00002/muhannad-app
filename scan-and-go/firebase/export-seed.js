/* Exports the app's seeded demo data to Firestore-ready JSON.
   Runs the real data layer (app/parts/02-data.js) in Node with browser shims,
   so the exported data always matches what the app itself would seed.
   Usage: node export-seed.js   → writes seed/<collection>.json */
const fs = require("fs"), path = require("path"), vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "../app/parts/02-data.js"), "utf8");
const sandbox = {
  window: {}, console,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  setTimeout, clearTimeout, Date, Math, JSON,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src + "\n;globalThis.__export = {DB};", sandbox);
const DB = sandbox.__export.DB;

const collections = ["branches","vendors","products","employees","orders","movements",
  "tickets","tenants","coupons","settlements"];
const outDir = path.join(__dirname, "seed");
fs.mkdirSync(outDir, { recursive: true });

let total = 0;
for (const name of collections) {
  const rows = DB[name] || [];
  fs.writeFileSync(path.join(outDir, name + ".json"), JSON.stringify(rows, null, 1));
  total += rows.length;
  console.log(name.padEnd(12), rows.length, "docs");
}
/* single-doc configs go into a `config` collection */
const config = { settings: DB.settings, splash: DB.splash, subscription: DB.subscription,
  store: { name: DB.storeName, logo: DB.storeLogo } };
fs.writeFileSync(path.join(outDir, "config.json"), JSON.stringify(config, null, 1));
console.log("config      ", Object.keys(config).length, "docs");
console.log("total", total + Object.keys(config).length, "documents →", outDir);
