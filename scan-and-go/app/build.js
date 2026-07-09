/* Rebuilds index.html from the parts/ sources.
   index.html is a committed build artifact so the app stays a single
   openable file — run `node build.js` after editing anything in parts/. */
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "parts");
const parts = fs.readdirSync(dir).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
let out = fs.readFileSync(path.join(dir, "01-head.html"), "utf8") + '<div id="root"></div>\n';
for (const p of parts) out += "<script>\n" + fs.readFileSync(path.join(dir, p), "utf8") + "</script>\n";
fs.writeFileSync(path.join(__dirname, "index.html"), out);
console.log("built index.html from", parts.length, "parts");
