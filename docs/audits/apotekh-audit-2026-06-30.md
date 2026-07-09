# APOTEKH System Audit Report
**Date:** 2026-06-30
**Auditor:** APOTEKH System Audit Skill v1.0
**Scope:** Full — all 8 dimensions
**Codebase:** `e:\CODE\pharmaconnect`

---

## Stack Summary

APOTEKH is a TypeScript monorepo with three packages: a Node.js/Express REST API (`backend/`), a React 18 SPA (`frontend/`), and a Next.js marketing website (`website/`). The database is PostgreSQL accessed exclusively through Prisma ORM (v5.13) with a clean migration history. Authentication uses JWT (HS256/RS256 configurable, 15-minute access tokens, 7-day refresh tokens) with bcrypt-12 password hashing. The frontend is offline-first: a Workbox service worker provides stale-while-revalidate caching, an IndexedDB write queue handles mutations during offline periods, and a Zustand connectivity store drives the UI. There is no payment gateway integration yet — subscription collection uses AzamPay for in-app mobile money push, and dispensing records payment method (CASH, MPESA, TIGOPESA, AIRTEL_MONEY, HALOPESA) with reference numbers. Test coverage exists (`vitest` integration tests on backend, `@testing-library/react` on frontend) but is limited in scope.

---

## Overall Readiness Score

| Dimension | Score | Status |
|-----------|-------|--------|
| 1. Technical Health | 4/5 | ⭐⭐⭐⭐☆ |
| 2. Product Completeness | 4/5 | ⭐⭐⭐⭐☆ |
| 3. Retail Features | 5/5 | ⭐⭐⭐⭐⭐ |
| 4. Wholesale Features | 5/5 | ⭐⭐⭐⭐⭐ |
| 5. Retail-Wholesale Linking | 3/5 | ⭐⭐⭐☆☆ |
| 6. East Africa Readiness | 3/5 | ⭐⭐⭐☆☆ |
| 7. Security & Compliance | 4/5 | ⭐⭐⭐⭐☆ |
| 8. GTM Readiness | 3/5 | ⭐⭐⭐☆☆ |
| **TOTAL** | **31/40** | |

**Overall Rating:** 3.9 / 5 ⭐⭐⭐⭐☆
**Verdict:** Core pharmacy OS is production-quality and retail-complete; targeted gaps in retail-wholesale linking, Swahili localisation, and customer support tooling must close before scaling beyond pilot.

---

## Dimension Reports

### 1. Technical Health [4/5]

**What's working:**
- Clean monorepo structure with clear `backend/modules/`, `frontend/modules/` separation
- `backend/.env.example` present with all required variables documented, including JWT key format guidance
- `errorHandler.ts` middleware handles Zod validation errors, Prisma constraint errors, and production vs dev stack trace exposure correctly
- Structured logging with tagged prefixes: `[startup]`, `[cors.blockedOrigin]`, `[http.timing]`, `[auth.login.slow]`, Morgan HTTP request logging, slow request threshold configurable via `SLOW_REQUEST_LOG_MS`
- `backend/src/index.ts` has exemplary structure: env validation, security stack, rate limiters, health/readiness endpoints, graceful uncaughtException/unhandledRejection handlers, cron job registration
- Dependencies are current (React 18.3, Vite 5.2, Prisma 5.13, Express 4.19)
- `CLAUDE.md` is exceptionally detailed — best-in-class project documentation

**Gaps:**
- **MEDIUM** No `README.md` at repository root — `backend/.env.example` — Fix: Add a 1-page README pointing developers to CLAUDE.md and listing the three start commands
- **MEDIUM** Test coverage is shallow — integration tests exist (`vitest`) but cover only specific flows; no auth middleware tests found — Fix: Add tests for JWT expiry, role enforcement, and rate limiting before paid customers
- **LOW** `backend/.env` has `AUTH_SECRET="pharmaconnect-local-demo-secret"` — acceptable for local dev but the name is legacy (should match project rebrand) — Fix: Rename to `JWT_SECRET_DEV` and document clearly in .env.example

---

### 2. Product Completeness [4/5]

