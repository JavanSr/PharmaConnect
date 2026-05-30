# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# APOTEKH — Claude Code Guidance

## What this project is

APOTEKH is a pharmacy-side operating system for Tanzania. It handles
inventory management, patient safety, regulatory compliance, dispensing,
CPD tracking (Phase 2), and analytics. The system is live in Phase 1 and designed
to grow through four phases.

Registered in Tanzania. Primary market: independent retail pharmacies and ADDOs
in Arusha, expanding nationally. Wholesale module exists in the codebase and can
serve wholesale customers who come to us — but it is not actively sold or marketed
in Phase 1. Pilot focus is retail only.

---

## Development commands

### Backend (`cd backend`)

```bash
npm run dev          # ts-node-dev watch server on port 3000
npm run build        # tsc compile → dist/
npm test             # vitest integration tests (requires DATABASE_URL in backend/.env)
npm run db:migrate   # prisma migrate deploy
npm run db:generate  # regenerate Prisma client after schema changes
npm run db:studio    # open Prisma Studio GUI
npm run db:seed      # seed dev pharmacy + users
npm run db:seed:master-catalog  # seed Tanzania master drug catalogue
```

Running a single test file:
```bash
npx vitest run tests/patient-safety.test.ts
```

Backend tests require a live PostgreSQL database — they are integration tests, not unit tests with mocks. Set `DATABASE_URL` in `backend/.env` (copy from `backend/.env.example`). Tests run serially (`fileParallelism: false`).

### Frontend (`cd frontend`)

```bash
npm run dev          # Vite dev server on port 5173
npm run build        # tsc + vite build → dist/
npm run typecheck    # tsc --noEmit (fast type-only check)
npm test             # vitest unit tests (jsdom, @testing-library/react)
npm run test:e2e     # Playwright end-to-end tests
```

In dev mode, Vite proxies `/api` → `http://localhost:3000` so no CORS setup is needed.
The production build **requires** `VITE_API_URL` set to the HTTPS deployed backend URL ending in `/api/v1`; it hard-fails otherwise.

### Website (`cd website`)

```bash
npm run dev          # Next.js dev server on port 3000
npm run build        # production build
npm run lint         # eslint-config-next
```

### Pre-deploy gate (repo root)

```powershell
.\scripts\pre-deploy-check.ps1 -FrontendApiUrl "https://<railway-url>/api/v1"
# If Prisma DLL is locked (dev server running on Windows), add -SkipPrismaGenerate
```

All six release gates must pass before promoting to production (see `docs/deployment-runbook.md`).

---

## Architecture overview

### Backend module pattern

Each feature lives in `backend/src/modules/<name>/`. The standard files are:

- `<name>.router.ts` — Express router. Validates with Zod schemas, calls service functions. All authenticated routes use the `authenticate` middleware and receive `AuthRequest`.
- `<name>.service.ts` — Business logic and Prisma calls. Multi-table operations use `prisma.$transaction(async tx => { ... })`.
- `<name>.storage.ts` — Present only when file storage (Supabase) is involved (e.g. compliance).

Errors thrown from services must carry a `.status` property; `errorHandler` middleware reads it for the HTTP response code.

### Background jobs

`backend/src/jobs/*.ts` — each exports a `register*Job()` function that sets up a `node-cron` schedule. All jobs are registered at startup in `src/index.ts`. Jobs: expiry alerts, low-stock alerts, compliance alerts, trial expiry alerts, weekly digest, VFD retry, demand predictions.

### AI Agents system

`backend/src/modules/agents/` — multi-agent system using the Anthropic SDK (`claude-haiku-4-5-20251001`). The orchestrator classifies incoming queries and routes to specialist agents: `clinical_safety`, `inventory_demand`, `compliance`, `business_intel`, `data_curation`. Agents extend `BaseAgent` and return structured `AgentResult` objects. Requires `ANTHROPIC_API_KEY` in `.env`.

### Frontend offline architecture

**Service Worker (Workbox strategies):**
- **Stale-while-revalidate** — dashboard, analytics, knowledge, compliance, notifications. Serves cached response immediately, updates cache in background.
- **Network-first** — inventory stock levels, batches, dispensing checkout. Tries network first for freshness; falls back to cache on failure.

**React Query offline policy:**
- `networkMode: 'offlineFirst'` on all queries and mutations — fires requests even when `navigator.onLine` is false so the Service Worker can intercept and serve from cache
- `staleTime: 60_000` (60 seconds) default for queries unless feature requires stronger freshness
- `refetchOnWindowFocus: false` — don't auto-refetch when user switches tabs

**Offline write queueing:**
- Writes (POST, PUT, PATCH, DELETE) that fail due to network unavailability are queued in IndexedDB with 7-day TTL
- Queue store: `writeQueue` with indices on `createdAt` and `localTimestamp`
- Separate `inventoryDeltas` store tracks offline stock adjustments by productId and sourceId
- Expires writes older than 7 days; purges before sync and warns user

**Sync strategy:**
- `useOfflineSync` hook monitors server reachability via heartbeat (separate from `navigator.onLine`)
- Auto-flushes queue when server becomes reachable after being unreachable
- Manual flush available via `flushOfflineWrites()` — returns { synced, conflicts, remaining, purgedExpired }
- Emits events (`OFFLINE_QUEUE_EVENT`, `OFFLINE_SYNC_STATUS_EVENT`) for UI updates and warnings

**Retry logic:**
- Don't retry when `navigator.onLine` is false (SW will serve from cache)
- Don't retry on error codes `OFFLINE_QUEUED` or `ERR_NETWORK`
- Max 1 retry when online, only if error is not a 4xx client error

