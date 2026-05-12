# CODEX_TASKS.md — PharmaConnect System
# Development task registry · Read this before touching any code
# Derived from: Improvement X (April 2026)
# Last updated: April 2026

---

## How to use this file

You are Claude Code working on PharmaConnect System.
This file is your single source of truth for what needs to be built,
in what order, and to what standard.

Before writing any code:
1. Read this entire file
2. Run the audit task (Task 0) and update AUDIT.md
3. Report your audit findings before proceeding
4. Work through tasks in the order listed — do not skip ahead
5. Mark each task [DONE] when its acceptance criteria all pass
6. Never mark a task done based on code existing — only on
   acceptance criteria passing in the deployed environment

When you are unsure about a product decision (pricing, tier
assignment, ethical rule), check CLAUDE.md first. If CLAUDE.md
does not answer it, stop and ask before proceeding.

---

## Project stack (already deployed — do not change without instruction)

Frontend:   Vercel (React SPA, Vite, TypeScript, Tailwind CSS)
Backend:    Railway (Node.js, Express, TypeScript, Prisma)
Database:   Railway PostgreSQL (primary) / Supabase (alternative)
SMS/WA:     Africa's Talking
Email:      Resend
Icons:      Lucide React only
Fonts:      DM Serif Display + DM Sans + JetBrains Mono (Google Fonts)

---

## Non-negotiable rules (enforce on every task)

RULE-01  Patient safety features (drug interaction checker,
         dose calculator, contraindication alerts, NCD hints,
         diagnosis-drug matching, dosage suggestions) must be
         available identically in STANDARD, PREMIUM, and ENTERPRISE.
         They are never gated behind a higher tier.
         ADDO and WHOLESALE do not include them — that is correct.

RULE-02  The override_log table must have a database-level trigger
         that prevents DELETE from any role including superadmin.
         This is a permanent medical record.

RULE-03  No patient data is stored across sessions. Module C
         (Patient Safety) is entirely session-based. No patient
         table exists. No patient UUID is created. If you find
         yourself creating a patients table, stop.

RULE-04  The B2B ordering network is closed. Retail pharmacies
         can only order from wholesale pharmacies registered on
         PharmaConnect. Enforce at the API level on every order
         creation route.

RULE-05  Sponsored content SPONSORED badge must be in
         server-rendered HTML, not added by JavaScript.
         It cannot be removed by any CSS class toggle.

RULE-06  The following features are deferred and must NOT be
         built. Render a placeholder page only:
           - NHIF Claims Module
           - Prescription Management
           - Clinical OTC Symptom Tool
           - Persistent Patient Data Storage
           - PC-Accredited CPD
           - Controlled Substances TMDA Reporting

RULE-07  Pricing, tier names, and user limits are fixed as:
           ADDO:        TZS 20,000/month - 3 users - 1 outlet
           ESSENTIAL:   TZS 35,000/month - 4 users - 1 outlet
           STANDARD:    TZS 55,000/month - 7 users - up to 3 outlets
           PREMIUM:     TZS 75,000/month - 12 users - up to 5 outlets
           WHOLESALE:   TZS 100,000/month - 10+ users - 1 wholesale outlet
           ENTERPRISE:  Custom - unlimited users and outlets
           Annual billing: 10x monthly (2 months free)
         Do not change these values anywhere in the codebase
         without explicit instruction.

---

## User roles — complete list including wholesale staff

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
  - View orders assigned for picking (their queue)
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

---

## Deferred features — placeholder pages only

For each of the following, create a route that renders a
"Coming soon" page. The page must include:
  - Feature name and one-paragraph description of what it will do
  - The specific external dependency blocking it
  - Current status of that dependency
  - Email capture form saving to: waitlist(id, email, feature, signed_up_at)

| Feature | Dependency | Contact / action |
|---------|-----------|-----------------|
| NHIF Claims Module | NHIF Breeze API accreditation | Email it@nhif.or.tz |
| Prescription Management | PC + TMDA digital framework | Monitor MOH policy |
| Clinical OTC Symptom Tool | PC written position statement | Initiate PC conversation |
| Persistent Patient Data Storage | PDPC registration + MOH MOU | PDPC registration urgent |
| PC-Accredited CPD | Pharmacy Council MOU | Begin PC conversations |
| Controlled Substances TMDA Reporting | TMDA notification | Phase 2 action |

---

## Task registry

Format for each task:
  Status:       [ ] TODO · [~] IN PROGRESS · [x] DONE · [!] BLOCKED
  Priority:     P0 (do first) · P1 (do next) · P2 (do after P1) · P3 (later)
  Depends on:   task IDs that must be done first
  Files:        approximate files to create or modify
  Criteria:     specific, testable acceptance conditions

---

