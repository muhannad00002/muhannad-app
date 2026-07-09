# Scan & Go — Technical Architecture Plan

Source requirements: [requirements.txt](./requirements.txt)

## 1. System Overview

Two client applications backed by one multi-tenant API:

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Customer App    │     │      Backend API      │     │  Merchant App    │
│  (Expo / RN)     │────▶│  NestJS + PostgreSQL  │◀────│  (Next.js web)   │
│  scan, cart, pay │     │  Redis + BullMQ       │     │  dashboard, POS  │
└─────────────────┘     └──────────┬───────────┘     └─────────────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
               Payments        WhatsApp/Email   Object storage
               (gateway)       notifications    (product images,
                                                receipt/label PDFs)
```

- **Customer app** — mobile (iOS/Android). Needs camera QR scanning, push
  notifications, a fast cart. Native mobile via Expo is the right call; a PWA
  fallback can come later.
- **Merchant app** — responsive web dashboard. Runs on desktop for management
  and on a tablet at the register for cashier checkout (webcam or USB scanner
  input). One codebase, role-gated views.
- **Vendor portal** — a role-restricted area of the merchant web app, not a
  separate application. Vendors are just users with a `vendor` role scoped to
  their own products.

## 2. Recommended Stack

| Layer | Choice | Why |
|---|---|---|
| Backend API | Node.js + **NestJS** (TypeScript) | Modular structure maps cleanly to the feature domains (products, orders, vendors…); first-class guards for role/plan gating. |
| Database | **PostgreSQL** + Prisma ORM | Relational fits orders/inventory/settlements; row-level tenant scoping. |
| Cache / queues | **Redis + BullMQ** | Sessions, rate limits, and the scheduled daily vendor summaries. |
| Customer app | **Expo (React Native)** | Camera QR scanning, push notifications, OTA updates, single codebase for both stores. |
| Merchant app | **Next.js + Tailwind + shadcn/ui** | Fast dashboard development; server components for reports. |
| Object storage | S3-compatible (AWS S3 / Cloudflare R2) | Product images, QR label PDFs, receipts, report exports. |
| Payments | Regional gateway — **Moyasar / Tap / HyperPay** (mada + Apple Pay) or **Stripe** if operating outside the Gulf | Card-present is handled by the store's existing terminal; the gateway covers in-app payment. |
| Subscriptions | Stripe Billing (or manual invoicing at first) | Plan entitlements enforced in the API, not the billing provider. |
| Email | Resend or SES | Vendor summaries, receipts. |
| WhatsApp | Meta WhatsApp Business API (via Twilio or 360dialog) | Daily vendor summaries — template messages. |
| Monorepo | Turborepo + pnpm | `apps/api`, `apps/merchant-web`, `apps/customer-app`, `packages/shared` (types, validation schemas). |

All TypeScript end-to-end so DTOs/validation (zod) are shared between API and
both clients.

## 3. Multi-Tenancy Model

- Single database, shared schema. Every tenant-owned row carries `store_id`.
- A **Store** is the tenant (the paying merchant). **Branches** belong to a
  store. **Vendors** belong to a store (a brand sold inside that boutique).
- Enforcement in one place: a Prisma middleware / Nest interceptor injects
  `store_id` from the authenticated context into every query. Postgres RLS can
  be added as a second line of defense later.
- Customers are global users (one account works across stores); their link to
  a store is per-session (entrance QR) and per-order.

## 4. Core Data Model

```
Store ──< Branch
Store ──< StoreUser (role: owner | manager | cashier | vendor)
Store ──< Vendor ──< VendorUser
Store ──< Category ──< Product >── Vendor (nullable)
Product ──< ProductImage
Product ──< InventoryLevel >── Branch      (qty per branch)
InventoryLevel ──< StockMovement           (adjustment, sale, transfer, import)

Customer (global) ──< Cart ──< CartItem
Cart ──> CheckoutToken                     (short-lived, signed)
Customer ──< Order ──< OrderItem
Order ──> Payment (method: cash | card | gateway; status)
Order ──> Receipt (rendered snapshot + PDF)

Vendor ──< Settlement (period, gross, commission, net, status)
Store ──> Subscription ──> Plan (limits: branches, employees, products, features)
Store ──< ActivityLog (actor, action, entity, before/after)
```

Key modeling decisions:

- **Orders snapshot everything.** `OrderItem` copies name, price, tax rate,
  and vendor at time of sale — price changes never rewrite history, and vendor
  reporting/settlements read from order items, not live products.
- **Inventory is per-branch** via `InventoryLevel`; every change goes through
  `StockMovement` so "inventory history" is free and auditable.
- **Plan limits live in the `Plan` row** (max products, employees, branches,
  feature flags like `vendor_portal`, `api_access`) and are enforced by a
  Nest guard — adding/changing tiers is data, not code.

## 5. The QR Flows (the heart of the product)

Three distinct QR types, deliberately different formats:

1. **Entrance QR** (static, printed once per branch)
   Deep link: `scango://store/{storeSlug}/{branchId}` (+ universal link for
   users without the app → app store). Scanning sets the shopping context.