**What's working:**
- ✅ Auth: full login/logout/refresh/password-reset flow (`auth.router.ts`, `auth.service.ts`)
- ✅ Roles: 8-role RBAC (SUPER_ADMIN, OWNER, PHARMACIST_IN_CHARGE, DISPENSER, CASHIER, WHOLESALE_MANAGER, WHOLESALE_COUNTER_STAFF, DELIVERY_STAFF) with granular permission middleware
- ✅ Inventory: comprehensive product/batch/stock-movement management (`inventory.service.ts`, 88 KB)
- ✅ Low-stock alerts: threshold-based via `reorderLevel` field, background job, `AlertLog` delivery tracking
- ✅ Expiry tracking: 8-threshold alert system (90/60/30/21/14/7/3/1 days), FEFO enforcement, expiry urgency formula (EXPIRED → MONITOR)
- ✅ Sales/POS: full dispensing event model with items, payment, session tracking
- ✅ Sales history & reporting: `reports.service.ts` (40 KB) with CSV/PDF export on revenue, stock movement, dispensing, voids, expiry, payment breakdown
- ✅ Purchase orders: `StockOrder` model, full status lifecycle, export service
- ✅ Supplier management: `Supplier` model, `SupplierCatalogue`, supplier portal (tokenized)
- ✅ Financial summary: revenue, cost, margin analytics per tier
- ✅ Prescription recording: `Prescription` model with photo upload, dispensingEventId link
- ✅ Drug search: real-time search by generic name, brand, therapeutic category; barcode lookup
- ✅ Data export: CSV and PDF on all major reports (`streamCsv()`, `renderReportPdf()`)
- ✅ Multi-user: `userLimit` per pharmacy, concurrent JWT sessions, pharmacy membership model

**Gaps:**
- **LOW** (by design) No persistent patient records — session-based only. Correct for Phase 1 regulatory and privacy reasons. No action needed until Phase 3 Patient App.
- **MEDIUM** `userLimit` field exists in schema but no enforcement found in auth middleware — a pharmacy on the ADDO tier (3-user limit) could theoretically add unlimited users — Fix: Add membership count check in `POST /settings/users/invite`

---

### 3. Retail Pharmacy Features [5/5]

**What's working:**
- ✅ Walk-in customer flow: "Use walk-in" button resets patient profile to anonymous session
- ✅ OTC sale recording: `DrugClass` enum (OTC, PRESCRIPTION, CONTROLLED, NARCOTIC), no prescription gate on OTC
- ✅ Prescription vs OTC differentiation: handled at product level and dispensing event
- ✅ Cash sale: CASH always available, no reference required
- ✅ Mobile money payment recording: MPESA, TIGOPESA, AIRTEL_MONEY, HALOPESA all supported with reference field (`dispensing.router.ts:19`)
- ✅ Receipt generation: itemised receipt via `receiptPdf.ts`, share functionality in UI
- ✅ Daily sales summary: `DailyClose.tsx`, `/api/v1/dispensing/daily-close` with cash reconciliation, variance alerts at Tsh 5,000
- ✅ Stock reorder alerts linked to supplier: `lastSupplierId` on Product, `supplierId` on StockOrderItem, `SupplierCatalogue` caching
- ✅ TZS pricing: `Tsh ${Number(value).toLocaleString('en-TZ', { maximumFractionDigits: 0 })}` — whole numbers, correct
- ✅ Barcode lookup: `ProductBarcodeMapping` model, lazy-loaded `BarcodeScanner` component, network barcode sharing
- ✅ Return/refund recording: `reverseDispensingEvent()`, `DispensingReturnsPage`, stock auto-restoration via RETURNED movement type

**Gaps:** None. All 11 retail features are present and functional.

---

### 4. Wholesale Pharmacy Features [5/5]