**Skip offline queueing for:**
- `auth/*` — auth mutations must not queue
- `health` — readiness checks
- `inventory/conflicts` — conflict resolution must be real-time
- `dispensing/checkout` — payment must complete or fail immediately, not queue

The `@` alias maps to `frontend/src/`. All pages in `App.tsx` are `React.lazy()` loaded.

### Stores (Zustand)

- `authStore` — user, accessToken, refreshToken. Persisted to localStorage.
- `pharmacyStore` — active pharmacy context. Persisted to localStorage.
- `notificationStore` — ephemeral toasts, not persisted.
- `connectivityStore` — online/offline state, drives offline UI indicators.

---

## Repository structure

```
pharmaconnect/
├── backend/          # Node.js/Express API (production)
│   ├── src/
│   │   ├── index.ts                 # Server entry point
│   │   ├── lib/                     # prisma.ts, jwt.ts
│   │   ├── middleware/              # auth.ts, errorHandler.ts
│   │   └── modules/                 # auth, inventory, compliance, patients,
│   │                                #   cpd, knowledge, analytics, settings
│   │                                #   (patients = session-based safety only,
│   │                                #    no patient table, no patient UUID)
│   ├── prisma/
│   │   ├── schema.prisma            # All models
│   │   └── migrations/              # Applied migrations
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/         # React SPA (production)
│   ├── src/
│   │   ├── main.tsx / App.tsx       # Entry + routes
│   │   ├── index.css                # Tailwind + CSS vars
│   │   ├── types/index.ts           # Shared TypeScript types
│   │   ├── stores/                  # authStore, pharmacyStore,
│   │   │                            #   notificationStore, connectivityStore
│   │   ├── hooks/                   # useAuth, useDebounce
│   │   ├── lib/                     # api.ts (axios), receiptPdf.ts (jsPDF)
│   │   ├── components/
│   │   │   ├── layout/              # AuthGuard, Layout, Sidebar, TopBar
│   │   │   └── ui/                  # Button, Card, Input, Select, Badge,
│   │   │                            #   Modal, Toast, ProgressBar
│   │   └── modules/                 # auth, dashboard, inventory, compliance,
│   │                                #   patient-safety, cpd, knowledge,
│   │                                #   analytics, settings
│   ├── public/assets/logo/          # Production SVG logos
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
│
├── website/          # Public marketing website (Next.js) — only deployed website source
├── tasks/            # Implementation task files for large feature initiatives
├── src/              # Legacy prototype only if still present — do not maintain as website source
└── CLAUDE.md         # This file
```

---

## Deployment

| Service   | Purpose                            |
|-----------|------------------------------------|
| Railway   | Backend API (Node.js + PostgreSQL) |
| Supabase  | PostgreSQL database (alternative)  |
| Vercel    | Frontend SPA + website             |

**Environment variables** — copy `backend/.env.example` to `backend/.env`.
Never commit `.env` files. The `.gitignore` excludes them.

To deploy backend to Railway:
- Set `DATABASE_URL` from Railway PostgreSQL or Supabase
- Set `JWT_SECRET` and `JWT_REFRESH_SECRET` (min 32 chars)
- Set `ALLOWED_ORIGINS` to your Vercel frontend URL
- Run `npm run db:migrate` on first deploy

To deploy frontend to Vercel:
- Set `VITE_API_URL` to your Railway backend URL + `/api/v1`
- Build command: `npm run build`, Output: `dist`

---

## Brand identity

### Logo mark — Living Cross

A cross with 4 solid circular tip nodes and a filled centre swelling. The right
node is amber — signalling an active pharmacy. Symbolises: connection, pharmacy
cross, network nodes.

Use the production SVG assets from `frontend/public/assets/logo/` and
`website/public/assets/logo/`. Never regenerate or redraw the Living Cross in
React, HTML, CSS, canvas, or inline SVG code. Import or reference the asset files.

Required variants:
- `apotekh-mark-light.svg` — white/light backgrounds
- `apotekh-mark-dark.svg` — dark/teal backgrounds and app icon contexts
- `apotekh-mark-mono.svg` — single-colour, greyscale, print
- `apotekh-icon.svg` — favicon/PWA/app icon
- `apotekh-logo.svg` — horizontal logo for light backgrounds
- `apotekh-logo-white.svg` — horizontal logo for dark backgrounds.

