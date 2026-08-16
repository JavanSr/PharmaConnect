# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# APOTEKH — Claude Code Guidance

> **Precedence:** When this file conflicts with `CODEX.md`, `AGENTS.MD`, or any
> task file, **this file wins**. `CODEX.md` holds coding-assistant constraints
> reconciled to this file. Audit reports live in `docs/audits/` — they are
> historical records, not instructions. If you find a contradiction between this
> file and the codebase, flag it — do not silently pick a side.

## What this project is

APOTEKH is a pharmacy-side operating system for Tanzania. It handles
inventory management, patient safety, regulatory compliance, dispensing,
CPD tracking (Phase 2), and analytics. The system is live in Phase 1 and designed
to grow through four phases.

Registered in Tanzania. **Operating base and current launch focus: Dodoma**
(the Arusha pilot was Phase 1's starting point and remains in the About-page
timeline as history; seeds/tests still use Arusha data). Primary market:
independent retail pharmacies and ADDOs, expanding nationally. Wholesale is a
separate product and **is now openly marketed** — the pricing page carries a
featured Wholesale section with its own problem/feature list and a "Discuss
wholesale" CTA. Retail remains the primary motion.

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
npm run db:seed:drug            # seed DrugDatabase (AWaRe + NEMLIT catalogue, 660 drugs)
npm run db:seed:stewardship     # seed antibiotic stewardship suggestions (DRAFT)
npm run db:seed:alternatives    # seed stockout alternative suggestions (DRAFT)
npm run db:seed:chat-rooms      # seed Chat Room launch rooms (#all-tanzania, #drug-alerts)
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
The `/release` skill (`.claude/skills/release/`) runs the full go/no-go gate —
builds, hardening tests, migration status, forbidden-string scan, price-drift
check — and is the standard pre-deploy step.

---

## Architecture overview

### Backend module pattern

Each feature lives in `backend/src/modules/<name>/`. The standard files are:

- `<name>.router.ts` — Express router. Validates with Zod schemas, calls service functions. All authenticated routes use the `authenticate` middleware and receive `AuthRequest`.
- `<name>.service.ts` — Business logic and Prisma calls. Multi-table operations use `prisma.$transaction(async tx => { ... })`.
- `<name>.storage.ts` — Present only when file storage (Supabase) is involved (e.g. compliance).

Errors thrown from services must carry a `.status` property; `errorHandler` middleware reads it for the HTTP response code.

### Middleware

`backend/src/middleware/` -- applied at router or route level.

- `auth.ts` -- JWT authentication (`authenticate` middleware). Extracts `req.user` from Bearer token. `requireRole(...roles)` enforces exact role membership.
- `tier.ts` -- `requireTier(required: SupportedTier)` -- returns 403 with `{ error: 'TIER_INSUFFICIENT', current, required, upgradeUrl }` when pharmacy subscription tier is below required. SUPER_ADMIN bypasses all tier checks.
- `trial.ts` -- `enforceTrialRestrictions` -- enforces trial expiry and subscription lapse. A pharmacy enters **grace mode** when its paid subscription lapses (status `GRACE`, or status `ACTIVE` with `trialEndsAt` in the past). Grace lasts up to 30 days. During grace, only these API prefixes remain accessible: `/dispensing`, `/inventory`, `/analytics`, `/patient-safety`, `/settings`, `/notifications`. All other routes return `GRACE_FEATURE_LOCKED`. After 30 days the pharmacy is hard-locked. The owner retains access to the subscription page throughout.
- `permissions.ts` -- `requirePermission(key)` -- granular permission checks beyond role. Full permission key list:
  - `inventory.view_products`, `inventory.manage_products`, `inventory.manage_stock`, `inventory.view_reports`
  - `dispensing.access`, `dispensing.apply_discount`, `dispensing.void_sale`, `dispensing.override_major_alert`
  - `compliance.view`, `compliance.manage`
  - `knowledge.view`, `knowledge.manage`
  - `analytics.view_dashboard`, `analytics.view_financial_reports`
  - `settings.manage_subscription`, `settings.manage_team`
  - `wholesale.view_dashboard`, `wholesale.view_catalogue_read_only`, `wholesale.manage_catalogue`, `wholesale.pick_order`, `wholesale.confirm_delivery`, `wholesale.set_credit_limits`, `wholesale.view_financial_reports`
- `requireWholesaleAccess.ts` -- compound check: passes only if `role === 'WHOLESALE_MANAGER'` OR `(role === 'OWNER' AND subscriptionTier === 'WHOLESALE')`.
- `pic-pin.ts` -- PIC PIN verification helpers (`verifyPicPinForPharmacy`, `picPinLimiter`, rate-limited to 5 attempts per 15 minutes per pharmacy). NOT a gate on safety overrides — overrides are acknowledge-and-proceed with logging (see Tier feature matrix "Override model"). A PIN supplied voluntarily on a dispensing request is rate-limit-checked; the middleware also backs non-safety flows.
- `errorHandler.ts` -- catches thrown errors with `.status` property and returns `{ error: message }` with the correct HTTP code.

### Background jobs

`backend/src/jobs/*.ts` — each exports a `register*Job()` function that sets up a `node-cron` schedule. All jobs are registered at startup in `src/index.ts`. Jobs: expiry alerts, low-stock alerts, compliance alerts, trial expiry alerts, weekly digest, VFD retry, demand predictions.

**Expiry alert thresholds** (`expiry-alerts.ts`): fires at 90, 60, **30, 21, 14, 7**, 3, **1** days before expiry. UI-surfaced thresholds are 30/21/14/7/1 only.

Urgency formula (`expiryUrgency(days: number)`):
- `days < 0`    → **EXPIRED**   — pull from shelf immediately
- `days <= 1`   → **CRITICAL**  — remove if no sale expected today
- `days <= 7`   → **URGENT**    — flag at dispensing counter
- `days <= 14`  → **WARNING**   — escalate to supplier for return/credit
- `days <= 21`  → **CAUTION**   — verify batch is dispensed first (FEFO)
- `days <= 30`  → **INFO**      — begin FEFO prioritisation
- `days > 30`   → **MONITOR**   — no action required

Alert metadata includes `urgency` field matching the formula above. Stored in `AlertLog.metadata.urgency`.

**Stock intake expiry gate** (`StockIntakePage.tsx`): when a dispenser enters an expiry date during stock receiving, a live warning fires if the batch expires within 60 days — using the same urgency formula. Levels and messages:
- `< 0 days` → EXPIRED banner — do not receive
- `≤ 1 day`  → CRITICAL — do not receive
- `≤ 7 days` → URGENT — high risk, verify with supplier
- `≤ 14 days` → WARNING — only receive if dispense before expiry
- `≤ 30 days` → CAUTION — FEFO required once received
- `≤ 60 days` → INFO — check stock levels before ordering more

### Admin module

`backend/src/modules/admin/` -- mounts at `/api/v1/admin`. All routes require `SUPER_ADMIN`.