**What's working:**
- ✅ B2B customer management: wholesale catalogues per seller pharmacy, buyer pharmacies managed via platform
- ✅ Bulk order management: full order lifecycle (DRAFT→SUBMITTED→CONFIRMED→PACKED→DISPATCHED→DELIVERED→COMPLETED) with min/max quantity constraints
- ✅ Tiered pricing: `tier_prices` JSONB on catalogue items, supports ADDO/ESSENTIAL/STANDARD/PREMIUM/WHOLESALE/ENTERPRISE tier overrides (`b2b.service.ts:90–122`)
- ✅ Credit/invoice system: `client_credit_limits` table, VAT invoices via `vat_invoices` with EFDMS integration, `generateVatInvoice()` (`b2b.service.ts:272–400`)
- ✅ Outstanding payment tracking: `listReceivablesAging()` with aging buckets (current, 31–60, 61–90, 90+ days) (`b2b.service.ts:1060–1126`)
- ✅ Delivery note generation: `delivery_manifests` table, `createDeliveryManifest()`, `departDeliveryManifest()`, `completeDeliveryManifest()` (`b2b.extensions.service.ts:822–1027`)
- ✅ Bulk stock intake from manufacturer: `supplier_orders` table with DRAFT→SENT→PARTIAL→RECEIVED→CANCELLED status flow
- ✅ Batch/lot tracking: `Batch` model with `batchNumber`, `expiryDate`, `quantityRemaining`; FEFO enforced
- ✅ Wholesale reporting: `getDemandInsights()` (30-day vs 60-day), `listReceivablesAging()`, `listWholesalePayments()`
- ✅ Purchase order to supplier: `createSupplierOrder()`, `updateSupplierOrderStatus()` (`b2b.extensions.service.ts:632–819`)
- ✅ Minimum order quantity: `min_order_quantity` validated in checkout (`b2b.service.ts:669–674`)
- ✅ Wholesale vs retail pricing separation: `wholesaleSellingPrice` separate from retail price; `wholesale_catalogue_pricing` table isolated
- ✅ Bonus — Wholesale schemes: `wholesale_schemes` table with FREE_GOODS/PERCENTAGE_DISCOUNT/FIXED_DISCOUNT types, `resolveSchemeDiscounts()`, `scheme_savings_tzs` tracked on orders
- ✅ Bonus — Returns/RMA: `wholesale_returns` with credit note auto-generation, reason codes (`b2b.extensions.service.ts:459–602`)

**Gaps:** None. Exceeds the 12-feature checklist with promotions and returns already implemented.

---

### 5. Retail-Wholesale Linking [3/5]

Raw check score: 21.5 / 30 (72%)

**What's working:**
- ✅ Order flow: retail places order to any wholesale pharmacy on the platform (`POST /b2b/orders`)
- ✅ Wholesale sees incoming orders: `listOrders()` filters by `seller_pharmacy_id`
- ✅ Order confirmation/rejection: SUBMITTED → CONFIRMED or CANCELLED with reason
- ✅ Retail notification: `sendOrderStatusNotification()` sends email on status change
- ✅ Full order status tracking: DRAFT → SUBMITTED → CONFIRMED → PACKED → DISPATCHED → DELIVERED → COMPLETED
- ✅ Partial fulfillment: delivery manifests track per-item dispatch quantities
- ✅ Dispatch recording: `departDeliveryManifest()` logs date, quantities, driver
- ✅ Delivery notes: generated on dispatch
- ✅ Receipt confirmation: `confirmDelivery()` marks DELIVERED; auto-creates Batch records (stock update on receipt)
- ✅ Invoice generation: `generateVatInvoice()` on order completion
- ✅ Payment recording: `recordWholesalePayment()`, full payment history
- ✅ Outstanding balance: `listReceivablesAging()` with aging and per-buyer totals
- ✅ Credit terms per partner: `client_credit_limits` stores net-days, credit limit, block flag
- ✅ Retail order isolation: queries filter by `buyer_pharmacy_id` — Pharmacy A cannot see Pharmacy B's orders
- ✅ Price privacy: client price overrides are per wholesale-retail pair
- ✅ Wholesale demand insights: top buyers, revenue by partner