Canvas: 100×100. Geometry (icon variant, primary teal #1A6B5C background):
- Vertical bar: x=45, y=21, w=10, h=58, rx=2, fill=#0D4035
- Horizontal bar: x=21, y=45, w=58, h=10, rx=2, fill=#0D4035
- Centre swelling: cx=50, cy=50, r=8, fill=#0D4035
- Top/bottom/left nodes: r=9, fill=#0D4035, at (50,9), (50,91), (9,50)
- Right node (active signal): r=9, fill=#E8A020, + inner circle r=4 fill=white opacity=0.30.
  Amber active node must never be omitted in colour contexts.

Logo wordmark (`apotekh-logo.svg`, light backgrounds):
- Bars + centre: #1A3328 (dark forest)
- Top/bottom/left nodes: #1A6B5C (primary teal)
- Right node: #E8A020 (amber active node)
- Text: `APOTEK` in #1A3328, `H` in #7ECFB4

Logo wordmark (`apotekh-logo-white.svg`, dark backgrounds):
- Bars + nodes: white
- Right node: #E8A020 (amber active node)
- Text: `APOTEK` in white, `H` in #7ECFB4

### Colour system — Slate Teal

| Token    | Hex       | Use                              |
|----------|-----------|----------------------------------|
| pc-50    | #EDF7F3   | Page background                  |
| pc-100   | #D6F0E8   | Borders, dividers, card borders  |
| pc-200   | #AFDFD3   | Hover backgrounds                |
| pc-500   | #2A9478   | Mid teal, secondary accents      |
| pc-600   | #1A6B5C   | Primary brand teal               |
| pc-700   | #145748   | Hover states on teal elements    |
| pc-800   | #0D4035   | Dark teal, headings, text        |
| pc-900   | #082B23   | Darkest, rarely used             |

**Never use per-phase colouring** (amber for phase 2, purple for phase 3, red
for phase 4). This was explicitly removed. Phase-locked nav items use
`text-[#64748B] opacity-70` only.

### Motto

**"Powering Pharmacies. Protecting Patients."**

Use exactly this wording in marketing copy, the website, pitch materials, and any
UI context where a brand tagline appears. Do not paraphrase, shorten, or invent
alternatives.

### Typography

- Body: DM Sans (all UI text, labels, nav)
- Display: DM Serif Display (marketing headings only — not in app UI)
- Code: JetBrains Mono (code snippets, reference numbers)

All three are loaded via Google Fonts in `frontend/index.html`.

---

## User roles and permissions

| Role | Tier availability | Primary function |
|------|------------------|-----------------|
| OWNER | All tiers | Remote oversight, billing, user management |
| PHARMACIST_IN_CHARGE | BASIC, STANDARD, PREMIUM, ENTERPRISE | Full clinical + operational control (Superintendent Pharmacist — Tanzania Pharmacy Act title). Not applicable to ADDO — ADDOs are not staffed by licensed pharmacists. |
| DISPENSER | ADDO, BASIC, STANDARD, PREMIUM, ENTERPRISE | Retail dispensing + patient safety tools. At ADDO, this is the ADDO operator. |
| CASHIER | STANDARD, PREMIUM, ENTERPRISE | Complete payment on a prepared sale |
| DATA_ENTRY_CLERK | All tiers | Stock intake and supplier management only |
| WHOLESALE_MANAGER | WHOLESALE, ENTERPRISE | Full wholesale operations management |
| WHOLESALE_COUNTER_STAFF | WHOLESALE, ENTERPRISE | Order picking, goods handling, intake |
| DELIVERY_STAFF | WHOLESALE, ENTERPRISE | Delivery status updates only |

### WHOLESALE_COUNTER_STAFF — detailed permissions

CAN:
- View wholesale catalogue (read only — cannot edit prices)
- View orders assigned to them for picking
- Mark order line items as picked and packed
- Confirm outgoing delivery quantities against the order
- Record incoming stock from manufacturers (intake form)
- View current stock levels (read only — for picking purposes)
- Barcode scan on incoming and outgoing goods

CANNOT:
- Set or view client credit limits
- Edit product pricing or catalogue
- View financial reports or revenue data
- Access client pharmacy management
- Access the retail dispensing screen
- View patient safety tools
- Create or cancel orders
- Generate or view VAT invoices

### Tier feature matrix (key rules)

- **Clinical Decision Support Suite is NEVER tier-gated.** Drug interaction
  checker (4 severity levels), dose calculator, contraindication alerts (8 flags),
  NCD hints, diagnosis-drug matching, alternative medicine suggestions, therapeutic
  equivalence matching, and override logging are identical across ADDO, BASIC,
  STANDARD, and PREMIUM.
- **Override model: dispenser proceeds at own risk.** When a drug interaction,
  contraindication, or AWaRe RESERVE alert fires, the dispenser is shown a clear
  warning. They may acknowledge and proceed — no Superintendent PIN required, no
  escalation. The override is logged against the dispenser's account: who, what drug,
  what alert level, what time. This applies at ADDO and all pharmacy tiers equally.
  The warning is the protection; the log is the accountability. Do NOT implement a
  PIN escalation gate for any alert severity level.
- ADDO: Basic POS. No discounts, no void/reissue, no multi-outlet. DLDM
  compliance tracker only. Knowledge Hub read-only.
- BASIC: Adds Owner Dashboard, roles & permissions, void/reissue audit trail,
  full compliance tracker (TMDA + PC licence types). Knowledge Hub read-only.
- STANDARD: Adds accounting module, customer purchase history, Patient Ordering
  Portal, basic marketing campaigns, multi-shop reporting. Knowledge Hub full.
- PREMIUM: Adds demand forecasting, dead stock scoring, revenue projections,
  peer benchmarking, full Knowledge Hub with courses.
- CPD is NOT a feature — do not add CPD activity logs, CPD points tracker,
  or any CPD-related feature to any tier without explicit founder approval.
- WHOLESALE: Separate product. No retail dispensing. No Clinical Decision Support.
  Knowledge Hub read access only.
- ENTERPRISE: Chains 6+ outlets, unlimited users, all Premium features.
- Barcode scanning: available from ADDO upward and to WHOLESALE_COUNTER_STAFF.
- EFDMS integration: active from BASIC tier upward. Runs silently in background.
  Never surface in onboarding or sales conversations. Owner can view under
  "Compliance" section after 60–90 days.

### Subscription tiers — fixed pricing (do not change without explicit instruction)

**Retail tiers:**
| Tier | Price | Outlets | Users | Trial |
|------|-------|---------|-------|-------|
| ADDO | Tsh 20,000/month | 1 | 3 | 14 days |
| BASIC | Tsh 39,000/month | 2 | 5 | 14 days |
| STANDARD | Tsh 55,000/month | 3 | 10 | 14 days |
| PREMIUM | Tsh 75,000/month | 5 | 20 | 14 days |

**Wholesale / distributor tiers (separate product/page):**
| Tier | Price | Notes |
|------|-------|-------|
| WHOLESALE | Tsh 100,000/month | 1 wholesale outlet, 10 users + delivery staff |
| ENTERPRISE | Negotiated | 6+ outlets, chains, hospital pharmacies |

Annual billing: 10× monthly (2 months free).

**UI naming conventions (enforce strictly):**
- "Clinical Decision Support" — suite name (never "Patient Safety Suite")
- "Patient Ordering Portal" — never "online storefront" or "e-commerce"
- "Owner Dashboard" — never "remote dashboard"
- "Knowledge Hub" — consistent label across all tiers
- "Compliance" — section header, never "EFDMS" or "TRA" in UI
- "APOTEKH" — platform name, never "PharmaConnect"

---

## Module architecture

| Phase | Module             | Status      |
|-------|--------------------|-------------|
| 1     | Dashboard          | Live        |
| 1     | Knowledge Hub      | Live        |
| 1     | Inventory          | Live        |
| 1     | Compliance Tracker | Live        |
| 1     | Analytics          | Live        |
| 1     | Dispensing         | Live        |
| 1     | Staff Activity     | Live — OWNER and PHARMACIST_IN_CHARGE only; derived from operational logs |
| 1     | Supplier Discovery | Live — CSV-based wholesale supplier discovery with price comparison |
| 2     | CPD Tracker        | Coming soon |
| 2     | NHIF Claims        | Coming soon — blocked on NHIF reimbursement reform, not a tech problem |
| 2     | Stock Exchange     | Coming soon — pharmacy-to-pharmacy stock trading within the APOTEKH network |
| 2     | Wholesale / B2B    | Built — not actively marketed in Phase 1; serve wholesale customers who approach us but do not pitch or prioritise |
| 3     | B2B Platform       | Coming soon |
| 3     | Patient App        | Coming soon |
| 4     | AI Safety          | Coming soon |
| 4     | Data Products      | Coming soon |

---

## Supplier Discovery Module

### Overview

The Supplier Discovery module enables retail pharmacies to discover and compare wholesale supplier catalogues using CSV-based data. Tanzanian law restricts peer-to-peer pharmacy marketplaces, so this module provides supplier information (name, contact, product prices) with direct contact channels (WhatsApp, email) rather than automated ordering.

**Data sources:**
- CSV uploads by SUPER_ADMIN (primary source for accuracy and control)
- Future: real-time sync from wholesaler systems (Phase 2)

### Architecture

**Files:**
- `backend/src/modules/inventory/supplier-sync.router.ts` — API endpoints for listing, registering, and CSV uploads
- `backend/src/modules/inventory/supplier-sync.service.ts` — Business logic for catalogue sync, supplier management, and price comparison
- `frontend/src/modules/inventory/` — Supplier catalogue views (list, search, price comparison)

**Database models** (in `backend/prisma/schema.prisma`):
- `Supplier` — Wholesaler entity (name, phone, email, address, isApotekNetworkWholesaler flag)
- `SupplierCatalogue` — Catalogue for a supplier (ties products to a specific wholesaler and optional retail pharmacy)
- `SupplierCatalogueItem` — Individual product in a catalogue (productName, genericName, strength, dosageForm, unitPrice, quantity, minimumOrderQuantity)

### Two-Mode Supplier Registration

**Mode 1: Pre-registration (Recommended)**
For accurate supplier details, register first then upload products:
```
POST /api/v1/suppliers/register
  Body: { name, phone, email, address }
  Response: { supplierId, catalogueId }

POST /api/v1/suppliers/upload-csv
  Params: supplierId=<id>
  File: CSV with columns [productname, genericname, strength, dosageform, quantity, unitprice]
```

**Mode 2: Auto-create (Quick)**
Upload CSV with supplier names; suppliers are created automatically:
```
POST /api/v1/suppliers/upload-csv
  (no supplierId parameter)
  File: CSV with columns [wholesalername, productname, genericname, strength, dosageform, quantity, unitprice]
```

Both modes coexist. The endpoint detects supplierId parameter to choose mode.

### API Endpoints

- `GET /api/v1/suppliers/apotekh-wholesalers` — List all APOTEKH network wholesalers (auth required)
- `POST /api/v1/suppliers/register` — Pre-register a wholesaler (SUPER_ADMIN only)
- `POST /api/v1/suppliers/upload-csv` — Upload catalogue CSV (SUPER_ADMIN only)
- `GET /api/v1/suppliers/price-comparison?productName=<name>` — Search product prices across all suppliers (auth required)

### Data Flow

1. **SUPER_ADMIN** uploads CSV file (wholesaler details optional; product-supplier mappings required)
2. System parses CSV, validates headers, creates/updates suppliers and products
3. Products stored as global catalogue items (retailPharmacyId = null)
4. Retail pharmacies query `price-comparison` endpoint to see all available suppliers and prices
5. Pharmacist selects supplier, records contact details, communicates directly (WhatsApp/email)

### CSV Format

**Headers (required):**
- `wholesalername` — Supplier name (required if no pre-registration; auto-creates supplier if not found)
- `productname` — Medicine name/brand
- `unitprice` — Price per unit (Tanzanian Shillings)

**Headers (optional):**
- `genericname` — Active ingredient (e.g., "Amoxicillin")
- `strength` — Dose (e.g., "500mg")
- `dosageform` — Form (TABLET, CAPSULE, SYRUP, INJECTION, CREAM, OINTMENT, DROPS, INHALER, SUPPOSITORY, POWDER, SOLUTION, OTHER)
- `quantity` — Available stock quantity

**Example:**
```csv
wholesalername,productname,unitprice,genericname,strength,dosageform,quantity
Shelys Pharma Ltd,Amoxicillin 500mg Capsules,15000,Amoxicillin,500mg,CAPSULE,1000
Metro Pharma Distribution,Paracetamol 500mg Tablets,3500,Paracetamol,500mg,TABLET,2000
```

### Frontend Integration

**On ordering/stock preparation page:**
- Supplier search panel shows available medicines across all wholesalers
- Sort options: price (asc/desc), supplier name, availability
- Display: product name, generic name, strength, form, price, supplier name, supplier contact
- "Cheapest" badge on lowest-priced option
- On selection: populate order form with supplier contact details (manual WhatsApp/email workflow)

### Authorization

- **List wholesalers**: Any authenticated user
- **Register wholesaler**: SUPER_ADMIN only
- **Upload CSV**: SUPER_ADMIN only
- **Price comparison**: Any authenticated user

### Rules

- Suppliers created via CSV have `isApotekNetworkWholesaler = true` and `retailPharmacyId = null` (global catalogues)
- Price comparison returns all products matching search, sorted by price ascending
- No automated ordering; users must contact suppliers directly via contact details provided

---

## Wholesale System

### Overview

APOTEKH Wholesale is a separate B2B operations system for wholesale pharmacies and distributors. It runs on the same platform backbone (auth, users, catalogue, outlet data) as retail but has independent workflows: catalogues with tiered pricing, buyer orders, credit management, delivery logistics, VAT invoicing, and demand insights.

**Key principle:** Wholesale is not actively marketed in Phase 1. Serve wholesale customers who approach you, but do not pitch or prioritise.

### Registration & Setup (SUPER_ADMIN)

**Step 1: Create wholesale pharmacy**
- User registers new pharmacy with `pharmacyType: 'WHOLESALE'` during signup, OR
- SUPER_ADMIN creates via Prisma Studio:
  ```
  Pharmacy { name, licenceNumber, region, pharmacyType: 'WHOLESALE', subscriptionTier: 'WHOLESALE' }
  ```
- Subscription tier defaults to WHOLESALE (Tsh 100,000/month, 1 outlet, 10 users + delivery staff)

**Step 2: Assign roles**
Invite staff with these wholesale-specific roles:
- `WHOLESALE_MANAGER` — Full operations control (create/confirm orders, manage catalogue, view credit/invoicing)
- `WHOLESALE_COUNTER_STAFF` — Picking, packing, delivery confirmation; view stock levels (read-only); barcode scan
- `DELIVERY_STAFF` — Delivery status updates only; cannot access orders or stock
- `OWNER` — Remote oversight (can do anything WHOLESALE_MANAGER can do)

Do NOT assign retail roles (DISPENSER, CASHIER, DATA_ENTRY_CLERK) to pure wholesale staff.

**Step 3: Enable hybrid mode (optional)**
For pharmacies that are both retail AND wholesale:
```
POST /api/v1/settings/subscription (OWNER only)
Body: { hybridAddonActive: true }
```
Hybrid mode allows:
- Retail dispensing + wholesale operations in same pharmacy
- Staff can switch between modes via UI toggle (Sell/Buy buttons in WholesaleShell)
- Separate navigation: retail sidebar vs wholesale header
- Single auth/user/outlet context

### Wholesale Operations Workflow

**Seller side (WHOLESALE_MANAGER, WHOLESALE_COUNTER_STAFF):**
1. Create wholesale catalogue → set base price + per-tier overrides (ADDO, ESSENTIAL, STANDARD, PREMIUM, ENTERPRISE)
2. Receive orders from buyer pharmacies → order status: SUBMITTED → CONFIRMED → PACKED → DISPATCHED
3. Confirm delivery quantities via manifest, track delivery staff
4. View VAT invoices auto-generated on order completion
5. Monitor demand insights (top products, 30-day vs previous-30-day trends)
6. Manage buyer credit limits (if buyer is on credit terms)

**Buyer side (any OWNER, PHARMACIST_IN_CHARGE, WHOLESALE_MANAGER at retail pharmacy):**
1. Search wholesale pharmacies on APOTEKH via `/b2b/pharmacies/search`
2. Browse seller's catalogue → see tier-adjusted prices for own subscription tier
3. Submit order → status: SUBMITTED → CONFIRMED → PACKED → DISPATCHED → DELIVERED
4. View order history and receivables aging

### API Endpoints (B2B Module)

| Endpoint | Role | Purpose |
|----------|------|---------|
| `GET /api/v1/b2b/pharmacies/search?q=<name>` | Authenticated | Find wholesale pharmacies to order from |
| `GET /api/v1/b2b/catalogue?sellerPharmacyId=<id>` | Authenticated | Browse seller's wholesale products + tier prices |
| `POST /api/v1/b2b/catalogues` | WHOLESALE_MANAGER | Create/update catalogue with base + tier prices |
| `POST /api/v1/b2b/orders` | OWNER, PHARMACIST_IN_CHARGE, WHOLESALE_MANAGER | Buyer submits order |
| `POST /api/v1/b2b/orders/manual` | OWNER, WHOLESALE_MANAGER (seller) | Seller creates order on behalf of buyer |
| `GET /api/v1/b2b/orders` | Order-scoped roles | List buyer or seller orders |
| `PATCH /api/v1/b2b/orders/<id>/status` | WHOLESALE_MANAGER, OWNER | Update order status (CONFIRMED, PACKED, DISPATCHED, COMPLETED, DISPUTED) |
| `POST /api/v1/b2b/orders/<id>/pick-items` | WHOLESALE_COUNTER_STAFF | Mark items as picked (batch operation) |
| `POST /api/v1/b2b/orders/<id>/verify-items` | WHOLESALE_COUNTER_STAFF | Verify picked items before dispatch |
| `POST /api/v1/b2b/orders/<id>/schedule-delivery` | WHOLESALE_MANAGER | Assign delivery staff and date |
| `POST /api/v1/b2b/orders/<id>/confirm-delivery` | DELIVERY_STAFF | Confirm delivery received with quantities |
| `GET /api/v1/b2b/invoices` | OWNER, WHOLESALE_MANAGER | View VAT invoices |
| `GET /api/v1/b2b/credit-limits` | OWNER, WHOLESALE_MANAGER | View buyer credit limits |
| `PUT /api/v1/b2b/credit-limits` | OWNER, WHOLESALE_MANAGER | Set/update credit limit for buyer |
| `GET /api/v1/b2b/receivables-aging` | OWNER, WHOLESALE_MANAGER | View open receivables by buyer, aging buckets |
| `GET /api/v1/b2b/demand-insights` | OWNER, WHOLESALE_MANAGER | Top products, 30d vs prev-30d, revenue trends |

### Tiered Pricing

Catalogues support per-tier price overrides. When a buyer from STANDARD tier views catalogue, they see:
1. Product base price, OR
2. STANDARD-specific override if set, OR
3. Base price (fallback)

**Tiers with pricing control:**
- ADDO (Tsh 20,000/month)
- ESSENTIAL (Tsh 39,000/month)
- ADDO_PLUS (Tsh 55,000/month)
- STANDARD (Tsh 55,000/month)
- PREMIUM (Tsh 75,000/month)
- ENTERPRISE (negotiated)

**Example catalogue item:**
```json
{
  "productId": "...",
  "basePrice": 15000,
  "tierPrices": {
    "ADDO": 16500,        // markup for lowest tier
    "STANDARD": 14500,    // discount for higher tier
    "PREMIUM": 13500
  },
  "minOrderQuantity": 100,
  "maxOrderQuantity": 5000
}
```

### Authorization & Permissions

- **Retail pharmacies cannot sell:** Even if a retail user has `WHOLESALE_MANAGER` role, they cannot create orders for buyers unless `pharmacyType: 'WHOLESALE'` OR `isHybrid: true`
- **WHOLESALE_COUNTER_STAFF cannot see:** Client credit limits, prices, financial reports, retail dispensing screen, patient safety
- **DELIVERY_STAFF cannot see:** Orders, stock levels, invoicing, credit limits (delivery updates only)
- **OWNER overrides:** OWNER can perform any action WHOLESALE_MANAGER can perform
- **SUPER_ADMIN override:** SUPER_ADMIN can perform any action on any pharmacy

### Rules

- Wholesale pharmacies cannot have retail dispensing in pure wholesale tier. Use hybrid if both needed.
- Orders auto-transition through statuses (e.g., once all items picked, PACKED status becomes available)
- VAT invoices generated on order completion (COMPLETED status); includes line items, tax rate, total
- Credit limits per buyer; invoices track aging (30d, 60d, 90d+); over-limit orders flagged
- Delivery manifests track manifests per truck/driver; DELIVERY_STAFF confirms pickup and drop-off quantities
- Wholesale operations respect trial restrictions — features lock after trial ends unless subscribed
- Demand insights computed from completed orders (COMPLETED status only); includes top-10 products, 30-day rolling windows

### Wholesale UI — Sidebar and Route Access

**Pure WHOLESALE pharmacies (`pharmacyType === 'WHOLESALE'`) see ONLY these nav items:**
- Wholesale (dashboard, orders, manual order, invoices, manifests, returns, purchase orders, client pricing)
- Inventory (stock levels, batches, expiry, intake, stock orders)
- Analytics (wholesale-specific — see below)
- Reports
- Settings / Notifications

**Blocked for pure WHOLESALE (redirected to /wholesale):**
- Dispensing — no retail sales workflow
- Compliance (TMDA/PC tracker) — retail regulatory tool, irrelevant to wholesale
- Knowledge Hub / TMDA Updates — clinical and CPD content for pharmacists
- Patient Safety / Safety Alerts / Controlled Register — no patients, no clinical workflow
- Staff Activity — built for retail dispenser tracking
- CPD — not applicable
- Sync Conflicts — retail inventory tool

This filtering is enforced at two layers:
1. `Sidebar.tsx` — `isWholesalePharmacy` check strips nav to the allowed set
2. `App.tsx` — `WholesaleBlockedRoute` wrapper redirects to `/wholesale` on any blocked path

SUPER_ADMIN bypasses both filters and sees everything.
Hybrid pharmacies (`isHybrid: true`) are NOT pure wholesale — they get the full retail nav plus wholesale.

### Wholesale Analytics

`AnalyticsPage` detects `pharmacyType === 'WHOLESALE'` and renders `WholesaleAnalyticsPage` instead of the retail view.

**Wholesale analytics metrics (sourced from existing B2B endpoints):**
- Revenue this 30d vs previous 30d — `/b2b/demand-insights`
- Order count this 30d vs previous 30d — `/b2b/demand-insights`
- Fulfillment rate (% dispatched/delivered) — `/b2b/demand-insights`
- Outstanding receivables total — `/b2b/receivables-aging`
- Top 10 products by revenue — bar chart + table — `/b2b/demand-insights`
- Receivables aging buckets (30d / 60d / 90d+) — `/b2b/receivables-aging`

These mirror the analytics approach of systems like Unleashed, TradeGecko/QuickBooks Commerce, and SAP B1 wholesale — focused on order throughput, product velocity, and credit exposure rather than dispensing counts or compliance scores.

### Wholesale Phase 2 Roadmap

The following features are **not yet built** and are candidates for Phase 2. They represent the gap between "functional wholesale MVP" and "enterprise-grade distributor platform."

| Feature | Current Status | Phase 2 Rationale | Complexity |
|---------|---|---|---|
| **Partial Fulfilment & Backorders** | Order creation exists; ship-what-you-have logic missing | Distributors run out of stock mid-order; need to ship available items and queue the rest. Backorder queue must be visible to both sides and auto-fulfilled when stock arrives. | Medium |
| **Multi-Warehouse Stock Consolidation** | Stock is pharmacy-level only; no warehouse model | Distributors have multiple physical locations. Need unified stock view before committing to buyer order, and ability to pull from any warehouse. | High |
| **Payment Terms & Aging** | Credit limits exist; no term scheduling | Buyers need net-30, net-60, net-90 terms. System must auto-calculate payment due date, track aging (30/60/90+), and flag overdue. | Medium |
| **Return Merchandise Authorisation (RMA)** | Basic return reasons exist; no full RMA workflow | Returns need RMA number, approval step, reason tracking, credit note generation tied to original invoice. Inventory must reinstate or write-off. | Medium |
| **Wholesale Licence Management** | Compliance tracks retail licences only | Wholesalers have separate dealer licences. System must track expiry and warn before license lapses. | Low |
| **Suspicious Order Monitoring (SOM)** | Not implemented | Regulators require flagging of unusually large controlled-substance orders. System must alert if order quantity > threshold for that product. | Medium |
| **Client-Level Custom Pricing** | Tier pricing exists; no per-client overrides | Volume contracts, preferred-partner rates, negotiated pricing per buyer (distinct from subscription tier pricing). | Low |
| **Stock Movement Reports** | Raw audit log exists; no formatted reports | Warehouse managers and regulators need stock in/out by product, by warehouse, by time period. Need exportable format (CSV/PDF). | Low |
| **Lot/Batch Traceability Audit Trail** | Batch data exists; no formal regulatory report | Regulator requests: "Show me all batches of this product from supplier X to dispenser Y." System must generate on demand. | Medium |
| **Controlled Substance Dispensing Logs (Wholesale)** | Exists for retail only | Wholesalers distributing controlled items must log dispatch to each buyer. Separate from retail controlled register. | Medium |

### Wholesale Phase 2 Implementation Priority

**High impact, medium effort (do first):**
1. Partial fulfilment & backorders — unblocks real-world order scenarios
2. Multi-warehouse consolidation — enabler for distributor use case
3. Payment terms & aging — credit risk visibility for wholesalers

**Medium impact, lower effort (quick wins):**
4. RMA workflow — reduces manual refund handling
5. Suspicious order monitoring — compliance requirement
6. Stock movement reports — regulatory audit readiness

**Lower priority (Phase 2.5+):**
7. Wholesale licence management — only for multi-territory expansion
8. Client-level custom pricing — UX nicety; tier pricing covers 80%
9. Lot traceability report — rarely requested; batch data already exists for manual audit

---

## Coding conventions (aspirational standards)

These are the target standards for new code:

- **API responses**: always `{ data: ... }` at top level. Errors: `{ error: string }`.
- **Auth**: JWT access token (15m) + refresh token (7d) with rotation.
  All protected routes use the `authenticate` middleware.
- **Transactions**: any operation touching multiple tables must use
  `prisma.$transaction(async tx => { ... })`.
- **Validation**: Zod schemas at the router layer before calling service functions.
- **Error propagation**: throw errors with a `.status` property; the
  `errorHandler` middleware reads it.
- **Frontend stores**: Zustand. Auth + pharmacy state persisted via
  `zustand/middleware persist`. Notifications are ephemeral (not persisted).
- **API client**: single axios instance in `lib/api.ts` with automatic token
  injection and 401→refresh interceptors.
- **Component pattern**: named exports (not default). No class components.

### Offline and cache rules

- **Online reads feel offline-fast:** Use stale-while-revalidate for dashboard, analytics, knowledge, compliance, notifications where stale data is acceptable (60–90 second staleness OK).
- **Freshness for critical paths:** Inventory stock levels, batch availability, FEFO expiry dates, and dispensing checkout must use network-first or shorter staleTime (10–30 seconds) so dispensers always see current quantity and earliest expiry first.
- **Write mutations offline:** Automatically queue in IndexedDB if network unavailable; user gets a toast "Saved offline — will sync when back online." Queued writes expire after 7 days.
- **Sync doesn't block UI:** Offline sync happens in the background. Don't show modal dialogs or block navigation during sync — use toast notifications and connectivity store updates.
- **Don't queue risky operations:** Auth (login, refresh), payments, and conflict resolution never queue. These must complete or fail immediately.
- **Inventory deltas persisted separately:** Stock adjustments made offline are tracked in the `inventoryDeltas` store with source ID and timestamp, separate from write queue. On sync, deltas are replayed in order and then cleared.

### Staff Activity rules

- Use **Staff Activity** as the visible UI name. Do not use "Attendance" in nav,
  page titles, breadcrumbs, or new user-facing copy.
- Do not build clock-in/clock-out or attendance workflows. Presence is derived
  from login audit rows and operational activity.
- Staff Activity is visible only to `OWNER` and `PHARMACIST_IN_CHARGE`.
  Do not grant it to staff roles below pharmacist-in-charge.
- The primary frontend route is `/staff-activity`; legacy `/attendance` may only
  exist as a redirect for old bookmarks.
- The primary API route is `/api/v1/staff-activity`.

### Dashboard rules

- Owner dashboard summary cards should prioritise operational decisions. The
  first summary card is **Today's Revenue** in Tsh, derived from completed
  dispense transactions, with a 7-day sparkline when enough data exists.
- Do not show seeded/test product names in operational alert panels. Empty low
  stock or expiry panels should render neutral empty states.
- If today's activity values are all zero, keep the panel header and show:
  "No activity recorded today yet."

### Frontend UI/UX patterns

**SystemStatusWindow component:**
- Used for full-page loading, error, and auth state transitions (AuthGuard, ErrorBoundary, Layout)
- Shows: type (loading|error|success), title, message, optional actionLabel + onAction callback
- Replaces spinners and error alerts that used to block the entire page
- LoadingState: "Loading APOTEKH — Checking your session and preparing the workspace"
- ErrorState: "Workspace could not be loaded — Check the connection and reload"

**Lazy-loaded components:**
- `BarcodeScanner`, `DoseCalculator`, `PatientSafetyPanel` in DispensingScreen loaded via `lazy(() => import(...).then(m => ({ default: m.ComponentName })))`
- Wrapped in `<Suspense fallback={<Spinner />}>` for smooth progressive rendering
- Reduces main bundle size; components load on-demand when dispensing flow needs them

**Patient Safety severity indicators:**
- Severity categories: HIGH/MAJOR/SEVERE, MODERATE/MEDIUM, INFORMATIONAL
- UI: High-severity alerts show as full alert strips (border + background); moderate shows as dots or condensed rows; informational as text only
- `severitySummary` object tracks counts: { high, moderate, informational }
- Colors: high = red/danger, moderate = amber/warning, informational = blue/info
- Override logging requires PIC PIN when high-severity alerts are present

**Trial paywall & expiration:**
- Layout component listens for `TRIAL_EXPIRED_EVENT` and shows `<TrialPaywall>` modal
- `TrialBanner` shows at top of main when trial ends in <7 days
- Subscription status checked via `/settings/subscription` on app load
- `trialEndsAt` date vs current date determines expiration state

---

## Regulatory requirements

- **TMDA**: Tanzania Medicines and Medical Devices Authority — product registration
  and approval. All medicine data must reference TMDA-registered products only.
- **FEFO**: First Expired First Out — dispensing order for batches. Enforced in
  inventory and dispensing workflow.
- **EFDMS**: Electronic Fiscal Device Management System — runs silently in background
  from BASIC tier upward. Never surface in onboarding or sales conversations.
- **NHIF/UHI**: Not integrated. NHIF reimburses below market price in Tanzania —
  private pharmacies lose money on every claim processed. Integration is blocked
  until NHIF reforms its reimbursement model. Do not build or reference NHIF
  claims features. Deferred table governs this.

---

## Key decisions

- OneDrive sync conflicts with `.git` — move project outside OneDrive for
  reliable Git operations. OneDrive actively modifies `.git/objects/` causing
  file loss during commits.
- Phase colouring was explicitly removed. Do not reintroduce amber/purple/red
  per-phase colour coding in nav or UI.
- `website/` is the only deployed marketing website source. Do not create or
  maintain root-level landing pages or alternate website source trees.
- Do not redesign or replace the landing page without explicit approval.
- Do not mix `website/` code with `frontend/` (the pharmacy app).
- `src/` at repo root is legacy/prototype code if still present. Do not modify
  it or use it as website source.
- Demo accounts in `LoginPage.tsx` are opt-in only with
  `VITE_SHOW_DEMO_ACCOUNTS=true`. Local dev on port 5173 should default to
  production-like login UI unless that flag is explicitly enabled.
- Payment gateway (M-Pesa, Flutterwave) is Phase 2. Phase 1 uses manual
  payment confirmation by the founder after receiving M-Pesa or bank transfer.
  Do not build payment gateway integration until explicitly instructed.
- Patient safety module is session-based only. No patient table. No patient UUID.
  No persistent patient data of any kind.
- Long-term safety impact data may be retained only as anonymous operational
  signals: interaction alerts, allergy/contraindication warnings, precautions,
  NCD hints, counselling/dose guidance signals, and PIC overrides. Individual
  pharmacies can see their own safety impact reports; APOTEKH Office accounts
  may see aggregate, anonymous network-level reports. Do not store patient-
  identifying safety data for these analytics.
- The override_log table must have a database-level trigger preventing DELETE
  from any role including superadmin. This is a permanent medical record.
- The B2B ordering network is closed. Retail pharmacies can only order from
  wholesale pharmacies registered on APOTEKH. Enforce at API level.
- Uploaded files under `/uploads/*` must require authentication and pharmacy
  ownership checks before serving, with APOTEKH Office override only for
  `SUPER_ADMIN`.
- Password reset tokens are one-hour, single-use tokens. After password reset,
  clear the reset token and invalidate old refresh sessions.
- Production releases should pass the pre-deploy check script and readiness
  probes (`/ready` and `/api/v1/ready`) before promotion. Prefer non-destructive
  rollback as documented in `docs/deployment-runbook.md`.

## Deferred features — placeholder pages only

The following must NOT be built. Render a "coming soon" placeholder only:

| Feature | Dependency blocking it |
|---------|----------------------|
| NHIF Claims Module | NHIF Breeze API accreditation |
| Prescription Management | PC + TMDA digital framework |
| Clinical OTC Symptom Tool | PC written position statement |
| Persistent Patient Data Storage | PDPC registration + MOH MOU |
| PC-Accredited CPD | Pharmacy Council MOU |
| Controlled Substances TMDA Reporting | TMDA notification |

## GStack usage for this project

Use gstack skills when helpful.

Important:
- This is an existing Codex + Claude Code project.
- Do not rebuild from scratch.
- Do not rewrite the whole app.
- Work incrementally.
- Preserve current UI, database schema, auth flow, and existing working features unless explicitly told otherwise.
- Before editing, inspect the codebase and explain the plan.
- For risky changes, create a small task plan first.
- Prefer small commits.
- After every change, explain files changed and how to test.

Recommended commands:
- /review for code review
- /qa for testing flows
- /cso for security review
- /codex for creating implementation-ready Codex tasks
- /ship for release readiness

---

## Language

- The app name is **APOTEKH** — all caps, one word.
  Never write "Apotekh" in mixed case or "Apotek H" with a space.
- The country is Tanzania. Use Tsh for currency, Tanzanian regions for addresses.
- Regulatory bodies: TMDA, NHIF, PC (Pharmacy Council).
