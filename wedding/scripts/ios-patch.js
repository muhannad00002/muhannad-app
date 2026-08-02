/* Post-generation patch for the native iOS project.
 *
 * Capacitor's CLI scaffolds an AppDelegate.swift whose Universal-Links handler
 * calls `ApplicationDelegateProxy.shared.application(_:continue:restorationHandler:)`,
 * but that overload isn't present in the Capacitor Swift library resolved via
 * SPM — so Xcode fails to build with:
 *   "Cannot convert value of type 'NSUserActivity' to expected argument type 'URL'"
 *
 * This app doesn't use Universal Links, so we remove that one method. The script
 * is idempotent (safe to run on every sync) and does nothing if iOS isn't added.
 */
const fs = require("fs");
const path = require("path");

/* The admin panel is web-only — never ship it inside the store build. Capacitor
   copies the whole web folder, so remove admin.html from the native bundles. */
for (const p of [
  path.join(__dirname, "..", "ios", "App", "App", "public", "admin.html"),
  path.join(__dirname, "..", "android", "app", "src", "main", "assets", "public", "admin.html"),
]) {
  try {
    if (fs.existsSync(p)) { fs.unlinkSync(p); console.log("native-patch: removed admin.html from the native bundle"); }
  } catch (e) { /* platform not added — nothing to strip */ }
}

const file = path.join(__dirname, "..", "ios", "App", "App", "AppDelegate.swift");
try {
  let src = fs.readFileSync(file, "utf8");
  const re = /[ \t]*func application\(_ application: UIApplication, continue userActivity:[\s\S]*?\n[ \t]*\}\n/;
  if (re.test(src)) {
    fs.writeFileSync(file, src.replace(re, ""));
    console.log("ios-patch: removed the unused Universal-Links AppDelegate method");
  } else {
    console.log("ios-patch: nothing to patch (already clean)");
  }
} catch (e) {
  // iOS project not generated yet — nothing to do.
  console.log("ios-patch: skipped (no ios/App/App/AppDelegate.swift)");
}