### TASK 0 — PROJECT AUDIT
Status:    [ ] TODO
Priority:  P0 — do before everything else
Depends on: nothing

Description:
  Examine the existing codebase, database schema, Railway routes,
  and Vercel pages. Produce /AUDIT.md listing the status of every
  feature, table, and route in this CODEX.

Output file: /AUDIT.md

AUDIT.md must contain four sections:

  Section 1 — Database tables
  List every table that should exist (from this CODEX) with status:
  EXISTS (matches spec) / PARTIAL (exists but missing columns) /
  MISSING (does not exist)

  Section 2 — API routes
  List every route that should exist with status:
  EXISTS / PARTIAL / MISSING

  Section 3 — Frontend pages
  List every page that should exist with status:
  EXISTS / PARTIAL / MISSING

  Section 4 — Features
  For each feature code (A1–A18, B1–B9, C1–C10, D1–D6,
  E1–E8, F1–F16 + F-H1 to F-H5, G1–G55, M1–M4):
  DONE / PARTIAL (describe what is missing) / MISSING

Stop after producing AUDIT.md. Report the summary counts:
  Tables: X EXISTS · Y PARTIAL · Z MISSING
  Routes: X EXISTS · Y PARTIAL · Z MISSING
  Pages:  X EXISTS · Y PARTIAL · Z MISSING
  Features: X DONE · Y PARTIAL · Z MISSING

Wait for confirmation before proceeding to Task 1.

Criteria:
  [ ] AUDIT.md exists at project root
  [ ] Every item listed in this CODEX is accounted for
  [ ] No assumptions made — if unsure of a table's status,
      query the database directly to check

---

### TASK 1 — DATABASE SCHEMA MIGRATIONS
Status:    [ ] TODO
Priority:  P0
Depends on: Task 0 (audit identifies what is missing)

Description:
  Apply migrations for all tables listed as MISSING or PARTIAL
  in the audit. Do not recreate existing tables — use ALTER TABLE
  for partial tables.

  Run migrations in this order to respect foreign keys:
    1.  pharmacies (add missing columns)
    2.  users (add missing columns including pic_pin_hash)
    3.  products
    4.  suppliers
    5.  batches
    6.  stock_movements
    7.  sync_conflicts
    8.  compliance_items
    9.  compliance_documents
    10. compliance_alerts
    11. staff_credentials
    12. inspection_checklists
    13. drug_database
    14. drug_interactions
    15. drug_contraindications
    16. override_log (add DELETE trigger immediately after creation)
    17. dispensing_events
    18. notifications
    19. notification_preferences
    20. alert_log
    21. articles
    22. bulletins
    23. publications
    24. courses
    25. course_enrolments
    26. cpd_activities
    27. email_subscribers
    28. wholesale_catalogues
    29. wholesale_catalogue_pricing
    30. orders
    31. client_credit_limits
    32. vat_invoices
    33. daily_closings
    34. staff_attendance
    35. predictions
    36. waitlist
    37. audit_log

  Migrations file location: /backend/prisma/migrations/
  Name format: YYYYMMDD_HHMMSS_description.sql

  Critical — add immediately after override_log creation:

    CREATE OR REPLACE FUNCTION prevent_override_log_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'override_log records cannot be deleted';
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER no_delete_override_log
    BEFORE DELETE ON override_log
    FOR EACH ROW EXECUTE FUNCTION prevent_override_log_delete();

  Critical — add to dispensing_events:

    CREATE OR REPLACE FUNCTION prevent_dispensing_core_update()
    RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.items IS DISTINCT FROM NEW.items OR
         OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
         OLD.dispensed_by IS DISTINCT FROM NEW.dispensed_by OR
         OLD.created_at IS DISTINCT FROM NEW.created_at THEN
        RAISE EXCEPTION 'Core dispensing fields are immutable';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER immutable_dispensing_core
    BEFORE UPDATE ON dispensing_events
    FOR EACH ROW EXECUTE FUNCTION prevent_dispensing_core_update();

Criteria:
  [ ] All migrations run without errors
  [ ] override_log DELETE trigger verified: DELETE FROM override_log
      raises exception
  [ ] dispensing_events UPDATE trigger verified: changing items or
      total_amount raises exception
  [ ] Foreign key constraints all resolve correctly
  [ ] AUDIT.md updated: all tables now show EXISTS

---

### TASK 2 — AUTHENTICATION AND RBAC MIDDLEWARE
Status:    [ ] TODO
Priority:  P0
Depends on: Task 1

Description:
  Build or extend the authentication and permission system
  to support all 8 user roles and 5 subscription tiers.

