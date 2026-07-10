/* Uploads seed/*.json to Firestore in batches.
   Prereqs:
     npm install            (in this firebase/ directory)
     Service account key: Firebase console → Project settings → Service accounts
       → Generate new private key → save as serviceAccount.json here (gitignored)
   Usage: node upload-seed.js */
const fs = require("fs"), path = require("path");
const admin = require("firebase-admin");

const keyPath = path.join(__dirname, "serviceAccount.json");
if (!fs.existsSync(keyPath)) {
  console.error("Missing serviceAccount.json — download it from Firebase console → Project settings → Service accounts.");
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db = admin.firestore();

(async () => {
  const seedDir = path.join(__dirname, "seed");
  const files = fs.readdirSync(seedDir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const name = path.basename(file, ".json");
    const data = JSON.parse(fs.readFileSync(path.join(seedDir, file), "utf8"));
    if (Array.isArray(data)) {
      let batch = db.batch(), n = 0, written = 0;
      for (const row of data) {
        batch.set(db.collection(name).doc(String(row.id || db.collection(name).doc().id)), row);
        if (++n === 400) { await batch.commit(); written += n; batch = db.batch(); n = 0; }
      }
      if (n) { await batch.commit(); written += n; }
      console.log(name.padEnd(12), written, "docs");
    } else {
      for (const [docId, doc] of Object.entries(data))
        await db.collection(name).doc(docId).set(doc);
      console.log(name.padEnd(12), Object.keys(data).length, "docs");
    }
  }
  console.log("done — check the Firestore console.");
})().catch(e => { console.error(e); process.exit(1); });