**Gaps:**
- **HIGH** No formal link establishment flow — retail can order from any wholesale without a mutual agreement. No link request, approval, or rejection. The network is open by identity, not closed by relationship — `b2b.service.ts` — Fix: Add `pharmacy_links` table, `POST /b2b/links/request`, `PATCH /b2b/links/:id/approve` endpoints; gate `POST /b2b/orders` on an active link
- **HIGH** No link dissolution — no way for either party to formally end a trading relationship — Fix: Add `DELETE /b2b/links/:id` endpoint
- **MEDIUM** Discrepancy recording is binary (disputed flag only) — no structured dispute record with item-level quantities — `b2b.extensions.service.ts` — Fix: Add `wholesale_disputes` table with line-item discrepancy tracking
- **MEDIUM** Retail purchase history has no dedicated aggregated endpoint — orders are visible but not rolled up per supplier — Fix: Add `GET /b2b/orders/history-by-supplier` endpoint
- **LOW** Stock sourcing report missing — no way for retail to see what % of stock came from which wholesale partner — Fix: Join StockMovement with StockOrderItem supplier attribution

---

### 6. East Africa / Tanzania Readiness [3/5]

EA check score: 23 / 36 (64%)

**What's working:**
- ✅ TZS whole-number display throughout (dispensing, receipts, analytics, subscription billing)
- ✅ No USD hardcoding found
- ✅ Pricing tiers correctly implemented: ADDO 15k, BASIC/ESSENTIAL 39k, STANDARD 55k, PREMIUM 75k, WHOLESALE 100k (`subscription-payments.service.ts:4–22`)
- ✅ AzamPay STK push fully integrated for subscription collection, sandbox + production, callback webhook live
- ✅ M-Pesa, Tigo Pesa, Airtel Money, Halo Pesa — all recordable as payment methods in dispensing
- ✅ Manual payment recording: `paymentRef` field on checkout, reference stored per transaction
- ✅ Payment confirmation: AzamPay callback at `/api/v1/azampay/callback`
- ✅ Subscription via mobile money: `buildSubscriptionCheckoutUrl()` templates mobile money payment link
- ✅ Number formatting: `toLocaleString()` throughout for comma-separated TZS amounts
- ✅ Offline mode: Workbox service worker with NetworkFirst/StaleWhileRevalidate strategies, IndexedDB write queue, 7-day TTL
- ✅ Graceful degradation: offline sync queue, background sync on reconnect, `connectivityStore` drives UI
- ✅ PWA manifest: `/frontend/public/manifest.json`, standalone display, theme #1A6B5C, icon set
- ✅ Mobile-first: Tailwind responsive grid, standard breakpoints, touch targets reasonable
- ✅ Bundle optimisation: Vite code-splitting, VitePWA injectManifest, lazy loading throughout
- ✅ Controlled substance tracking: full controlled register page, `DrugClass.CONTROLLED/NARCOTIC`, auditable log
- ✅ Prescription record keeping: `Prescription` model with photo path, dispensingEventId
- ✅ Pharmacy licence number: `licenceNumber` field in pharmacy profile, required on registration
- ✅ Data privacy: `requirePermission()` middleware, role-based access control on all patient-adjacent routes
- ✅ Email notifications: Resend integration, `noreply@apotekh.co.tz`, welcome/verification/reset emails
- ✅ In-app notifications: `notifications.router.ts`, unread count, read-all, metadata
- ✅ Website live: apotekh.co.tz with Next.js, home/about/pricing/contact/investors pages
- ✅ Waitlist/pre-registration: `POST /api/waitlist`, Google Sheets capture (`website/src/app/api/waitlist/route.ts`)

