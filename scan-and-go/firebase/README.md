# Sayr — Firebase database package

Everything needed to stand up the Firestore database that will back the real
app. The seed data is exported from the same code the demo runs, so Firestore
starts with exactly the catalog, branches, vendors and order history you see
in the demo.

## One-time setup (needs your Google account)

```sh
npm install -g firebase-tools
firebase login                      # opens the browser
firebase projects:create sayr-oman  # or create it at console.firebase.google.com
```

In the [Firebase console](https://console.firebase.google.com) → your project →
**Build → Firestore Database → Create database** (production mode, region
`me-central1` — closest to Oman).

## Deploy rules + upload the seed data

```sh
cd scan-and-go/firebase
firebase use sayr-oman
firebase deploy --only firestore   # rules + indexes

node export-seed.js                # regenerates seed/*.json from the app's data layer
npm install                        # installs firebase-admin
# download a service-account key: console → Project settings → Service accounts
#   → Generate new private key → save here as serviceAccount.json
node upload-seed.js                # writes ~1,100 documents to Firestore
```

`serviceAccount.json` is a **secret** — it is gitignored; never commit it.

## What this is (and isn't) yet

The demo app still runs on its simulated in-browser backend — by design, so it
works offline and in TestFlight with zero setup. This package prepares the
database side: collections, rules, indexes and seed content. Wiring the app to
read from Firestore (auth, live queries, checkout transactions) is the
"real backend" milestone before the public App Store release.