Code tasks:
  1. Add WHOLESALE_COUNTER_STAFF to the role ENUM in users table
     (if not already present)

  2. Create /backend/src/middleware/permissions.ts
     Export a PERMISSIONS object mapping every feature area to
     the roles that can access it. Include wholesale scope:
       wholesale.view_catalogue_read_only: ['WCS']
       wholesale.manage_catalogue: ['OWNER','WM']
       wholesale.pick_order: ['WCS','WM']
       wholesale.confirm_delivery: ['WCS','WM','DELIVERY_STAFF']
       wholesale.set_credit_limits: ['OWNER','WM']
       wholesale.view_financial_reports: ['OWNER','WM']
     WCS = WHOLESALE_COUNTER_STAFF abbreviation in code only

  3. requireTier(minimumTier) middleware
     Returns 403: { error: "TIER_INSUFFICIENT", current, required,
                    upgradeUrl: "/settings/subscription" }

  4. requireRole(allowedRoles[]) middleware

  5. requireTierAndRole(tier, roles[]) combined middleware

  6. PIC PIN verification middleware for override routes:
     Checks request body for pic_pin, hashes with bcrypt,
     compares against user.pic_pin_hash. Returns 403 if mismatch.

  7. Trial enforcement middleware:
     If pharmacy.trial_active=false AND status='TRIAL':
       Block all routes except /settings/subscription, /auth/*,
       and /api/v1/inventory/products (read-only)
       Return 402: { error: "TRIAL_EXPIRED",
                     subscribeUrl: "/settings/subscription" }

  8. WHOLESALE_COUNTER_STAFF order filter middleware:
     When role=WCS: automatically filter order queries to only
     show orders where assigned_picker=user.id

  9. Hybrid pharmacy middleware:
     When pharmacy.is_hybrid=true, apply both retail and wholesale
     permission sets. Helper: isHybrid(pharmacy) => boolean

Files:
  /backend/src/middleware/auth.ts
  /backend/src/middleware/permissions.ts
  /backend/src/middleware/tier.ts
  /backend/src/middleware/trial.ts
  /backend/src/middleware/pic-pin.ts
  /backend/src/types/roles.ts

Criteria:
  [ ] DATA_ENTRY_CLERK cannot access /api/v1/dispensing — 403
  [ ] WHOLESALE_COUNTER_STAFF cannot access credit limits — 403
  [ ] WHOLESALE_COUNTER_STAFF cannot access financial reports — 403
  [ ] CASHIER cannot apply discount — 403
  [ ] DISPENSER cannot override MAJOR alert without PIN — 403
  [ ] Expired trial blocks all routes except subscription page — 402
  [ ] Hybrid pharmacy OWNER sees both retail and wholesale dashboards

---

### TASK 3 — MODULE A: INVENTORY AND LOGISTICS
Status:    [ ] TODO
Priority:  P1
Depends on: Tasks 1, 2

Description:
  Build or extend all inventory features A1–A18.
  A15 and A16 are ENTERPRISE only.
  A7 (barcode scanning) must work for WHOLESALE_COUNTER_STAFF
  on both incoming stock intake and outgoing order verification.

Code tasks (in order):
  A1–A2:   Product database CRUD + batch management
  A3:      FEFO query — helper function fefoQuery(productId)
           always used, never bypassed
  A7:      Barcode scanning frontend component
           Use ZXing library · continuous mode, no button per scan
  A8:      Stock intake form — linked to barcode + batch creation
  A9–A10:  Adjustments + write-off workflow
  A11:     Supplier CRUD
  A12:     CSV import with per-row validation
  A13:     Cold-chain flag display
  A4–A6:   Expiry and low-stock cron jobs
           Run at 06:00 Africa/Nairobi daily via node-cron
           Deduplication: check alert_log before sending
  A5:      Expiry dashboard frontend page
  A14:     Full product database fields validation
  A17:     Offline-first service worker (Workbox)
           Cache strategy: NetworkFirst for reads,
           BackgroundSync for writes
  A18:     Sync conflict log + UI at /inventory/conflicts
  A15:     Multi-outlet visibility — ENTERPRISE gate
  A16:     Inter-branch transfer — ENTERPRISE gate

  WHOLESALE_COUNTER_STAFF additions:
    POST /api/v1/b2b/orders/:id/verify-items
    Body: { scanned_barcodes: string[] }
    Returns: { matched: [], unmatched: [], shortfall: [] }

Files:
  /backend/src/modules/inventory/
  /frontend/src/modules/inventory/
  /frontend/src/components/BarcodeScanner.tsx
  /frontend/src/hooks/useOfflineSync.ts
  /frontend/public/sw.js
  /backend/src/jobs/expiry-alerts.ts
  /backend/src/jobs/low-stock-alerts.ts

Criteria:
  [ ] FEFO: two batches same product, soonest expiry always first
  [ ] Barcode scan resolves product in < 2 seconds
  [ ] Expiry SMS fires within 1 hour of 06:00 cron
  [ ] No duplicate alert for same item same day
  [ ] Offline intake: completes locally, syncs on reconnect, zero data loss
  [ ] CSV import: 3 invalid rows → errors shown, nothing committed
  [ ] WCS can scan incoming stock but cannot write off expired stock
  [ ] A15 renders "Upgrade to Enterprise" for non-Enterprise pharmacy

---

### TASK 4 — MODULE B: COMPLIANCE TRACKER
Status:    [ ] TODO
Priority:  P1
Depends on: Tasks 1, 2

Description:
  Build all compliance features B1–B9. Available to all tiers.
  WHOLESALE_MANAGER and WHOLESALE_COUNTER_STAFF can view and manage
  WHOLESALE_PERMIT licence type. OWNER sees all licence types.

Code tasks:
  B1–B4:   Compliance items CRUD + alert schedule cron
           Alert schedule: 90/60/30/14/7/3/1 days before expiry
           After expiry: daily until renewed or closed
  B5–B6:   Health score computation (nightly cron)
           Store computed status on compliance_items.status
           Dashboard loads from IndexedDB — offline capable
  B7:      Document upload to Supabase Storage
           Bucket: "compliance-documents" (private)
           Signed URL (1 hour validity) for viewing
  B8:      Staff credentials management
           Alert recipients: PHARMACIST_IN_CHARGE only
  B9:      Inspection checklist PDF
           Pre-seed standard TMDA items in inspection_checklist_templates
           PDF: use pdfkit or Puppeteer
           Store in Supabase Storage

Files:
  /backend/src/modules/compliance/
  /frontend/src/modules/compliance/
  /backend/src/jobs/compliance-alerts.ts

Criteria:
  [ ] Compliance dashboard loads from IndexedDB in < 1 second offline
  [ ] Daily alert fires after expiry until item is renewed
  [ ] No duplicate alert same item same channel same day
  [ ] Document viewable in-app within 10 seconds of upload
  [ ] Inspection PDF generates in < 10 seconds
  [ ] WHOLESALE_PERMIT visible to WM and WCS, not to DISPENSER

---

### TASK 5 — MODULE C: PATIENT SAFETY (SESSION-BASED)
Status:    [ ] TODO
Priority:  P1
Depends on: Tasks 1, 2
Tier gate:  STANDARD, PREMIUM, ENTERPRISE only

Description:
  Build all patient safety features C1–C10.
  This module is entirely session-based — no patient data stored.
  Drug database must be seeded before any C features work.
  ADDO, WHOLESALE, and WCS role have no access.

Code tasks:

  DRUG DATABASE SEED (do first):
    /backend/prisma/seed-drug-database.ts
    Seed all medicines on the Tanzania NEML with:
      generic name, brand names, drug class, therapeutic category,
      standard adult dose, frequency, route, paediatric dose formula,
      elderly dose notes, pregnancy category (A/B/C/D/X/NA),
      breastfeeding safety, elderly/renal/hepatic caution flags
    Seed NCD hints for: antihypertensives, antidiabetics,
      antiepileptics, heart failure, TB, ARVs, antimalarials, asthma
    Seed drug interactions for the 50 most clinically significant
      pairs in Tanzanian pharmacy practice
    Set clinician_reviewed = false on all seeded records
    Only records where clinician_reviewed=true appear in results

  C1–C2:   Interaction check endpoint + override log
           POST /api/v1/patient-safety/check-interactions
           Must complete in < 500ms
           MAJOR/CONTRAINDICATED: set requires_pic_pin: true

  C3–C6:   Contraindication alerts (no data stored — pure computation)
           Pregnancy category D and X trigger alert when pregnant=true
           Allergy class cross-check

  C7:      Dose calculator
           Methods: Clark's, Young's, weight-based
           Show full working on the UI

  C8:      Dosage suggestions — embedded in drug detail response

  C9:      NCD usage hints — collapsible panel on dispensing screen

  C10:     Diagnosis-drug matching
           POST /api/v1/patient-safety/match-diagnosis

  Dispensing screen auto-run on every drug added:
    1. check-interactions (C1)
    2. contraindication check (C3)
    3. dosage suggestions (C8)
    4. NCD hints if applicable (C9)
    All in < 500ms total

Files:
  /backend/src/modules/patient-safety/
  /backend/src/data/drug-database-seed.ts
  /frontend/src/modules/dispensing/PatientSafetyPanel.tsx
  /frontend/src/modules/dispensing/DoseCalculator.tsx
  /frontend/src/modules/dispensing/NCDHints.tsx
  /frontend/src/modules/dispensing/InteractionAlert.tsx

Criteria:
  [ ] Interaction check for 5-drug session in < 500ms
  [ ] CONTRAINDICATED alert blocks dispensing without PIN + reason
  [ ] Wrong PIN returns 403 — override_log NOT created
  [ ] override_log DELETE trigger raises exception
  [ ] Pregnancy Category X triggers alert when pregnant=true
  [ ] Dose calculator shows full working, not just result
  [ ] clinician_reviewed=false drugs do not appear in results
  [ ] ADDO tier gets 403 on all patient safety routes
  [ ] WHOLESALE tier gets 403 on all patient safety routes
  [ ] WCS role gets 403 on all patient safety routes

---

### TASK 6 — MODULE D: DISPENSING WORKFLOW
Status:    [ ] TODO
Priority:  P1
Depends on: Tasks 3, 5
Tier gate:  All retail tiers (ADDO: basic only; STANDARD+: full)

Description:
  Build the dispensing workflow D1–D6.
  ADDO gets basic sale recording — no patient safety panel,
  no discount, no void (PIC only). STANDARD+ gets full screen.

Code tasks:
  D1:   Dispensing screen
        Integrates Module C safety panel automatically
        FEFO batch shown automatically
        Step flow: Add products → Set flags → Safety check →
        Confirm quantities → Payment → Complete

  D2:   POS payment — CASH, MPESA, TIGO_PESA
        Mobile money: record reference number

  D3:   Dispensing records — immutable core fields
        Verified by database trigger from Task 1

  D4:   Audit trail — database trigger writes to audit_log
        on every INSERT, UPDATE, DELETE across key tables

  D5:   Void — PHARMACIST_IN_CHARGE only
        Atomic: update dispensing_event + restore batch.quantity_remaining
        + log reversal movement

  D6:   Discount — PHARMACIST_IN_CHARGE only
        discount_amount + discount_reason both required

  M3:   Daily closing + cash reconciliation
        POST /api/v1/dispensing/daily-close
        Sum all CASH dispensing_events for today
        Discrepancy = actual_cash_counted - expected_cash
        PHARMACIST_IN_CHARGE sign-off required

  M4:   Session-based quick patient search
        Frontend-only — no API call, no data stored
        Clears when session ends or browser refreshes

Files:
  /frontend/src/modules/dispensing/DispensingScreen.tsx
  /frontend/src/modules/dispensing/DailyClose.tsx
  /backend/src/modules/dispensing/

Criteria:
  [ ] Void correctly restores batch.quantity_remaining
  [ ] PUT on dispensing_event.items returns 403
  [ ] CASHIER can complete payment but cannot apply discount
  [ ] ADDO tier: no patient safety panel visible
  [ ] Daily close discrepancy computed with no rounding errors
  [ ] Session search: no network tab activity when entering drugs

---

### TASK 7 — MODULE E: KNOWLEDGE HUB AND CPD
Status:    [ ] TODO
Priority:  P2
Depends on: Tasks 1, 2

Description:
  Build E1–E8.
  ADDO: read-only articles and bulletins.
  STANDARD: adds CPD activity log.
  PREMIUM + ENTERPRISE: adds courses, points tracker, auto-log.
  WHOLESALE: articles and bulletins read-only. No CPD features.

Code tasks:
  E1:   Articles CRUD (admin) + public read
        Full-text search: PostgreSQL tsvector on title + body + tags
        Reading time: ceil(word_count / 200)
        Sponsored cap: max 3 sponsored positions in ORDER BY clause

  E2:   Bulletins — admin uploads, all users read
        Urgent bulletins shown at top with amber indicator

  E3:   Publications — curated library

  E4:   Courses — PREMIUM and ENTERPRISE only
        Assessment: randomise questions per attempt
        Cooling-off: enforced at API (last_attempt_at + 24h)
        Certificate PDF: include QR linking to /verify/:id
        /verify/:id: public, no auth required
        is_pc_accredited: default false
        All certificates include:
        "PharmaConnect Completion Certificate —
         not Pharmacy Council of Tanzania accredited"
        Remove only when is_pc_accredited=true

  E5–E7: CPD log + tracker + auto-log — PREMIUM and ENTERPRISE only
        renewal_year: configurable in pharmacy settings
        Alert at 60 and 14 days before PC renewal deadline

  E8:   Sponsored badge
        Server-rendered in article HTML response
        Present in SSR output — not added by JavaScript
        <span data-sponsored="true" class="sponsored-badge">SPONSORED</span>
        CSS must NOT have a display:none rule that can be toggled

  Email subscribers + weekly digest:
    POST /api/v1/knowledge/subscribe (no auth required)
    Cron: every Monday 07:00 Africa/Nairobi via Resend
    Unsubscribe: one-click via /unsubscribe/:token

Files:
  /backend/src/modules/knowledge/
  /frontend/src/modules/knowledge/
  /frontend/src/modules/cpd/
  /backend/src/jobs/weekly-digest.ts

Criteria:
  [ ] Sponsored badge in server-rendered HTML (check page source)
  [ ] Failed assessment: API returns 429 with retry_after timestamp
  [ ] Certificate /verify/:id returns data without auth
  [ ] WHOLESALE tier user sees articles but no CPD tracker UI
  [ ] ADDO tier user sees articles but no course enrolment UI
  [ ] Weekly digest cron fires at 07:00 Africa/Nairobi Monday

---

### TASK 8 — MODULE F: B2B ORDERING
Status:    [ ] TODO
Priority:  P2
Depends on: Tasks 1, 2, 3
Tier gate:  STANDARD+ (buyer) · WHOLESALE (seller) · ENTERPRISE (both)

Description:
  Build F1–F16 plus hybrid features F-H1 to F-H5.
  Closed network enforcement is the most critical constraint.
  WHOLESALE_COUNTER_STAFF has a specific limited role here.

Code tasks:

  CLOSED NETWORK ENFORCEMENT (do first):
    On every POST /api/v1/b2b/orders, verify:
    seller_pharmacy_id.subscription_tier IN ('WHOLESALE','ENTERPRISE')
    If not: 403 { error: "SELLER_NOT_ON_PLATFORM" }

  F1–F6:   Buyer side — browse catalogue, place order, track status,
            view invoices

  F7–F16:  Seller side — catalogue management, order processing,
            client management, credit limits, delivery scheduling,
            driver assignment, VAT invoice auto-generation

  WHOLESALE_COUNTER_STAFF routes:
    GET  /api/v1/b2b/orders/my-queue
         Returns orders where assigned_picker = current user
    PATCH /api/v1/b2b/orders/:id/pick-items
         Mark line items as picked. WCS role only.
    POST /api/v1/b2b/orders/:id/verify-items
         Barcode scan verification before dispatch. WCS and WM.
    PATCH /api/v1/b2b/orders/:id/confirm-delivery
         WCS and DELIVERY_STAFF roles.

  ORDER STATE MACHINE (invalid transition returns 422):
    DRAFT → SUBMITTED (buyer)
    SUBMITTED → CONFIRMED | CANCELLED (seller WM)
    CONFIRMED → PACKED (WM or WCS)
    PACKED → DISPATCHED (WM or WCS)
    DISPATCHED → DELIVERED (WM, WCS, or DELIVERY_STAFF)
    DELIVERED → COMPLETED (buyer, or auto after 5 days)
    DELIVERED → DISPUTED (buyer)

  CREDIT LIMIT:
    outstanding_balance + new_order_total > credit_limit → 402

  VAT INVOICE AUTO-GENERATION:
    Trigger: order reaches CONFIRMED status
    Invoice number: PC-INV-YYYY-NNNNNN (database sequence)
    PDF stored in Supabase Storage

  HYBRID FEATURES F-H1 to F-H5:
    F-H1: Unified stock — retail_stock and wholesale_stock boolean flags
    F-H2: Buyer-type pricing — wholesale_selling_price on products
    F-H3: Dual invoicing — dispensing_event → receipt, B2B order → VAT invoice
    F-H4: Role segmentation — DISPENSER cannot access wholesale routes
    F-H5: Dual compliance view — filter compliance_items by user role

Files:
  /backend/src/modules/b2b/
  /frontend/src/modules/wholesale/
  /frontend/src/modules/orders/

Criteria:
  [ ] Order to non-platform seller returns 403
  [ ] Credit limit exceeded returns 402, no order created
  [ ] VAT invoice PDF auto-generates within 60 seconds of CONFIRMED
  [ ] Invalid state transition returns 422
  [ ] WCS cannot access client credit limits — 403
  [ ] WCS sees only their assigned orders in /my-queue
  [ ] Hybrid: DISPENSER cannot access /wholesale/* routes — 403

---

### TASK 9 — MODULE G: REPORTS AND ANALYTICS
Status:    [ ] TODO
Priority:  P2
Depends on: Tasks 3, 4, 5, 6, 8

Description:
  Build all reports G1–G55 plus M1 (TRA VFD), M2 (attendance).
  All reports export as CSV and PDF.
  WHOLESALE_COUNTER_STAFF: only operational reports (own picking
  history, delivery confirmations, intake records). All financial
  reports return 403.

Code tasks (in order of business value):
  Phase 1 — Inventory reports G1–G9: all tiers
  Phase 2 — Financial reports G10–G18: OWNER + PIC, STANDARD+
  Phase 3 — Operations reports G19–G25: STANDARD+
  Phase 4 — Safety reports G26–G31: PIC only, STANDARD+
  Phase 5 — Compliance reports G32–G36: all tiers
  Phase 6 — Wholesale reports G37–G43: WHOLESALE only
  Phase 7 — BI reports G44–G50: PREMIUM + ENTERPRISE
  Phase 8 — Enterprise reports G51–G55: ENTERPRISE only

  G55 (custom report builder):
    Maintain ALLOWED_DIMENSIONS and ALLOWED_METRICS allowlists
    Map selections to pre-written query fragments — never
    interpolate raw user strings into SQL

  M1:  TRA VFD integration (STANDARD+)
       VFD toggle in pharmacy settings (off by default)
       On failure: vfd_status=PENDING, retry every 15 minutes

  M2:  Staff attendance (STANDARD+)
       GET /api/v1/attendance/my-records
       GET /api/v1/attendance/pharmacy-records (PIC + OWNER only)

Files:
  /backend/src/modules/reports/
  /frontend/src/modules/reports/
  /backend/src/jobs/vfd-retry.ts
  /backend/src/jobs/predictions.ts

Criteria:
  [ ] G10 revenue sum matches manual sum of dispensing_events
  [ ] CSV export streams without memory overflow on 50,000 rows
  [ ] G48 peer benchmarking: cohort under 10 returns no data
  [ ] G55: SQL injection attempt returns 400
  [ ] WHOLESALE_COUNTER_STAFF: financial reports return 403
  [ ] VFD failed submission queues and retries correctly

---

### TASK 10 — NOTIFICATIONS INFRASTRUCTURE
Status:    [ ] TODO
Priority:  P2
Depends on: Tasks 1, 2

Description:
  Build the unified notification service for all channels.
  Underpins alert functionality for Modules A, B, and E.

Code tasks:
  1. NotificationService with methods:
       sendInApp(pharmacyId, userId, type, title, body, metadata)
       sendSMS(phone, message, pharmacyId, referenceId, alertType)
       sendEmail(to, subject, htmlBody, pharmacyId, referenceId)
       sendWhatsApp(phone, message, pharmacyId, referenceId)

  2. Deduplication in every send method:
       Query alert_log: if record exists for reference_id + channel
       today, skip.

  3. In-app notification polling:
       GET /api/v1/notifications — unread for current user
       PATCH /api/v1/notifications/:id/read
       Frontend polls every 5 minutes (no WebSocket for now)
       Unread count badge in navigation header

  4. Trial ending alerts:
       7 days before trial_ends_at: email OWNER
       1 day before: email + SMS OWNER
       On expiry: trigger 402 paywall (Task 2 middleware)

  5. Notification preferences:
       OWNER and PIC configure channels per alert type
       Default: all channels enabled

Files:
  /backend/src/services/NotificationService.ts
  /backend/src/modules/notifications/
  /frontend/src/components/NotificationBell.tsx

Criteria:
  [ ] No duplicate alert: same item, same channel, same day
  [ ] In-app unread count updates within 5 minutes
  [ ] Trial expiry email fires at correct time
  [ ] SMS failure logged in alert_log with error_message
  [ ] Disabling SMS for an alert type stops SMS but not email

---

### TASK 11 — DEFERRED FEATURE PLACEHOLDER PAGES
Status:    [ ] TODO
Priority:  P3
Depends on: Task 2

Description:
  Build placeholder pages for all 6 deferred features.
  Each must include the waitlist email capture form.

Code tasks:
  For each deferred feature, create a page with:
    - Feature name (DM Serif Display, 32px)
    - One-paragraph description of what it will do
    - Dependency callout box
    - Email capture form → POST /api/v1/waitlist
    - "Back to platform" link

  Routes:
    /nhif-claims             "NHIF Claims Module"
    /prescriptions           "Prescription Management"
    /symptom-checker         "Clinical OTC Symptom Tool"
    /patient-records         "Persistent Patient Data"
    /accredited-cpd          "PC-Accredited CPD"
    /controlled-substances   "Controlled Substances Reporting"

  Waitlist API:
    POST /api/v1/waitlist
    Body: { email, feature }
    Sends confirmation email via Resend

Files:
  /frontend/src/modules/deferred/ (one page per feature)
  /backend/src/modules/waitlist/

Criteria:
  [ ] All 6 pages render without errors
  [ ] Waitlist form saves to database and sends confirmation email
  [ ] Pages accessible without authentication
  [ ] None of the deferred feature business logic exists anywhere
      in the codebase

---

### TASK 12 — SUBSCRIPTION AND TRIAL MANAGEMENT
Status:    [ ] TODO
Priority:  P1
Depends on: Tasks 1, 2

Description:
  Build the subscription settings page and trial enforcement UI.
  No payment gateway — payment is confirmed manually by the founder
  after receiving M-Pesa or bank transfer. Gateway is Phase 2.

Code tasks:
  1. /settings/subscription page:
       Current tier, billing cycle, trial status, trial countdown
       All 5 tier options with pricing and features
       HYBRID add-on option for retail pharmacies
       "Contact us to upgrade" → WhatsApp deeplink to founder
       with pre-filled message: "I would like to upgrade
       PharmaConnect to [tier]"

  2. Trial paywall overlay:
       Renders when trial_active=false AND status='TRIAL'
       Full-screen, cannot be dismissed
       Shows: "Your 14-day trial has ended"
       Shows: pricing options + M-Pesa/bank payment instructions
       Shows: "Once payment confirmed, access restored within 24 hours"

  3. Trial progress indicator (during trial):
       Navigation badge: "Trial: X days remaining"
       Amber when < 7 days · Red when < 2 days

Files:
  /frontend/src/modules/settings/SubscriptionPage.tsx
  /frontend/src/components/TrialBanner.tsx
  /frontend/src/components/TrialPaywall.tsx

Criteria:
  [ ] Trial paywall renders and cannot be bypassed
  [ ] Paywall still allows /settings/subscription to be accessed
  [ ] "Contact us" opens WhatsApp with pre-filled text
  [ ] Trial banner shows correct days remaining
  [ ] Expired trial correctly blocks all feature routes

---

### TASK 13 — TESTING SUITE
Status:    [ ] TODO
Priority:  P2
Depends on: All feature tasks

Description:
  Unit and integration tests for all critical business logic.
  Target: ≥80% coverage on all business logic files.
  Stack: Vitest + Supertest (backend) + React Testing Library (frontend).

Critical test cases (must all pass):

  Inventory:
    FEFO: soonest-expiry batch always returned first
    Offline sync: 50 operations sync correctly after reconnect
    CSV import: 3 invalid rows → zero committed

  Compliance:
    Alert deduplication: same item, same channel, same day → skip
    Health score: mixed GREEN/AMBER/RED items calculates correctly

  Patient Safety:
    Interaction check: known CONTRAINDICATED pair detected
    Wrong PIN: 403 returned, no log entry created
    override_log delete: database trigger raises exception
    Clark's rule: 28kg patient, 500mg adult dose → 200mg
    clinician_reviewed=false: drug excluded from results

  Dispensing:
    Void: batch.quantity_remaining correctly restored
    Immutability: PUT on dispensing_event core fields → 403

  B2B:
    Credit limit exceeded: order not created, 402 returned
    Invalid state transition: 422 returned
    Closed network: order to non-platform seller → 403

  Reports:
    Revenue sum: G10 matches manual sum of test data
    Peer benchmarking: cohort < 10 returns no benchmark data
    Custom builder: DROP TABLE injection → 400

  Roles:
    DATA_ENTRY_CLERK on /dispensing → 403
    WHOLESALE_COUNTER_STAFF on credit limits → 403
    CASHIER applying discount → 403
    DISPENSER on MAJOR override without PIN → 403

Criteria:
  [ ] All critical test cases pass
  [ ] Coverage ≥80% on business logic files
  [ ] No test passes by mocking the thing being tested

---

### TASK 14 — AUDIT.MD FINAL UPDATE
Status:    [ ] TODO
Priority:  P3
Depends on: All tasks

Description:
  Update /AUDIT.md with final status of every item.
  Every feature should now show DONE.
  Any item still PARTIAL or MISSING: document with specific reason
  and create a follow-up task.

---

## Progress summary (update as tasks complete)

| Task | Description | Status | Completed |
|------|-------------|--------|-----------|
| 0 | Project audit | [ ] | — |
| 1 | Database schema migrations | [ ] | — |
| 2 | Auth and RBAC middleware | [ ] | — |
| 3 | Module A — Inventory | [ ] | — |
| 4 | Module B — Compliance | [ ] | — |
| 5 | Module C — Patient Safety | [ ] | — |
| 6 | Module D — Dispensing | [ ] | — |
| 7 | Module E — Knowledge Hub + CPD | [ ] | — |
| 8 | Module F — B2B Ordering | [ ] | — |
| 9 | Module G — Reports | [ ] | — |
| 10 | Notifications infrastructure | [ ] | — |
| 11 | Deferred feature placeholders | [ ] | — |
| 12 | Subscription and trial management | [ ] | — |
| 13 | Testing suite | [ ] | — |
| 14 | AUDIT.md final update | [ ] | — |

---

## Questions to ask before proceeding with any task

1. Does CLAUDE.md answer it? Check there first.
2. Is it a product decision (pricing, tier, ethical rule)?
   Stop and ask the founder before making any assumption.
3. Is it a technical implementation choice?
   Use best judgment but document the decision in a code comment
   and note it under the task.
4. Does it involve patient data, medical records, or clinical logic?
   Stop and ask. These decisions have real consequences.

---

*Development authority for PharmaConnect System.*
*Derived from Improvement X · April 2026 · Arusha, Tanzania*