**Gaps:**
- **HIGH** No Swahili UI — English-only. No i18n system, no language toggle, no Swahili string files — Fix: Add `react-i18next`, extract all UI strings to `en.json`, create `sw.json` Swahili translation starting with navigation and error messages
- **HIGH** No SMS fallback — `NotificationChannel.SMS` exists in schema but no SMS provider integrated. Upcountry pharmacies (Singida, Ikungi) may not receive email — Fix: Integrate Africa's Talking SMS gateway for low-stock, expiry, and order alerts
- **HIGH** No WhatsApp notification integration — `NotificationChannel.WHATSAPP` in schema but no implementation. WhatsApp is the primary business communication tool in Tanzania — Fix: Integrate WhatsApp Business API or a Twilio/Vonage bridge for order status and alert notifications
- **HIGH** Expiry date blocking at dispensing is UI-only — the dispensing screen shows `EXPIRED` status on the cart item but `POST /dispensing/checkout` does not validate server-side whether any item's batch is expired — `dispensing.router.ts` — Fix: Add server-side check: if any cart item's FEFO batch has `expiryDate < today`, reject checkout with `EXPIRED_BATCH` error
- **MEDIUM** No VAT (18%) field in billing — Tanzania charges 18% VAT on medicine sales. No VAT field in dispensing checkout or financial reports — Fix: Add optional `vatPercent` field on Pharmacy settings; apply to receipt totals and revenue reports
- **MEDIUM** Date format not enforced — browser default locale used; Tanzania uses DD/MM/YYYY — Fix: Set `{ locale: 'sw-TZ' }` in date formatting utility or create a `formatDate()` helper that enforces DD/MM/YYYY
- **LOW** Tanzania/East Africa common drug names not mapped — catalogue uses international names (Paracetamol is fine; Acetaminophen would not be) — current state is acceptable but a Swahili/local-name alias layer would help upcountry staff
- **LOW** No multi-currency architecture for EA expansion (KES/UGX) — acceptable for Tanzania Phase 1 but payment layer will need abstraction before Kenya launch

---

### 7. Security & Compliance [4/5]

**What's working:**
- ✅ Passwords: bcrypt with 12 salt rounds (`auth.service.ts:312`); `bcrypt.compare()` on login; password excluded from all API responses
- ✅ JWT: HS256/RS256 configurable via env; PEM format validated on startup; 15-minute access token, 7-day refresh token; explicit startup warning if config insufficient (`jwt.ts:60–69`)
- ✅ CORS: dynamic origin allowlist; wildcard never used; unknown origins blocked with `[cors.blockedOrigin]` log (`index.ts:72–105`)
- ✅ Rate limiting: general API (600/15 min), auth-specific (20/15 min) via `express-rate-limit`
- ✅ SQL injection: Prisma ORM parameterises all standard queries; `$queryRaw` calls use `Prisma.sql` template literals throughout (46+ instances audited)
- ✅ Input validation: Zod schemas on every router before service layer; 187+ `z.object()` instances across backend
- ✅ Helmet: security headers set on all responses
- ✅ Audit logging: `audit_log` table (pharmacy_id, table_name, record_id, action, acted_by, new_data, old_data); admin actions logged to `admin_audit_log`; login events recorded
- ✅ .gitignore: `.env` and all variants excluded; `.env.example` correctly committed
- ✅ Auth middleware: bearer token extraction, JWT verification with algorithm check, auth context TTL cache, user active status check, role normalisation, pharmacy membership validation (`auth.ts`)
- ✅ File access control: `/uploads/*` route validates ownership before serving (`index.ts:200–223`)
- ✅ Override log: `override_log` table for clinical override accountability (per CLAUDE.md, has DB-level delete trigger)

**Gaps:**
- **CRITICAL** SQL injection risk in `backend/src/modules/admin/admin.router.ts:573–576` — `PATCH /knowledge/bulletins/:id` uses `$queryRawUnsafe()` with manual string concatenation and `replace(/'/g, "''")` escape instead of `Prisma.sql` template literals — Fix: Replace with `Prisma.sql\`UPDATE ... SET "title" = ${body.title}\`` (30-minute fix)
- **MEDIUM** No CSRF protection on state-changing routes — XSS + CSRF combination could allow forged requests from a compromised frontend — Fix: Add `csurf` middleware or double-submit cookie pattern for non-API clients
- **MEDIUM** No documented data backup strategy — Railway provides automated backups but this is not documented in `docs/` — Fix: Add a "Backup & Recovery" section to `docs/deployment-runbook.md`
- **LOW** `npm audit` not part of CI/CD pipeline — Fix: Add `npm audit --audit-level=high` to pre-deploy check script

