/* Rebuilds index.html (customer app) and admin.html (separate admin panel)
   from the parts/ sources. Both are committed build artifacts so the app
   stays openable as single files — run `node build.js` after editing parts/.
   admin.html is byte-identical except it sets window.ZAFFA_ADMIN=true, which
   boots straight into the access-controlled admin panel. */
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "parts");
const parts = fs.readdirSync(dir).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
const head = fs.readFileSync(path.join(dir, "01-head.html"), "utf8");
const scripts = parts.map(p => "<script>\n" + fs.readFileSync(path.join(dir, p), "utf8") + "\n</script>").join("\n");

function build(file, headExtra) {
  const out = "<!doctype html>\n<html lang=\"en\">\n<head>\n" + head + (headExtra || "") +
    "</head>\n<body>\n<div id=\"root\"></div>\n" + scripts + "\n</body>\n</html>\n";
  fs.writeFileSync(path.join(__dirname, file), out);
}
build("index.html");
build("admin.html", "<script>window.ZAFFA_ADMIN=true;</script>\n");
console.log("built index.html + admin.html from", parts.length, "parts");
