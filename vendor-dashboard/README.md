# Oman Wedding Vendors — Dashboard

A fast, **zero-build** web dashboard to browse, filter and export the vendor
data collected by the [`vendor_collector`](../vendor_collector) app. Pure static
HTML/CSS/JS — no framework, no server, no database — so it deploys to Vercel in
minutes and costs nothing to run.

## Features

- 🔎 **Instant search** across name, phone, address, website, category.
- 🎛️ **Filters**: governorate, category, minimum rating, has-phone, has-website,
  operational-only. Filter chips show live counts.
- ↕️ **Sortable** columns + sort presets; adjustable page size / pagination.
- 📊 **Live stat tiles**: vendors in view, average rating, % with phone, % with
  website, governorate & category coverage — all recomputed as you filter.
- ✅ **Row selection** for targeted exports.
- ⬇️ **Exports**: CSV (Excel-ready, UTF-8 BOM so Arabic names render), JSON,
  current-view / selected / everything, plus a ready-to-use **WhatsApp contact
  list** (`wa.me` links) for outreach.
- 📞 Click-to-call, click-to-WhatsApp, one-tap Google Maps & website links.
- 📥 **Load data** button / drag-and-drop — open a fresh `vendors.json` or CSV
  export without redeploying (persisted in your browser).
- 🌗 Light / dark theme, fully responsive.

## Getting your data in

The dashboard reads a single `vendors.json` file. Two ways to refresh it:

### A. Regenerate + redeploy (permanent)
```bash
cd ../vendor_collector
python app.py                 # collect (e.g. option 4 = Entire Oman)
python export_dashboard.py    # writes ../vendor-dashboard/vendors.json
cd ../vendor-dashboard
git add vendors.json && git commit -m "Refresh vendor data" && git push
```
Vercel redeploys automatically on push.

### B. Upload in the browser (instant, no deploy)
Click **Load data** (or drag the file onto the page) and pick the
`vendors.json` / `vendors.csv` produced by the collector. It's stored locally in
your browser and survives refreshes.

> The bundled `vendors.json` is **sample data** (you'll see a "SAMPLE DATA"
> badge) so the page isn't empty before your first real export.

## Deploy to Vercel

You can't be logged into your Vercel account from here, so pick one:

### Option 1 — Vercel dashboard (no CLI)
1. Go to **vercel.com → Add New → Project** and import
   `muhannad00002/muhannad-app`.
2. Set **Root Directory** to `vendor-dashboard`.
3. Framework preset: **Other**. Build command: *(leave empty)*.
   Output directory: *(leave empty / `.`)*.
4. **Deploy.** Done — you get a `*.vercel.app` URL.

### Option 2 — Vercel CLI
```bash
npm i -g vercel
cd vendor-dashboard
vercel          # first run links/creates the project
vercel --prod   # promote to production
```

Because it's fully static, there's nothing to configure — `vercel.json` only
sets sensible cache/security headers.

## Local preview
```bash
cd vendor-dashboard
python -m http.server 5173      # then open http://localhost:5173
```

## Privacy note

All data stays client-side — filtering, exporting and uploads happen in your
browser. Nothing is sent to any server. If you deploy publicly, remember the
bundled `vendors.json` is served to anyone with the URL; keep real business data
private by using Vercel's password protection or an access-controlled project if
needed.
