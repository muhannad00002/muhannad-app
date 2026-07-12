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
- **Select vendor** — completes the matching checklist item automatically.
- **Favourites, global search, notifications, profile & budget.**

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
| `07-admin.js`  | Admin dashboard & all management screens |
| `08-boot.js`   | Boot & initial render |