---

### 8. GTM Readiness [3/5]

**What's working:**
- ✅ Self-registration: `RegisterPage.tsx` collects pharmacy details, user info, pharmacyType; routes to email verification
- ✅ Demo/seed data: `Amani Pharmacy` demo seeded; `db:seed` script available
- ✅ User manual: `/docs/user-manual.md` (70 KB), `/docs/APOTEKH User Manual.pdf` — comprehensive
- ✅ Subscription tiers: all 6 tiers implemented with correct TZS pricing (`subscription-payments.service.ts:4–22`)
- ✅ Payment collection live: AzamPay STK push for subscription activation
- ✅ Trial period: 14-day trial (`TRIAL_DAYS = 14` in `auth.service.ts:15`), `trialStartsAt`/`trialEndsAt` on Pharmacy
- ✅ Subscription expiry enforcement: grace mode (30-day window) → hard lock; `trial.ts` middleware active; core routes preserved during grace
- ✅ Human-readable error messages: `RegisterPage.tsx` error display; API errors surfaced to UI with context
- ✅ Website live: apotekh.co.tz with home/about/pricing/contact pages
- ✅ Pre-registration: waitlist form live with Google Sheets capture

**Gaps:**
- **HIGH** No in-app WhatsApp support channel — no support link, no help button, no escape hatch for a stuck pharmacy user — Fix: Add a floating "Help" button linking to `wa.me/{support_number}` — 2-hour fix with outsized support impact
- **HIGH** No subscription-specific invoice — pharmacies paying monthly need a receipt they can show for accounting purposes. Dispensing receipts exist but no invoice model for subscription payments — Fix: Add `SubscriptionInvoice` model, generate PDF on payment confirmation, email to owner
- **MEDIUM** No onboarding wizard — new pharmacy lands on the dashboard cold with no guided setup steps. First product, first sale, first staff member — none are guided — Fix: Add a dismissible `OnboardingChecklist` component (5–7 steps) that appears until all steps are complete
- **MEDIUM** No in-app FAQ or help section — Fix: Add a `HelpPage` at `/help` with top 10 questions (dispensing, stock, payments, billing)
- **MEDIUM** Demo environment access: `VITE_SHOW_DEMO_ACCOUNTS` flag partially implemented but demo login flow not clearly separated from production — Fix: Ensure demo mode is clearly labelled and inaccessible in production
- **LOW** No social media activity verification found — website links to `support@apotekh.co.tz` but no active social accounts confirmed — Fix: Create and link active WhatsApp Business profile as primary social/support channel for EA context

---

## Retail-Wholesale Linking [3/5]

*Detailed findings in Dimension 5 above.*

**Score breakdown:**
| Section | Passed | Total |
|---------|--------|-------|
| A. Link Establishment | 0.5 | 5 |
| B. Order Flow | 7 | 7 |
| C. Delivery & Receipt | 4 | 5 |
| D. Financial Reconciliation | 5 | 5 |
| E. Data Privacy | 3 | 4 |
| F. Reporting | 2 | 4 |
| **Total** | **21.5** | **30** |

The order flow, delivery pipeline, and financial reconciliation are operational and impressive for this stage. The gap is structural: there is no formal link between a specific retail pharmacy and a specific wholesale pharmacy. Any retail pharmacy can currently order from any wholesale pharmacy on the platform with no mutual agreement. This is acceptable for a closed pilot where you control both sides, but will need addressing before the network scales to untrusted parties.

---

## East Africa Readiness [3/5]

*Detailed findings in Dimension 6 above.*

**Score breakdown:**
| Section | Passed | Total |
|---------|--------|-------|
| Currency & Pricing | 3 | 4 |
| Mobile Money | 7 | 7 |
| Language & Localisation | 1.5 | 5 |
| Connectivity & Device | 5 | 6 |
| Regulatory & Compliance | 3.5 | 6 |
| Communication | 2 | 4 |
| EA Expansion Readiness | 1 | 4 |
| **Total** | **23** | **36** |

