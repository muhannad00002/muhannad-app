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

/* Declare export-compliance up front. The app only uses standard HTTPS/TLS,
   which is exempt, so setting this stops App Store Connect asking the
   "App Encryption Documentation" questions on every single upload. */
const plist = path.join(__dirname, "..", "ios", "App", "App", "Info.plist");
try {
  let xml = fs.readFileSync(plist, "utf8");
  if (xml.includes("ITSAppUsesNonExemptEncryption")) {
    console.log("ios-patch: encryption key already present");
  } else {
    const i = xml.lastIndexOf("</dict>");
    if (i > -1) {
      xml = xml.slice(0, i) + "\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n" + xml.slice(i);
      fs.writeFileSync(plist, xml);
      console.log("ios-patch: declared ITSAppUsesNonExemptEncryption = false");
    }
  }
} catch (e) {
  console.log("ios-patch: skipped Info.plist (iOS project not generated yet)");
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
