# Zaffa — Wedding Planner & Marketplace

Zaffa is a complete, production-quality mobile web app (installable PWA for
iOS & Android) that acts as a bride's **personal wedding planner** and a
**curated vendor marketplace**. Every service she needs for the wedding lives
in one elegant place — no more hunting through Instagram.

**Live:** `wedding/app/index.html#/welcome`

## What's inside

**Bride experience**
- **Onboarding** — name, wedding date and budget; generates a personalised plan.
- **Home** — greeting, live day-by-day countdown, animated progress ring,
  smart suggested tasks, category grid, featured-vendor rail, promoted banner
  and a wedding-tips carousel.
- **Smart checklist (core)** — 38 tasks grouped by phase. Each item cycles
  Not started → In progress → Done. Marking a vendor task done updates
  progress everywhere. The checklist is *intelligent*: completing a task
  surfaces related next steps (e.g. finishing the Hall suggests Decoration,
  Catering, Lighting, Photography; finishing the Dress suggests Shoes,
  Accessories, Jewellery, Veil, Bouquet).
- **Explore & vendor lists** — 35 categories, filter by city / price / rating
  / offers and sort; every vendor has a rich detail page with gallery,
  packages, reviews, working hours, and WhatsApp / call / Instagram / map
  actions.
- **Select vendor → pick a date → save to calendar** — selecting a vendor opens
  an appointment picker (date & time). Confirming books the vendor, completes
  the matching checklist item, and offers **Add to Google Calendar** or a
  downloadable **.ics** file (Apple / Outlook) with a day-before reminder. All
  appointments are collected in an **Appointments** screen and surfaced on Home.
- **Aya — AI assistant** — a chat where the bride can ask for advice: next
  steps, budget breakdowns, top-rated vendor recommendations for any service,
  timeline pacing and planning tips, all grounded in her own plan data. Runs
  fully offline as a context-aware advisor (and is structured so it can be
  wired to the Claude API for open-ended conversation).
- **Favourites, global search, notifications, profile & budget.**

**Monetization (freemium)**
- Income comes from an in-app **monthly subscription, kept under US$3/month**
  (Monthly $2.99, Annual $24 ≈ $2.00/month).
- Free tier: browse **3 vendor categories** and send **3 assistant messages**;
  beyond that an elegant paywall invites the bride to **Zaffa Premium**, which
  unlocks unlimited categories, unlimited AI chat, calendar sync and smart
  reminders.
- **Real payment providers, integration-ready:** the checkout layer
  (`app/parts/08-payments.js`) auto-selects **Apple In-App Purchase** on the
  native iOS app and **Bank Muscat SmartPay** (hosted redirect) on the web,
  falling back to a simulated **demo** unlock when no backend is configured
  (so the standalone HTML still works). A dependency-free reference **backend**
  lives in [`server/`](server/) — it implements SmartPay's AES-256-GCM
  request/response contract and Apple receipt verification, with a self-test
  (`node server/test.js`). Full setup in [INTEGRATION.md](INTEGRATION.md).

**Admin dashboard**
- Analytics overview, full **vendor CRUD** (add / edit / delete / approve /
  feature / add offers), **category CRUD** (unlimited new categories),
  user management, broadcast notifications, advertisements, wedding tips and
  a checklist-template view. Admin changes persist and appear instantly in the
  bride app.

## Design

Modern, elegant, feminine and minimal — cream, warm white, rose gold and
champagne, generous whitespace, premium serif display type, soft shadows,
rounded cards and smooth animations, following Apple's Human Interface
Guidelines. Full light & dark themes.

## Architecture

Pure vanilla JS single-page app with a hash router and an in-browser store
persisted to `localStorage` — fully offline, no build dependencies, no
network calls (vendor artwork is generated deterministically). The source of
truth is `app/parts/`; `app/index.html` is a committed build artifact.

**Run it**

```sh
node wedding/app/serve.js       # → http://localhost:8742
```

**Edit & rebuild**

```sh
# edit files in wedding/app/parts/, then:
node wedding/app/build.js
```

### Parts

| File | Responsibility |
|------|----------------|
| `01-head.html` | Design system (CSS variables, components, themes) |
| `02-data.js`   | Seed data: categories, vendors, checklist template, tips, ads, users |
| `03-ui.js`     | UI toolkit: element builder, icons, generated cover art, toasts, sheets, rings, confetti |
| `04-core.js`   | State store, persistence, router, derived data, app shell |
| `05-bride-a.js`| Onboarding, home, explore, smart checklist |
| `06-bride-b.js`| Vendor lists, vendor detail, search, favourites, notifications, profile |
| `07-assistant.js`| Aya AI assistant, premium paywall, appointment booking & calendar export |
| `08-payments.js`| Client checkout layer (Apple IAP · Bank Muscat SmartPay · demo) + return route |
| `09-admin.js`  | Admin dashboard & all management screens |
| `10-boot.js`   | Boot & initial render |

Backend: [`server/`](server/) — accounts (email/password, scrypt), PostgreSQL
storage with local JSON fallback (`db.js`), cloud catalog API, `smartpay.js`
(Bank Muscat SmartPay, AES-256-GCM), `apple.js` (Apple receipt/JWS
verification), `test.js` (self-test). Deploy it in one click with the Render
blueprint — see [DEPLOY.md](DEPLOY.md); payment details in
[INTEGRATION.md](INTEGRATION.md).