No critical EA failures triggered (mobile money is live, TZS is correct, app is mobile-functional). Score is held at 3/5 by the absence of Swahili, SMS, WhatsApp alerts, and VAT handling.

---

## Prioritised Fix List

### 🔴 Critical (fix before first paid customer)

1. **SQL injection in admin router** — `backend/src/modules/admin/admin.router.ts:573–576` — 30 minutes
2. **Server-side expiry block at dispensing checkout** — `backend/src/modules/dispensing/dispensing.router.ts` — 2 hours

---

### 🟠 High (fix within 30 days)

1. **In-app WhatsApp support link** — `frontend/src/components/layout/Layout.tsx` or floating button — 2 hours
2. **Subscription invoice generation** — new `SubscriptionInvoice` model + PDF + email on payment — 1 day
3. **Server-side user limit enforcement** — `POST /settings/users/invite` in settings router — 2 hours
4. **Formal retail-wholesale link establishment flow** — `pharmacy_links` table, request/approve endpoints, gate orders on active link — 2–3 days
5. **VAT (18%) field** — optional on Pharmacy settings, applied to receipt totals — 4 hours
6. **SMS integration (Africa's Talking)** — low-stock and expiry alert fallback for upcountry pharmacies — 1 day

---

### 🟡 Medium (fix within 90 days)

1. **Swahili UI Phase 1** — integrate `react-i18next`, extract navigation/error strings to `sw.json` — 3–5 days
2. **WhatsApp Business API for alerts** — order status, low stock, expiry alerts via WhatsApp — 2 days
3. **Onboarding checklist widget** — dismissible 5-step checklist for new pharmacies — 1 day
4. **In-app FAQ/Help page** — `/help` with top 10 questions — 4 hours
5. **Date format enforcement (DD/MM/YYYY)** — `formatDate()` utility with `sw-TZ` locale — 2 hours
6. **Formal link dissolution endpoint** — `DELETE /b2b/links/:id` — 2 hours
7. **Retail purchase history by supplier** — aggregated endpoint — 4 hours
8. **Discrepancy dispute records** — `wholesale_disputes` table, line-item tracking — 1 day
9. **Data backup documentation** — add to `docs/deployment-runbook.md` — 1 hour
10. **npm audit in CI/CD** — add to `pre-deploy-check.ps1` — 30 minutes

---

### 🟢 Low (backlog)

1. Multi-currency architecture (KES/UGX) — needed before Kenya launch — 3–5 days
2. Configurable regulatory fields per country (TFDA/PPB/NDA) — needed for EA expansion — 2 days
3. TFDA dispensing log export (formal TFDA inspection report) — 1 day
4. Root `README.md` — 1 hour
5. Stock sourcing report (retail: % stock from each wholesale supplier) — 4 hours
6. Device testing documentation (Android low-end test notes in README) — 1 hour
7. CSRF middleware — `csurf` or double-submit cookie — 4 hours

---

## Quick Wins (< 1 day each, high impact)

| Fix | File | Time |
|-----|------|------|
| Fix `$queryRawUnsafe` SQL injection | `admin.router.ts:573–576` | 30 min |
| Add WhatsApp support floating button | `Layout.tsx` | 1 hour |
| Enforce DD/MM/YYYY date format | New `formatDate()` utility | 2 hours |
| Add 18% VAT optional field to checkout | `dispensing.router.ts` schema | 2 hours |
| Server-side expiry block at checkout | `dispensing.router.ts` checkout handler | 2 hours |
| User limit check on invite endpoint | `settings.router.ts` | 2 hours |
| Root `README.md` | repo root | 1 hour |
| Add `npm audit` to pre-deploy script | `scripts/pre-deploy-check.ps1` | 30 min |

---

## Next Audit Trigger

Re-run this audit when:
1. **Swahili i18n Phase 1** is complete (language section will jump from 1.5/5 to 4/5)
2. **Before onboarding pharmacy #10** (paying customers) — especially verify the subscription invoice, user limit enforcement, and expiry blocking are live
3. **Before opening wholesale network beyond pilot** — formal retail-wholesale link flow must be in place before untrusted parties can trade on the platform