2. **Product QR** (static, printed labels)
   Encodes `{storeId}:{productId}` (or just the barcode/SKU — the API resolves
   either). Generated server-side as PDF label sheets (product name, price,
   QR) via a headless renderer; batch export per category/vendor.

3. **Checkout QR** (dynamic, security-sensitive)
   A short-lived **signed token** (JWT, ~5 min TTL, single-use) referencing
   the cart id — *not* the cart contents. The cashier station scans it, the
   API loads the live cart server-side, cashier reviews/adjusts, applies
   discounts, takes payment, completes the order, and stock decrements
   atomically in one transaction. Nothing the customer's phone displays is
   trusted for pricing.

Checkout state machine:

```
cart(open) → checkout_token issued → scanned(locked) → reviewed
      → payment(pending → paid) → order(completed) → receipt issued
                          ↘ cancelled/expired → cart(open)
```

Locking the cart when the cashier scans prevents the customer adding items
mid-payment.

## 6. Vendor Automation

- **Daily summary job**: a BullMQ cron per store timezone aggregates the day's
  `OrderItem`s per vendor — units sold, sales value, remaining stock, low/out
  of stock, pending settlement — and dispatches via the vendor's chosen
  channels (email, WhatsApp template, in-portal notification). Idempotent per
  `(vendor, date)` so retries can't double-send.
- **Vendor portal** reads are the same API with a `vendor` guard: every query
  additionally filtered by `vendor_id`. No separate service.
- **Settlements**: computed per period from order items × commission rate;
  store owner marks them paid. Optional at MVP, but the schema above supports
  it from day one.

## 7. API Shape & Auth

- REST (OpenAPI-generated types for both clients), versioned under `/v1`.
- Auth: JWT access + refresh tokens. Separate identity types: `customer`,
  `store_user` (owner/manager/cashier/vendor). Role + plan-entitlement guards
  per route.
- Cashier checkout screen uses **SSE or WebSocket** for one thing only:
  "checkout QR scanned → show cart" liveness. Everything else is
  request/response.
- Public API (Premium plan) is the same REST surface behind API keys with
  scopes — not a second API.

## 8. Build Phases

**Phase 1 — Core loop MVP** *(prove the scan→checkout flow end to end)*
- Monorepo scaffold, auth (customers + store users), store/branch setup
- Product CRUD, categories, images, QR label generation (PDF)
- Customer app: entrance scan, product scan, cart
- Checkout: token issue, cashier scan/review, **cash payment**, order + digital receipt
- Basic sales list for the merchant

**Phase 2 — Run a real store**
- Inventory: per-branch stock, adjustments, movements, low-stock alerts
- Employees: roles/permissions, activity logs
- Dashboard: sales overview, top products, active cashiers
- Reports: daily/weekly/monthly/yearly, product performance; CSV export
- Bulk product import/export
- Payment gateway integration (in-app card / Apple Pay), discounts at checkout
- Settings: taxes, branding, receipt template

**Phase 3 — Multi-brand boutique** *(the differentiator)*
- Vendor accounts, product assignment, approval workflow
- Vendor portal (scoped views, report downloads)
- Daily automated summaries (email + WhatsApp)
- Commission settings + settlements

**Phase 4 — Monetization & scale**
- Subscription plans, billing, plan-limit enforcement UI
- Public API + API keys, advanced analytics
- Multi-language (Arabic RTL likely first-class, not an afterthought — build
  the merchant UI with i18n from Phase 1)

**Deferred** (as in the requirements): loyalty, POS integrations, self
checkout, indoor navigation, promotions engine, demand forecasting, offline
sync, ERP.

## 9. Risks / Decisions to Confirm

1. **Payment gateway & market** — mada/Apple Pay via a Gulf gateway vs Stripe
   changes the checkout integration; decide before Phase 2.
2. **WhatsApp Business API** approval takes time and requires message
   templates — start the application early if Phase 3 is near-term.
3. **Cashier hardware** — webcam scanning works, but a USB/Bluetooth scanner
   (acts as keyboard input) is far faster; the checkout screen should accept
   both.
4. **Loss prevention** — Scan & Go's classic problem. The cashier-verified
   checkout in this design mitigates it; true self-checkout (future) will need
   spot-check tooling.
5. **Receipt compliance** — if operating in KSA, ZATCA e-invoicing (QR on
   receipt, specific fields) affects the receipt template; worth confirming
   jurisdiction before Phase 1 receipt work.
