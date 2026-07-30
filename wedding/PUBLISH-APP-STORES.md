# Bride & Co — Native iOS & Android + Store Publishing Guide

The app is already wrapped for native with **Capacitor** (`capacitor.config.json`).
The web app (`app/`) is the single source; Capacitor bundles it into a real
iOS and Android app that talks to your Vercel backend.

- **App name:** Bride & Co
- **App ID (bundle id):** `com.brideandco.app`
- **Backend:** `https://weddingandco.vercel.app` (already wired in the app)

---

## 0. What you need first

| For | You need |
|-----|----------|
| **Both** | Node.js 18+ installed |
| **iOS** | A **Mac** with **Xcode** (App Store, free) + an **Apple Developer account** ($99/year) |
| **Android** | **Android Studio** (free, any OS) + a **Google Play Console** account ($25 one-time) |

> ⚠️ **iOS builds require a Mac.** There is no way around this for App Store
> submission. Android can be built on Windows/Mac/Linux.

---

## 1. One-time: add Capacitor and the native projects

From the `wedding/` folder:

```bash
cd wedding
npm install
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm install @capacitor/splash-screen @capacitor/status-bar

# create the native projects (creates ios/ and android/ folders)
npx cap add ios
npx cap add android
```

## 2. App icon & splash screen

Put a **1024×1024 PNG** icon at `wedding/resources/icon.png` and a
**2732×2732 PNG** splash at `wedding/resources/splash.png`, then:

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --iconBackgroundColor '#2B2B2F' --splashBackgroundColor '#2B2B2F'
```

This auto-creates every icon/splash size for both platforms.

## 3. Build the web app and sync it into native

Run this **every time you change the app**:

```bash
npm run build          # regenerates app/index.html + admin.html
npx cap sync           # copies the web app into ios/ and android/
```

---

## 4. iOS → App Store

```bash
npx cap open ios       # opens the project in Xcode
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** → check
   *Automatically manage signing* → pick your **Team** (your Apple Developer account).
2. Set **Bundle Identifier** to `com.brideandco.app`.
3. Set the **Version** (e.g. 1.0.0) and **Build** (e.g. 1).
4. Choose **Any iOS Device (arm64)** as the run target.
5. Menu **Product → Archive**. When it finishes, the Organizer opens.
6. **Distribute App → App Store Connect → Upload**.

Then in **App Store Connect** (appstoreconnect.apple.com):
1. **My Apps → + → New App** → name *Bride & Co*, bundle id `com.brideandco.app`, language, SKU.
2. Fill the listing (see §6), attach the build you uploaded.
3. Add it to **TestFlight** first to test on your phone, then **Submit for Review**.

> 🍎 **IAP rule:** Apple requires **digital subscriptions to use Apple In‑App
> Purchase**, *not* Bank Muscat. The app already has Apple IAP scaffolding
> (`server/apple.js`); on iOS the paywall should use it. You'll create the two
> subscription products (`com.brideandco.premium.monthly`,
> `...annual`) in App Store Connect → **In-App Purchases**. Bank Muscat stays
> for the **web** version. (If premium isn't ready for iOS at launch, ship the
> app free and add the subscription in an update.)

## 5. Android → Google Play

```bash
npx cap open android   # opens the project in Android Studio
```

In Android Studio:
1. Let Gradle sync finish.
2. **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**.
3. Create a new **keystore** (⚠️ back it up + remember the passwords — you can
   never update the app without it), then build the **release** `.aab`.

Then in **Google Play Console** (play.google.com/console):
1. **Create app** → name *Bride & Co*, default language, app (not game), free.
2. Complete **Dashboard** setup tasks (privacy policy, data safety, content
   rating, target audience).
3. **Production → Create new release** → upload the `.aab` → roll out.

> 🤖 Google also requires **Play Billing for digital goods**, but you can request
> the standard flow. Physical/vendor services aren't digital goods; the premium
> subscription is — same consideration as Apple.

---

## 6. Store listing assets you'll need (both stores)

- **App name:** Bride & Co
- **Subtitle / short description:** Plan your wedding & find vendors in Oman
- **Description:** (a paragraph on planning, checklist, vendors, budget, Aya AI)
- **Keywords:** wedding, planner, Oman, vendors, marriage, checklist
- **Screenshots:** 6.7" iPhone + 5.5" iPhone (iOS); phone + 7"/10" tablet
  (Android). Capture from the running app.
- **App icon:** 1024×1024 (from step 2)
- **Privacy Policy URL:** **required by both stores.** Host a simple page (a
  `privacy.html` on your Vercel domain works). Must state you collect phone
  number + name for account/OTP and don't sell data.
- **Support URL / email**
- **Age rating:** 4+ / Everyone

---

## 7. Every update after launch

```bash
cd wedding
npm run build
npx cap sync
# bump Version/Build in Xcode (iOS) and versionCode/versionName in Android
# re-archive & upload (iOS) / regenerate signed .aab (Android)
```

The **web** app on Vercel updates instantly on every `git push` to `main` — no
store review needed. Only native shell changes require a new store build.