- `GET /admin/dashboard/metrics` -- platform-wide totals: pharmacies, active pharmacies, users, dispensings, tier breakdown.
- `GET /admin/dashboard/at-risk` -- pharmacies flagged as at-risk (trial expiring, grace mode, low activity).
- `GET /admin/pharmacies` -- paginated pharmacy list with search, tier, status, region filters.
- `GET /admin/pharmacies/export-csv` -- full pharmacy list as CSV (owner name, email, phone, last login, onboarded at, activity health).
- `GET /admin/pharmacies/:id` -- single pharmacy detail.
- `PATCH /admin/pharmacies/:id/tier` -- change subscription tier.
- `PATCH /admin/pharmacies/:id/status` -- change status (ACTIVE, SUSPENDED, GRACE, TRIAL, etc).
- `PATCH /admin/pharmacies/:id/expiry` -- extend trial/subscription expiry date.
- `PATCH /admin/pharmacies/:id/notes` -- add internal admin notes.
- `POST /admin/pharmacies/:id/payments` -- record a manual payment (M-Pesa/bank) and activate/extend subscription.
- `GET /admin/pharmacies/:id/payments` -- payment history for a pharmacy.
- `GET /admin/pharmacies/:id/usage` -- feature usage stats for a pharmacy.
- `POST /admin/pharmacies/:id/impersonate` -- issue a short-lived impersonation token so SUPER_ADMIN can view a pharmacy as the owner. Frontend shows `ImpersonationBanner` during the session.
- `POST /admin/pharmacies/:id/reset-pin/:userId` -- reset a user's PIC PIN.
- `GET /admin/audit` -- platform audit log (all admin actions, with filtering).
- `GET /admin/audit/export` -- audit log as CSV.
- `GET /admin/feature-flags` -- all per-pharmacy feature flag overrides.
- `PATCH /admin/feature-flags/:pharmacyId/:featureKey` -- toggle a feature flag for a specific pharmacy.
- `POST /admin/feature-flags/reset/:pharmacyId` -- reset all feature flags for a pharmacy to defaults.
- `GET /admin/feature-flags/global` -- global feature flags (platform-wide).
- `PATCH /admin/feature-flags/global/:featureKey` -- toggle a global feature flag.
- `POST /admin/messages/send` -- broadcast a message to pharmacy owners.
- `GET /admin/messages` -- list sent messages.

**Impersonation flow:** SUPER_ADMIN clicks "View as Owner" on a pharmacy detail page. Backend issues a token scoped to that pharmacy. Frontend stores impersonation context in `authStore.impersonationInfo`. `ImpersonationBanner` appears at the top of every page during the session. The impersonated session has the same permissions as the pharmacy OWNER. All writes during impersonation are tagged with the actual SUPER_ADMIN identity in audit logs.

### Source Sync module

`backend/src/modules/source-sync/` -- mounts at `/api/v1/source-sync`. SUPER_ADMIN only.

Monitors upstream data sources (TMDA master catalogue, safety rules) for changes. Probes source URLs, computes content fingerprints, and enqueues changes into the Review Queue when a source has drifted from the last known state.

- `GET /source-sync/runs` -- list past sync run results.
- `POST /source-sync/runs` -- trigger a manual source sync check.

Changes discovered by source sync appear in the Review Queue for a platform pharmacist to approve before they update the live catalogue.

### Review Queue module

`backend/src/modules/review/` -- mounts at `/api/v1/review-queue`. Roles: OWNER, PHARMACIST_IN_CHARGE, SUPER_ADMIN.

The Review Queue holds drug catalogue entries and safety rules that were imported (from CSV, PDF, or source sync) but have not yet been validated by a platform pharmacist or confirmed against TMDA reference data.

Entry statuses: `DRAFT`, `IMPORTED`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `RETIRED`.
Reviewer types: `PLATFORM_PHARMACIST`, `TMDA_REFERENCE`.

- `GET /review-queue` -- list entries with filters (status, entityType, reviewerType).
- `GET /review-queue/:id` -- single entry detail.
- `PATCH /review-queue/:id` -- update status or add reviewer notes.

### AWaRe classification, NEMLIT catalogue, and AMR stewardship

`backend/src/data/drug-database-seed.ts` seeds the `DrugDatabase` model (clinical
facts keyed by `genericName` -- separate from `DrugProduct`, the TMDA-registered
master catalogue, and from a pharmacy's own `Product` rows). This model now
carries two **separate, non-merged** antibiotic classification systems plus
Tanzania's national essential-medicines listing:

- `awarClass` -- WHO AWaRe 2023 global classification. **International
  reference only** -- never the primary badge.
- `tanzaniaAwareClass` -- Tanzania STG/NEMLIT 2021 (Part I, §6.2.1-6.2.3)
  classification. **Primary** -- this is what the dispensing-screen AWaRe dot
  and the AMR stewardship suggestions are driven by.
- `nemlitListed` (boolean) + `nemlitFacilityLevel` (`A`/`B`/`C`/`D`/`S`) --
  whether the drug is in Tanzania's National Essential Medicines List at all,
  and the minimum facility tier permitted to prescribe/stock it, independent
  of AWaRe grouping.

**Resolution order** (`enrichProductsWithAwarClass()` in
`backend/src/modules/inventory/inventory.service.ts`): an explicit per-product
override wins outright; otherwise **Tanzania's classification is primary**,
falling back to WHO's only when Tanzania's STG doesn't classify that drug.
WHO's value is still returned separately (`whoAwareClass`) as a secondary
reference field -- do not surface it as the primary badge anywhere.

**Tanzania and WHO disagree on 11 of the 36 antibiotics Tanzania's STG
classifies** (confirmed against the STG source text, not assumed) -- most
importantly co-trimoxazole (Tanzania: Watch, WHO: Access) since it's one of
the most commonly dispensed drugs in the country. When adding new antibiotics
to the seed, always check both `getAwarClass()` and `getTanzaniaAwareClass()`
in `drug-database-seed.ts` -- do not assume they agree.

**NEMLIT full catalogue** (`NEMLIT_FULL_CATALOGUE_SEED` in the same file):
mechanically extracted from Tanzania's STG/NEMLIT 2021 PDF (Part I, all 28
therapeutic chapters), ~650 total `DrugDatabase` rows. This is a **bulk,
unreviewed** extraction -- `clinicianReviewed: false` throughout, dosing
fields are generic placeholders (NEMLIT Part I lists drug/formulation/
facility-level only; actual dosing regimens live in Part II, organized by
disease, not yet digitized). Route and therapeutic-category tags are
best-effort from chapter grouping, not clinician-verified. Treat this as a
name/AWaRe/NEMLIT-status catalogue, not a dosing reference, until reviewed.

