# PharmaConnect — Claude Code Guidance

## What this project is

PharmaConnect is a pharmacy-side operating system for Tanzania. It handles
inventory management, patient safety, regulatory compliance, dispensing, NHIF
claims, CPD tracking (Phase 2), and analytics. The system is live in Phase 1 and designed
to grow through four phases.

The company is targeting the Tanzania UHI (Universal Health Insurance) mandate
as a growth catalyst and is registered in Tanzania. Primary market: independent
retail pharmacies and ADDOs in Arusha expanding nationally. Wholesale is deferred — MVP targets retail only.

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
│   │                                #   nhif, cpd, knowledge, analytics, settings
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
│   │                                #   patient-safety, nhif, cpd, knowledge,
│   │                                #   analytics, settings
│   ├── public/brand/                # SVG logos + PWA manifest
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
│
├── website/          # Public marketing website (Next.js)
├── src/              # Old Next.js prototype — do not touch
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

### Logo mark — Nexus Cross

A cross with 4 circular tip nodes and a hollow centre ring. Symbolises:
connection, pharmacy cross, network nodes.

Canvas: 100×100. Geometry:
- Vertical bar: x=43.3, y=6.7, w=13.3, h=86.6, rx=1.7
- Horizontal bar: x=6.7, y=43.3, w=86.6, h=13.3, rx=1.7
- Tip nodes (circles r=6.7): (50,13.3), (50,86.7), (13.3,50), (86.7,50)
- Hollow centre: cx=50, cy=50, r=9.2, fill=none, stroke=rgba(255,255,255,0.35)
- Background gradient: #2A9478 → #0D4035

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
| PHARMACIST_IN_CHARGE | All tiers | Full clinical + operational control |
| DISPENSER | STANDARD, PREMIUM, ENTERPRISE | Retail dispensing + patient safety tools |
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
  STANDARD, and PREMIUM. Override permissions are role-based (PIC vs assistant).
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
- HYBRID: Retail (Standard features) + Wholesale in one account, same owner.
- ENTERPRISE: Chains 6+ outlets, unlimited users, all Premium features.
- Barcode scanning: available from ADDO upward and to WHOLESALE_COUNTER_STAFF.
- EFDMS integration: active from BASIC tier upward. Runs silently in background.
  Never surface in onboarding or sales conversations. Owner can view under
  "Compliance" section after 60–90 days.

### Subscription tiers — fixed pricing (do not change without explicit instruction)

**Retail tiers:**
| Tier | Price | Outlets | Users | Trial |
|------|-------|---------|-------|-------|
| ADDO | TZS 20,000/month | 1 | 3 | 14 days |
| BASIC | TZS 39,000/month | 2 | 5 | 14 days |
| STANDARD | TZS 55,000/month | 3 | 10 | 14 days |
| PREMIUM | TZS 75,000/month | 5 | 20 | 14 days |

**Wholesale / distributor tiers (separate product/page):**
| Tier | Price | Notes |
|------|-------|-------|
| WHOLESALE | TZS 100,000/month | 1 wholesale outlet, 10 users + delivery staff |
| HYBRID | TZS 100,000/month | Retail + wholesale, same owner, unified dashboard |
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
| 2     | CPD Tracker        | Coming soon |
| 2     | NHIF Claims        | Coming soon |
| 2     | Stock Exchange     | Coming soon |
| 2     | Wholesale / B2B    | Coming soon — code exists but not actively sold; MVP is retail only |
| 3     | B2B Platform       | Coming soon |
| 3     | Patient App        | Coming soon |
| 4     | AI Safety          | Coming soon |
| 4     | Data Products      | Coming soon |

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

---

## Regulatory requirements

- **TMDA**: Tanzania Medicines and Medical Devices Authority — product registration
- **UHI**: Universal Health Insurance mandate — dispensing records required
- **NHIF**: National Health Insurance Fund — claim submission format
- **FEFO**: First Expired First Out — dispensing order for batches

---

## Key decisions

- OneDrive sync conflicts with `.git` — move project outside OneDrive for
  reliable Git operations. OneDrive actively modifies `.git/objects/` causing
  file loss during commits.
- Phase colouring was explicitly removed. Do not reintroduce amber/purple/red
  per-phase colour coding in nav or UI.
- `website/` is a separate Next.js marketing site. Do not mix its code with
  `frontend/` (the pharmacy app).
- `src/` at repo root is the old Next.js prototype. Do not modify it.
- Demo accounts in `LoginPage.tsx` are intentional for development/demo use.
  Remove before final production launch.
- Payment gateway (M-Pesa, Flutterwave) is Phase 2. Phase 1 uses manual
  payment confirmation by the founder after receiving M-Pesa or bank transfer.
  Do not build payment gateway integration until explicitly instructed.
- Patient safety module is session-based only. No patient table. No patient UUID.
  No persistent patient data of any kind.
- The override_log table must have a database-level trigger preventing DELETE
  from any role including superadmin. This is a permanent medical record.
- The B2B ordering network is closed. Retail pharmacies can only order from
  wholesale pharmacies registered on PharmaConnect. Enforce at API level.

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

- The app name is **PharmaConnect** — one word, capital P and C.
  Never write "Pharma Connect" with a space.
- The country is Tanzania. Use TZS for currency, Tanzanian regions for addresses.
- Regulatory bodies: TMDA, NHIF, PC (Pharmacy Council).
