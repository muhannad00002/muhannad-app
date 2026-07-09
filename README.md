# muhannad app

Personal projects workspace.

## Projects

### scan-and-go (Sayr)

An interactive prototype of a multi-tenant "scan & go" retail platform for
Oman: customers scan product QR codes in-store, build a cart, and check out
at a cashier station. Includes merchant dashboard, vendor portal, and
platform-admin views, all backed by a simulated in-browser backend with
seeded demo data.

**Run it:**

```sh
node scan-and-go/app/serve.js
# → http://localhost:8741
```

**Editing:** the source of truth is `scan-and-go/app/parts/` —
`index.html` is a committed build artifact. After changing any part, rebuild:

```sh
node scan-and-go/app/build.js
```

Design notes live in [scan-and-go/docs/ARCHITECTURE.md](scan-and-go/docs/ARCHITECTURE.md).

### habit-tracker

Placeholder — not started yet.