**AMR stewardship-lite** (`backend/src/modules/patient-safety/`): at
dispensing, when a WATCH/RESERVE antibiotic (per the resolved/Tanzania-primary
class) is added to the cart, the frontend shows an optional, non-blocking
"Indication?" picker (`StewardshipIndication`: `URTI`, `PNEUMONIA`, `UTI`,
`STI`, `OTHER`). Leaving it blank never affects checkout. If an indication is
selected and a reviewed alternative exists, a dismissible suggestion chip
appears (`GET /patient-safety/stewardship-suggestion`). Every dispense of a
WATCH/RESERVE drug -- indication given or not -- writes an anonymous
`SafetyEvent` (`eventType: 'AMR_INDICATION_CAPTURED'`, no patient data),
surfaced as an "AMR Stewardship" panel on Reports > Safety Impact: sales with
vs. without an indication recorded, framed as a PIC training signal, never a
compliance check.

Suggestion content lives in `StewardshipSuggestion` (own migration,
`reviewStatus` field mirroring `DrugProduct`'s pattern) and is seeded via
`npm run db:seed:stewardship` (`backend/prisma/seed-stewardship-suggestions.ts`).
**Every row ships as `DRAFT`** -- the live lookup only ever returns `APPROVED`
rows. There is no admin UI to approve them yet (approve via Prisma Studio);
wiring this into the Review Queue module properly (which currently only
updates its own queue rows, not the underlying entity) is a real follow-up,
not yet built. Suggestions are two evidence tiers, distinguished by
`sourceCitation`: most are grounded in specific Tanzania STG 2021 Part II
tables (cited by table/page); three URTI suggestions are general stewardship
principle (no specific STG table found) and are labeled as such so a
reviewing pharmacist knows which kind of check to do. Deliberately omit STI
entirely (Tanzania's own NEMLIT upgrades ceftriaxone/azithromycin/cefixime to
facility-level A specifically for STI, meaning a downgrade suggestion would
contradict national policy) and UTI beyond complicated cystitis (the STG's
own first-line for pyelonephritis/urosepsis has no Access-tier alternative).

### Stockout alternatives

General-purpose medicine substitution, distinct from the antibiotic
stewardship suggestions above: triggered by "this drug has zero stock right
now" at the dispensing counter, not by a clinical indication. Model is
`TherapeuticAlternative` (`backend/prisma/schema.prisma`), seeded via
`npm run db:seed:alternatives` (`backend/prisma/seed-therapeutic-alternatives.ts`).
Same `DRAFT`-until-`APPROVED` governance as stewardship suggestions.

`getStockoutAlternatives(pharmacyId, genericName)` in `inventory.service.ts`
(`GET /inventory/products/stockout-alternatives`) only ever returns an
alternative if the pharmacy has real, unexpired, in-stock inventory of it
right now -- otherwise there is nothing useful to suggest, so nothing is
returned. Not trial/grace-restricted (matches `/inventory` staying open
during grace, unlike Knowledge Hub / Chat Room).

**Frontend trigger is narrower than it may first appear:** in
`DispensingScreen.tsx`, the "out of stock" prompt (`outOfStockMatches` +
`StockoutAlternatives` component) only fires when the search returns *zero*
in-stock matches. If a pharmacy stocks multiple brands of the same generic
and only one is out, the search still returns the others and the prompt
never appears for the out-of-stock one -- known scope boundary, not a bug.

**Seed content is deliberately a small set (8 rows / 4 pairs), not
exhaustive coverage of the catalogue.** Every pair in the core drug list was
checked for genuine interchangeability before inclusion; most were excluded
on purpose:
- metformin / glibenclamide -- different diabetes-drug classes, different
  hypoglycaemia and renal risk profiles, not a casual swap.
- carbamazepine / valproate -- switching anticonvulsants is a specialist
  decision (seizure-type-specific), not a counter-side substitution.
- furosemide / spironolactone -- often used *together*, not as alternatives
  to each other.
- rifampicin, dolutegravir, artemether-lumefantrine -- single-purpose drugs
  inside standardised national programmes (TB/DOTS, HIV/ART, malaria
  treatment guidelines). Ad-hoc substitution at the pharmacy counter is
  never appropriate for these -- do not add alternative rows for them.
- warfarin -- no safe casual substitute; switching anticoagulants needs
  clinical oversight (INR monitoring).

What shipped: diclofenac/ibuprofen/paracetamol (NSAID-for-NSAID and
paracetamol-as-safer-default, all directions) and enalapril/losartan (the
standard ACE-inhibitor/ARB swap). Extending this to more of the 660-drug
catalogue requires the same per-pair clinical reasoning, not a bulk pass.

### Chat Room module

`backend/src/modules/chat/` -- mounts at `/api/v1/chat`. Lives inside the
frontend Knowledge Hub as a tab (`KnowledgeFeedPage.tsx`, tab id `'chat'`,
component `ChatRoomPage` rendered with `embedded`), not a standalone route --
there is deliberately no `/chat` page or sidebar entry.

**Access is gated identically to Knowledge Hub, with no exceptions:**
`authenticate` + `enforceTrialRestrictions` + `requirePermission('knowledge.view')`,
same three middlewares in the same order as `knowledge.router.ts`. This
includes `#drug-alerts`, the TMDA recall/safety broadcast room -- founder
decision, made with the tradeoff explicitly on the table (a lapsed pharmacy
loses the recall channel along with everything else). Do not carve out an
exception for `#drug-alerts` without asking first; a past version of this
guidance recommended exempting it and was explicitly overruled.

**Cross-pharmacy by design, not a bug:** `ChatRoom` / `ChatRoomMembership` /
`ChatRoomMessage` are NOT scoped by `pharmacyId`. Membership carries
`userType` and `isApotekhCustomer` independently of the `User` row so a
future non-APOTEKH registration path (doctors/nurses/students joining a
Medscape-style knowledge community, or other products on a future "APOTEKH
Platform" alongside this one) needs no schema change -- only a new
registration path writing to the same tables. `ChatRoom.region` exists for
this reason too.

**Launch scope is deliberately two rooms**, seeded via `npm run db:seed:chat-rooms`
(`backend/prisma/seed-chat-rooms.ts`): `#all-tanzania` (national, everyone
auto-joins on first visit) and `#drug-alerts` (read-only, `SUPER_ADMIN` /
system posts only). Regional rooms (`ChatRoomKind.REGIONAL`) stay in the
schema but unopened -- an empty regional room reads as "nobody is here" and
was assessed as worse than not having one yet; open one only when a region
has enough members to sustain conversation.

Real-time delivery reuses the existing SSE pattern in
`realtime.service.ts` (`registerRoomClient` / `emitToRoom`, keyed by
`roomId` alongside the pre-existing pharmacy-keyed functions) -- no new
transport was introduced.

**Hard constraint:** never add a patient-identifying field (case reference
codes, "PAT-XXX" style IDs, anything that could re-link a message to a real
person) to `ChatRoomMessage`. Free text can't be technically policed, but the
composer must always carry a visible reminder not to include patient
identifying details.

A separate, unrelated pharmacy-internal forum (`ChatThread`/`ChatMessage`,
"Community" tab) was removed 2026-08-16: it shipped with a live router and
frontend tab, but the underlying database tables were never actually
created (the migration creating them sat as an uncommitted-to-folder loose
`.sql` file and was never run) -- the feature 500'd on every use since it was
built. See `backend/prisma/migrations/manual_knowledge_cms_and_chat.sql`,
kept in place with a superseded notice rather than deleted, for the full
story.

### Forecasting module

`backend/src/modules/forecasting/` -- mounts at `/api/v1/forecasting`. Requires `analytics.view_dashboard` permission. Trial restrictions enforced.

- `GET /forecasting/stockout` -- PREMIUM tier. Stockout risk forecast: products with projected runout within the lead time window, based on consumption velocity over a configurable lookback period (7-180 days). Returns ranked list with days-until-stockout, velocity, and reorder suggestion.
- `GET /forecasting/dead-stock` -- PREMIUM tier. Dead stock scoring: products with low velocity and high on-hand quantity. Scores products for clearance or return.
- `GET /forecasting/seasonality` -- PREMIUM tier. Seasonal demand time series for selected products.
- `GET /forecasting/regional-stub` -- Regional forecast stub (placeholder for Phase 2 network-level forecasting).

Feature usage is tracked via `trackFeatureTelemetry()` on each forecasting request.

### Catalogue Import module

`backend/src/modules/catalogue-import/` -- mounts at `/api/v1/catalogue-import`. Roles: OWNER, PHARMACIST_IN_CHARGE, DISPENSER, SUPER_ADMIN.

AI-powered PDF catalogue ingestion. SUPER_ADMIN or staff uploads a supplier PDF price list; the Anthropic claude-haiku model extracts product names, generics, strengths, dosage forms, and unit prices into structured JSON. Results are returned for review before import.

- `POST /catalogue-import/extract` -- upload PDF (max 20 MB), returns extracted product rows. Requires `ANTHROPIC_API_KEY`. Returns 503 if key not configured.

### Feature Telemetry

`backend/src/modules/telemetry/feature-telemetry.service.ts`

Lightweight usage tracking. `trackFeatureTelemetry({ pharmacyId, userId, featureKey, eventType })` writes a row to the `feature_telemetry` table. Event types: `ACTIVATED` (first use), `USED` (subsequent). Used by Forecasting, AI Agents, and other premium features. Data surfaces in the admin pharmacy usage view.

### AzamPay + Subscription modules

`backend/src/modules/azampay/` + `backend/src/modules/subscription/`.

Self-service subscription payments via AzamPay MNO checkout (STK push):

- `POST /api/v1/settings/subscription/checkout` (OWNER) — creates a
  `SubscriptionPaymentRequest` (`paymentMethod: 'SELF_SERVICE_CHECKOUT'`, unique
  `APTK-…` reference) and, when AzamPay is configured, fires the STK push
  immediately. Falls back to a `SUBSCRIPTION_PAYMENT_LINK_TEMPLATE` checkout URL
  when it is not.
- `POST /api/v1/azampay/initiate` (authenticated) — re-trigger the STK push for a
  PENDING checkout reference. Scoped to the owning pharmacy (foreign references
  return 404) and rate-limited (8 per 15 min per pharmacy) so a leaked reference
  can't be used to spam someone's phone.
- `POST /api/v1/azampay/callback` (public) — AzamPay confirmation webhook.
  **Authenticated by `AZAMPAY_CALLBACK_SECRET`** (register the callback URL with
  `?secret=<value>` in the AzamPay dashboard; `x-callback-secret` header also
  accepted; timing-safe compare). Unset secret = unauthenticated callback, logged
  loudly — never ship production without it. When the payload carries an amount,
  it must match the request amount or activation is refused. Legitimate flows
  answer 200 (so AzamPay doesn't retry a possibly-activated payment); forged
  requests get 401. Matches on `transactionRef`, activates inside a
  `$transaction` via a conditional PENDING→CONFIRMED update (race-safe /
  idempotent — a replayed callback cannot double-extend), and writes a
  `SUBSCRIPTION_ACTIVATED` in-app `Notification`.
- Price table lives in `subscription-payments.service.ts`
  (`SUBSCRIPTION_PRICE_TABLE`) — monthly and annual (10×) per tier. This is the
  authoritative machine-readable price list; keep it in sync with the pricing
  section below and `website/src/lib/data/pricing.ts`.
- `SELF_SERVICE_TIERS` includes `ADDO_PLUS` (Tsh 45,000/mo) for legacy accounts,
  but the frontend paywall and SubscriptionPage intentionally exclude it — it is
  not a marketed tier. WHOLESALE **is** self-service purchasable.

### Realtime, Founder, NHIF stub modules

- `backend/src/modules/realtime/` — lightweight realtime router/service (small;
  check source before extending).
- `backend/src/modules/founder/` — founder-hub endpoints backing
  `/superadmin/founder` (payment queue, registrations, overrides).
- `backend/src/modules/nhif/` — deferred-feature placeholder only
  (`deferredFeatureHandler`, "pending NHIF Breeze API accreditation"). No claim
  logic. Same pattern for `patients/` (session-based safety; placeholder router).

### Waitlist module

`backend/src/modules/waitlist/` -- mounts at `/api/v1/waitlist`. No authentication required (public endpoint).

Captures pre-registration interest from the marketing website before a pharmacy completes full signup.

### Me module

`backend/src/modules/me/` -- mounts at `/api/v1/me`. Returns the authenticated user's own profile, linked pharmacies, and active session context. Used by the frontend on app load to hydrate `authStore` and `pharmacyStore`.

### Notifications module

`backend/src/modules/notifications/` -- mounts at `/api/v1/notifications`.

- `GET /notifications` -- list in-app notifications for the authenticated user (paginated, with unread count).
- `PATCH /notifications/read-all` -- mark all notifications as read.
- `PATCH /notifications/:id/read` -- mark a single notification as read.
- Notification preferences endpoint for opt-in/out per notification type.

### Daily Close

`GET /api/v1/dispensing/daily-close` (also aliased as `/close-day`) -- generates the end-of-day summary: total revenue, transaction count, payment method breakdown (cash, mobile money, insurance), voids, and returns. A daily close record is saved so the summary is consistent even if viewed after midnight. Accessible to OWNER, PHARMACIST_IN_CHARGE, DISPENSER.

### Controlled Drugs Register

`GET /api/v1/dispensing/controlled-register` -- lists all dispensed items where the drug class is CONTROLLED or NARCOTIC. Required for regulatory inspection. Accessible to OWNER, PHARMACIST_IN_CHARGE, SUPER_ADMIN.

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
- Text: `APOTEK` in #1A3328, `H` in #E8A020 (amber — mirrors the active node)

Logo wordmark (`apotekh-logo-white.svg`, dark backgrounds):
- Bars + nodes: white
- Right node: #E8A020 (amber active node)
- Text: `APOTEK` in white, `H` in #E8A020 (amber — mirrors the active node)

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
  NCD hints, diagnosis-drug matching, AMR stewardship suggestions (see "AWaRe
  classification, NEMLIT catalogue, and AMR stewardship" above), and override
  logging are identical across ADDO, BASIC, STANDARD, and PREMIUM. "Alternative
  medicine suggestions / therapeutic equivalence matching" beyond the AMR
  stewardship suggestions described above is aspirational marketing language,
  not yet a built feature — do not assume a general-purpose equivalence engine
  exists elsewhere in the codebase.
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
| Tier (marketing name) | Prisma enum value | Price | Outlets | Users | Trial |
|------|-------|-------|---------|-------|-------|
| ADDO | `ADDO` | Tsh 15,000/month | 1 | 3 | 14 days |
| BASIC | `ESSENTIAL` | Tsh 39,000/month | 2 | 5 | 14 days |
| STANDARD | `STANDARD` | Tsh 55,000/month | 3 | 10 | 14 days |
| PREMIUM | `PREMIUM` | Tsh 75,000/month | 5 | 20 | 14 days |

**Enum ↔ marketing name mapping (do not confuse the two):**
The `SubscriptionTier` Prisma enum is `FREE, ADDO, ESSENTIAL, ADDO_PLUS, STANDARD,
PREMIUM, WHOLESALE, ENTERPRISE`. In code, the 39,000 tier is `ESSENTIAL`; in all
UI, marketing, and docs it is called **BASIC**. `ADDO_PLUS` is a **legacy tier for
existing accounts only**: it keeps a renewal price (Tsh 45,000/mo in
`SUBSCRIPTION_PRICE_TABLE`) so legacy pharmacies can self-service renew, and
`SubscriptionPage` displays it as "ADDO Plus" — but it is deliberately excluded
from the paywall and all tier-selection UI ("not a marketed tier"), and
`backend/src/types/roles.ts` normalises its permission level. Never offer
ADDO_PLUS to new customers, never show "ESSENTIAL" as a tier name in UI, and
never add it to the website pricing page.

**Wholesale / distributor tiers (separate product/page):**
| Tier | Price | Notes |
|------|-------|-------|
| WHOLESALE | Tsh 100,000/month | 1 wholesale outlet, 10 users + delivery staff |
| ENTERPRISE | Negotiated | 6+ outlets, chains, hospital pharmacies |

**Billing cycles** (`BillingCycle` enum: `MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL`):
- Monthly: base price
- Quarterly (3 months): 3× monthly — no discount, commitment-lite
- Semi-annual (6 months): 5.5× monthly — "save 8%"
- Annual: 10× monthly — "2 months free" (~17%, always the best rate; keep the gradient)

**UI naming conventions (enforce strictly):**
- "Clinical Decision Support" — suite name (never "Patient Safety Suite")
- "Patient Ordering Portal" — never "online storefront" or "e-commerce"
- "Owner Dashboard" — never "remote dashboard"
- "Knowledge Hub" — consistent label across all tiers
- "Compliance" — section header, never "EFDMS" or "TRA" in UI
- "APOTEKH" — platform name, never "PharmaConnect"

### Freemium / metered-access model for non-paying retail pharmacies (decided, NOT YET BUILT)

**Status: policy decision only — no metering/paywall-degradation logic exists in
the codebase yet.** This is founder-agreed direction for a future build, tracked
in `docs/future-features.md` under Financial & Billing. Do not assume any of the
caps below are enforced anywhere until that work is actually implemented.

**Rationale:** a lapsed/never-subscribed pharmacy should never hit a 100% wall.
The goal is reach and data flow (every pharmacy on the platform, paying or not,
still generates operational signal) — full lockout drives pharmacies back
to zero-tooling rather than toward paying. Every feature below either stays
fully free or degrades to a reduced/capped version; nothing goes to zero.
Pricing itself is designed to be a rounding error against a pharmacy's daily
revenue (e.g. an ADDO clearing ~30,000 Tsh/day pays ~500 Tsh/day at the
15,000/month tier), so a capped-not-cut free tier is a deliberate, generous
floor, not a workaround to avoid ever having to pay.

| Feature | Free / non-paying behaviour | Degrades to |
|---|---|---|
| Dispensing + Inventory | Unlimited, always | — never metered |
| Barcode/QR scanner | Unlimited, always | — never metered |
| Drug interaction alerts — ALL severities (HIGH, CONTRAINDICATED, MODERATE, MINOR) share one pool | 10 full-detail alerts/month | Alert still fires ("something is wrong here") but with no detail — no exemption for HIGH/CONTRAINDICATED; founder's explicit call after considering it, reasoning that most competing systems in-market don't offer interaction checking at all, so even the degraded version is a net improvement over the status quo |
| AMR stewardship suggestion chips | 10/month | Chip stops appearing; indication logging (anonymous `SafetyEvent`) keeps working regardless |
| Chat Room — including `#drug-alerts` | Read-only, always | No posting; no exception for `#drug-alerts` — matches the existing hard gate decision in the Chat Room module section below (same middlewares as Knowledge Hub, no carve-out) |
| Knowledge Hub | 3 full articles/month | Headlines/list stay visible; article body locks |
| Analytics | Today's revenue total only | Everything else (sparkline, breakdowns, forecasting inputs) locked |
| Compliance / DLDM | Deadline list stays visible | Upload, storage, reminders lock |
| Forecasting | None | Fully locked — PREMIUM-only regardless of payment state, unchanged from today |

Reset cycle: calendar month, per pharmacy. Restoration on payment is instant
(reuses the existing AzamPay callback → `activateSubscriptionFromPayment` flip
already live for subscription activation — no new restore logic needed).

---


### Reports module

**Retail reports** (`/reports` — OWNER, PHARMACIST_IN_CHARGE, SUPER_ADMIN):

| Report | Endpoint | Export |
|--------|----------|--------|
| Expiry by threshold | `GET /reports/expiry?threshold=N` | CSV, PDF |
| Dispensing (top products, revenue) | `GET /reports/dispensing?from=&to=` | CSV, PDF |
| Payment method breakdown | `GET /reports/payment-breakdown?from=&to=` | JSON |
| Stock movement | `GET /reports/stock-movement?from=&to=` | CSV, PDF |
| Voids & returns | `GET /reports/voids-returns?from=&to=` | CSV, PDF |
| Safety impact | `GET /reports/safety-impact` | JSON |
| Revenue summary | `GET /reports/financial/revenue?from=&to=` | CSV, PDF |
| Inventory on-hand | `GET /reports/inventory` | CSV |
| Peer benchmark | `GET /reports/benchmarking/peer` | JSON |

**Wholesale reports** (`/b2b` — OWNER, WHOLESALE_MANAGER):
- `/b2b/demand-insights` — revenue this 30d vs prev, order counts, top products, fulfillment rate
- `/b2b/receivables-aging` — outstanding balances bucketed at 30/60/90+ days

All retail CSV/PDF exports use `streamCsv()` and `renderReportPdf()` from `reports.service.ts`.

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
| 2     | Wholesale / B2B    | Built and openly marketed (featured section on the pricing page); retail remains the primary sales motion |
| 3     | B2B Platform (open marketplace — distinct from the closed Wholesale/B2B module above) | Coming soon |
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

## Supplier Portal (Tier 2 Wholesaler Integration)

### Overview

The Supplier Portal is a tokenized, server-rendered order-confirmation page that a non-APOTEKH wholesaler can open in any browser -- no account required. When a pharmacy submits a stock order and provides a supplier phone number, APOTEKH generates a unique 14-day token and returns a WhatsApp-ready link. The wholesaler taps the link, confirms quantities and prices for each line item, and the pharmacy receives an in-app notification.

This is Tier 2 of the three-tier wholesaler model:
- **Tier 1**: Wholesaler is an APOTEKH subscriber -- orders handled fully in-app.
- **Tier 2**: Wholesaler has no APOTEKH account -- tokenized portal (this feature).
- **Tier 3**: Wholesaler has an ERP/API -- direct integration (Phase 2).

### Architecture

**Backend files:**
- `backend/src/modules/inventory/supplier-portal.router.ts` -- public Express router (no auth middleware), mounts at `/supplier-portal`
- `backend/src/modules/inventory/supplier-portal.service.ts` -- token generation, portal retrieval, confirm/reject logic, in-app notification
- `backend/src/modules/inventory/supplier-portal.html.ts` -- pure HTML/CSS/vanilla-JS server-rendered template (no React, no build step, works on basic Android browsers)

**Schema models** (in `backend/prisma/schema.prisma`):
- `SupplierPortalToken` -- one token per stock order (unique constraint), 14-day expiry, tracks PENDING / VIEWED / CONFIRMED / PARTIALLY_CONFIRMED / REJECTED / EXPIRED
- `SupplierPortalLineItem` -- one row per stock order item, stores quantityConfirmed, unitPrice, available flag, notes
- `SupplierPortalStatus` -- Prisma enum

**Pending user action after schema change:**
```bash
npx prisma migrate dev --name supplier_portal
npx prisma generate
```
Until `prisma generate` runs, `supplier-portal.service.ts` uses `(prisma as any)` for the two new models. Remove the cast after regeneration.

### API Routes (public -- no auth)

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/supplier-portal/:token` | Serve HTML portal page |
| `POST` | `/supplier-portal/:token/confirm` | Supplier confirms order |
| `POST` | `/supplier-portal/:token/reject` | Supplier rejects order |

**Token generation** is triggered by `POST /api/v1/stock-orders/:id/submit` when `supplierName` or `supplierPhone` is included in the request body. The submit endpoint now accepts:
```json
{ "supplierName": "...", "supplierPhone": "255...", "supplierEmail": "..." }
```
And returns:
```json
{ "data": { ...order, "portalLink": "https://wa.me/...", "portalToken": "uuid" } }
```

### Notification on response

When the supplier confirms or rejects, the service writes to `prisma.notification` (NOT `alertLog`) with:
- `type: 'SUPPLIER_PORTAL_RESPONSE'`
- `title`: "[Supplier name] confirmed/rejected your order"
- `body`: summary with optional supplier note
- `metadata`: includes `stockOrderId`, `supplierPortalTokenId`, `status`, `deliveryDate`

**Never use `alertLog` for portal notifications.** `AlertLog` is for outbound SMS/email delivery tracking (has `channel`, `referenceType`, `status` fields). `Notification` is the correct in-app inbox model.

### WhatsApp link format

```
wa.me/{phone}?text=*APOTEKH Purchase Order -- {orderNumber}*%0AFrom: {pharmacyName}%0A%0APlease review and confirm this order:%0A{portalUrl}%0A%0AThe link is valid for 14 days. No account needed.
```

`BACKEND_URL` env variable controls the portal base URL. Falls back to `RAILWAY_STATIC_URL` then `https://api.apotekh.co.tz`.

### Idempotency

`generatePortalToken()` is idempotent -- if a token already exists for a stock order, it returns the existing one. Resubmitting the same order does not create a duplicate token.


---

## Wholesale System

### Overview

APOTEKH Wholesale is a separate B2B operations system for wholesale pharmacies and distributors. It runs on the same platform backbone (auth, users, catalogue, outlet data) as retail but has independent workflows: catalogues with tiered pricing, buyer orders, credit management, delivery logistics, VAT invoicing, and demand insights.

**Key principle (updated):** Wholesale is now openly marketed — `website/src/lib/data/pricing.ts` carries a featured WHOLESALE tier (Tsh 100,000/month, "Discuss wholesale" CTA) with a problem-led pitch. Note the deliberate nuance: wholesale marketing may reference **TRA-compliant VAT invoicing** (B2B buyers need it), while retail UI/onboarding still never mentions EFDMS/TRA/VFD. Do not copy TRA language into any retail-facing surface.

### Wholesale monetization roadmap — subscription now, commission later (decided, NOT YET BUILT)

**Status: policy decision only.** Wholesale bills exactly like retail today —
flat Tsh 100,000/month via the existing AzamPay flow
(`SUBSCRIPTION_PRICE_TABLE`). No commission calculation, per-order billing, or
invoicing-against-volume logic exists in the codebase. This section records
the agreed direction so a future build stays consistent with it.

**Plan:** onboard wholesalers on the flat subscription first (reuses existing
billing infra, no new engineering to launch). Tell wholesalers upfront, as
part of the pitch, that pricing will transition from flat subscription to a
volume-based commission (~1%) once order volume through the platform
justifies it — stated as a roadmap, not sprung on them later.

**Why commission, eventually:** an ADDO-tier retail pharmacy typically orders
roughly Tsh 300,000–2,000,000/month. A wholesaler with even 15–20 active buyer
pharmacies ordering through APOTEKH could see Tsh 15–50 million/month in
platform-routed order volume — at which point 1% (150,000–500,000/month)
matches or exceeds the flat fee, and scales with the wholesaler's own growth
instead of capping out. This also ties revenue to whether APOTEKH is actually
driving the wholesaler's growth, which is a more honest pitch to a skeptical
first-time wholesaler than a flat fee charged regardless of outcome. ~1% also
matches an already-normalized local precedent (mobile money / payment
processors like M-Pesa, Nala) so it doesn't read as an unusual ask.

**Non-paying / lapsed wholesaler access (mirrors the retail freemium model
above — no hard wall):** the wholesaler's catalogue stays visible to retail
buyers searching/browsing (preserves the network-effect "magnet" value —
retail pharmacies still discover what they stock and at what price), but the
one-tap order button is disabled. The buyer sees the product and price and
must contact the wholesaler off-platform to complete the order. This is not a
new UX pattern to invent — it's the same contact-only model already live in
Supplier Discovery / the Tier 2 Supplier Portal (`GET
/suppliers/price-comparison`, "no automated ordering; users must contact
suppliers directly"). Reuse that pattern rather than building a second one.

**When actually implementing:** if an existing paying wholesaler is later
moved from flat-fee to commission, let them run on whichever is cheaper for a
grace period rather than a hard cutover — a volume-based rate can come out
higher than the flat fee at high volume, and switching should read as
"better deal," not a bait-and-switch.

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

**Tiers with pricing control** (these are the `SubscriptionTier` enum values the
`tierPrices` map accepts — see `b2b.router.ts` Zod schema):
- `ADDO` (marketing: ADDO, Tsh 15,000/month)
- `ESSENTIAL` (marketing: BASIC, Tsh 39,000/month)
- `STANDARD` (Tsh 55,000/month)
- `PREMIUM` (Tsh 75,000/month)
- `WHOLESALE` / `ENTERPRISE` (negotiated)
- `ADDO_PLUS` is accepted for backward compatibility only — treated as ESSENTIAL
  level. Do not set new tier prices against it.

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

**Shipped since this roadmap was first written** (do not rebuild — extend the
existing implementations):

- **RMA / returns workflow** — returns with approval step and auto-generated
  credit note numbers (`CN-YYYY-#####`): `createWholesaleReturn` /
  `approveWholesaleReturn` in `b2b.extensions.service.ts`, `ReturnsPage.tsx`.
- **Client-level custom pricing** — per-client price overrides layered over tier
  pricing: `upsertClientPriceOverride` / `listClientEffectivePrices`,
  `ClientPricingPage.tsx`, `/b2b/clients/:clientPharmacyId/prices` endpoints.
- **Discount schemes** — `FREE_GOODS`, `PERCENTAGE_DISCOUNT`, `FIXED_DISCOUNT`
  scheme types with `WholesaleSchemesPage.tsx`.
- **Buyer auto stock update on delivery confirmation** — `confirmDelivery()` in
  `b2b.service.ts` FEFO-allocates the delivered quantity across the seller's
  real batches: decrements seller stock (`TRANSFERRED` movements), mirrors each
  consumed batch on the buyer side with its true batch number and expiry date,
  and releases the order's stock reservation. Buyer products are matched by
  case-insensitive name; unmatched lines are reported in `stockSkipped` and
  raise a `B2B_STOCK_UPDATE_SKIPPED` in-app notification telling the buyer to
  create the product and receive via Stock Intake.
- **Partial fulfilment & backorders** — `POST /b2b/orders` accepts
  `allowPartialFulfilment: true`: lines are clamped to available stock and the
  shortfall lands in `b2b_backorders` (a real Prisma model, `B2bBackorder`).
  Queue endpoints: `GET /b2b/backorders?side=seller|buyer`,
  `PATCH /b2b/backorders/:id/cancel`, `POST /b2b/backorders/:id/fulfil`
  (creates a follow-up order; MOQ waived). Stock intake (`receiveBatch`)
  notifies the seller when a backordered product arrives. Buyer UI: checkbox on
  `BuyerOrderPage`; seller UI: queue panel on `WholesaleDashboardPage`.
  Tests: `tests/b2b-backorders.test.ts`.
- **Suspicious Order Monitoring (SOM)** — `flagSuspiciousControlledOrder()` in
  `b2b.service.ts` runs on every B2B order: CONTROLLED/NARCOTIC lines above
  max(`SOM_CONTROLLED_QTY_THRESHOLD` env, default 100; 3× the product's 90-day
  average at that seller) raise a `SUSPICIOUS_ORDER_ALERT` in-app notification
  to the seller. Alert-only — never blocks the order.
- **Payment terms & overdue receivables** — `listReceivablesAging` joins
  `client_credit_limits.payment_terms_days` (default net-30) for per-invoice
  `dueDate`/`isOverdue`/`daysOverdue`, and nets `wholesale_payments` (linked by
  `invoice_id`) against invoices. Collections page lists open invoices and can
  link payments to them.
- **Supplier purchase orders** with AI delivery-note extraction
  (`/b2b/purchase-orders/*`), **wholesale payments/collections**
  (`/b2b/payments`, `WholesaleCollectionsPage.tsx`), **delivery manifests**,
  **buyer-seller links** with order gating, and **delivery disputes**.

The following features are **not yet built** and are candidates for Phase 2. They represent the gap between "functional wholesale MVP" and "enterprise-grade distributor platform."

| Feature | Current Status | Phase 2 Rationale | Complexity |
|---------|---|---|---|
| **Multi-Warehouse Stock Consolidation** | Stock is pharmacy-level only; no warehouse model | Distributors have multiple physical locations. Need unified stock view before committing to buyer order, and ability to pull from any warehouse. | High |
| **Wholesale Licence Management** | Compliance tracks retail licences only | Wholesalers have separate dealer licences. System must track expiry and warn before license lapses. | Low |
| **Stock Movement Reports** | Raw audit log exists; no formatted reports | Warehouse managers and regulators need stock in/out by product, by warehouse, by time period. Need exportable format (CSV/PDF). | Low |
| **Lot/Batch Traceability Audit Trail** | Batch data exists; no formal regulatory report | Regulator requests: "Show me all batches of this product from supplier X to dispenser Y." System must generate on demand. | Medium |
| **Controlled Substance Dispensing Logs (Wholesale)** | Retail register exists; SOM alerts exist; no formal wholesale dispatch log | Wholesalers distributing controlled items must log dispatch to each buyer. Separate from retail controlled register. | Medium |

### Wholesale Phase 2 Implementation Priority

**High impact (do first):**
1. Multi-warehouse consolidation — enabler for distributor use case

**Medium impact, lower effort (quick wins):**
2. Stock movement reports — regulatory audit readiness

**Lower priority (Phase 2.5+):**
3. Wholesale licence management — only for multi-territory expansion
4. Lot traceability report — rarely requested; batch data already exists for manual audit
5. Controlled substance dispatch log (wholesale) — pending real controlled-item wholesale volume

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

### Language / i18n

The app has a **lightweight i18n layer**: `frontend/src/i18n/` (i18next,
`en.json` + `sw.json`, language persisted in `localStorage.apotekh_lang`,
toggle surfaced in `TopBar`). Coverage is deliberately thin — nav, common
actions, dispensing/inventory labels, error messages — not a full translation.
Rules:
- English is the fallback and the default; new features ship in English first.
- When touching a string that already has a key in `en.json`, keep using the
  key — don't hardcode a raw string next to a translated sibling.
- Do not mass-translate the app or grow `sw.json` beyond high-traffic UI
  strings without explicit founder instruction.
- The marketing website (`website/`) remains English.

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

**Frontend pages inventory (all under `frontend/src/modules/`):**

- `admin/AdminShell.tsx` -- dark-theme admin layout for SUPER_ADMIN. Nav: Dashboard, Founder Hub, Pharmacies, Audit Log, Feature Flags, Messages.
- `admin/AdminDashboardPage.tsx` -- platform metrics dashboard.
- `admin/AdminPharmaciesPage.tsx` -- searchable/filterable pharmacy list.
- `admin/AdminPharmacyDetailPage.tsx` -- single pharmacy drill-down: tier, status, expiry, notes, usage, payments, impersonate button.
- `admin/AdminAuditPage.tsx` -- platform audit log viewer.
- `admin/AdminFeatureFlagsPage.tsx` -- per-pharmacy and global feature flag toggles.
- `admin/AdminMessagesPage.tsx` -- broadcast message composer.
- `admin/ImpersonationBanner.tsx` -- orange top-bar shown when SUPER_ADMIN is viewing as an owner. Shows pharmacy name and provides exit link.
- `analytics/ForecastingPage.tsx` -- PREMIUM forecasting: stockout risk, dead stock, seasonality charts.
- `dispensing/DailyClose.tsx` -- end-of-day summary with payment breakdown and close-day confirmation.
- `dispensing/ControlledDrugsRegisterPage.tsx` -- CONTROLLED/NARCOTIC dispensing log for regulatory inspection.
- `dispensing/DispensingReturnsPage.tsx` -- void and return history with filters.
- `dispensing/PatientSafetyAlertsPage.tsx` -- log of all safety alerts fired during dispensing sessions.
- `inventory/CatalogueImportPage.tsx` -- PDF supplier catalogue upload; shows AI-extracted rows for review before import.
- `inventory/MedicinePriceComparisonPage.tsx` -- standalone price comparison page across all catalogued suppliers.
- `inventory/WholesalerDiscoveryPage.tsx` -- find and filter APOTEKH-network wholesalers.
- `inventory/WholesalerCataloguePage.tsx` -- browse a specific wholesaler's catalogue with tier pricing.
- `inventory/WholesalerCSVUploadPage.tsx` -- SUPER_ADMIN CSV upload for supplier catalogues.
- `knowledge/CertificateVerifyPage.tsx` -- public page to verify a CPD completion certificate by code.
- `knowledge/UnsubscribePage.tsx` -- email unsubscribe landing page (public, no auth).
- `settings/DataReviewPage.tsx` -- review queue UI for imported catalogue entries.
- `settings/FeaturesPage.tsx` -- per-pharmacy feature opt-in/opt-out controls.
- `settings/SourceUpdatesPage.tsx` -- SUPER_ADMIN: source sync history and manual trigger.
- `deferred/` -- pages shown for features not yet available: `NhifClaimsPage`, `PatientRecordsPage`, `ControlledSubstancesPage`, `PrescriptionManagementPage`, `AccreditedCpdPage`, `PharmacovigilancePage`, `SymptomCheckerPage`. All render a `DeferredFeaturePage` placeholder explaining why the feature is not yet live.
- Wrapped in `<Suspense fallback={<Spinner />}>` for smooth progressive rendering
- Reduces main bundle size; components load on-demand when dispensing flow needs them

**Patient Safety severity indicators:**
- Severity categories: HIGH/MAJOR/SEVERE, MODERATE/MEDIUM, INFORMATIONAL
- UI: High-severity alerts show as full alert strips (border + background); moderate shows as dots or condensed rows; informational as text only
- `severitySummary` object tracks counts: { high, moderate, informational }
- Colors: high = red/danger, moderate = amber/warning, informational = blue/info
- Overrides at ANY severity are acknowledge-and-proceed, logged against the
  dispenser's account — **no PIC PIN gate** (see "Override model" in the Tier
  feature matrix; `patient-safety.router.ts` had `requirePicPin` removed for this
  reason). The `pic-pin.ts` middleware still exists: a PIN may be supplied
  *voluntarily* on dispensing requests (rate-limited when present) and is used for
  other flows (e.g. admin PIN reset), but it must never be required to clear a
  safety alert.

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

- `P2pOrder` / `P2pOrderItem` (schema.prisma) are a preserved-but-unbuilt
  artifact: applied directly to the database in May 2026, never committed to
  git, discovered and adopted into version control 2026-08-16. Zero rows,
  zero code references anywhere in the app. Likely early scaffolding toward
  the Phase 2 "Stock Exchange" module, but structurally enables
  peer-to-peer retail-to-retail trading, which conflicts with the closed
  B2B network policy below (Tanzanian law restricts open pharmacy
  marketplaces). Do not build retail-facing features on this schema without
  resolving that policy question first — it was adopted for documentation
  hygiene, not as a green light.
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
- **Payment gateway is LIVE: AzamPay** (`backend/src/modules/azampay/`).
  Self-service subscription checkout: owner enters phone → MNO STK push
  (provider auto-detected from prefix: M-Pesa/Tigo Pesa/Airtel Money/Halopesa/
  TTCL/Azampesa) → AzamPay callback hits `POST /api/v1/azampay/callback` →
  `activateSubscriptionFromPayment` flips the subscription ACTIVE and notifies
  the owner in-app. Requires `AZAMPAY_APP_NAME`, `AZAMPAY_CLIENT_ID`,
  `AZAMPAY_CLIENT_SECRET`, `AZAMPAY_ENVIRONMENT` (sandbox|production).
  The manual admin payments endpoint (`POST /admin/pharmacies/:id/payments`)
  remains as the founder-side fallback for bank transfers and edge cases —
  the paywall's manual submission form was removed. Do not reintroduce
  manual-first payment flows.
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
  wholesale pharmacies registered on APOTEKH (Tier 1) or via the tokenized
  Supplier Portal (Tier 2). There is no open marketplace, no public catalogue
  browsing without auth, and no peer-to-peer retail-to-retail trading —
  Tanzanian law restricts open pharmacy marketplaces, and the open B2B
  marketplace is gated behind Phase 2 (50 paying pharmacies).

- SUPER_ADMIN login now routes to `/superadmin` (the dark admin shell), NOT `/founder`. The `/founder` route redirects to `/superadmin/founder`. Do not revert this. The FounderDashboardPage (payment queue, registrations, overrides) is accessible at `/superadmin/founder` inside the AdminShell. The AdminShell sidebar includes "Founder Hub" as the second nav item.
- When SUPER_ADMIN is in the pharmacy layout (e.g. directly navigating to `/dashboard`), the `Sidebar` component renders a dark `FounderSidebarContent` that shows "Platform Admin" identity and a direct link back to `/superadmin`. No pharmacy nav items are shown to SUPER_ADMIN in the pharmacy sidebar.
- The three-tier wholesaler model: Tier 1 (APOTEKH subscriber, in-app), Tier 2 (tokenized supplier portal, no account), Tier 3 (API/ERP, Phase 2). The portal is already built for Tier 2. Do not conflate Tier 1 and Tier 2 flows.
- `Notification` model is the in-app notification inbox (`type`, `title`, `body`, `metadata`, `isRead`). `AlertLog` is the outbound notification delivery log (`alertType`, `channel`, `referenceId`, `referenceType`, `status`). Never use `AlertLog` for in-app notifications.
