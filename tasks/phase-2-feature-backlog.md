# Phase 2 Feature Backlog

Research-based feature gaps identified June 2026.
Sources: mPharma Bloom, iVend/Goodlife, Kenyan/Nigerian pharmacy PMS, global best practice.
Cross-referenced against existing APOTEKH codebase.

---

## High priority (revenue / compliance / low build cost)

### 1. Refill reminders via WhatsApp/SMS
**Tier:** STANDARD+
**What:** Auto-send a WhatsApp message when a repeat customer hasn't returned within
their expected cycle (e.g. 28 days for monthly BP/diabetes meds). Driven by purchase
history that already exists. Needs a scheduled job + a customer phone field at
dispensing + opt-in flag.
**Why now:** mPharma Bloom does this. Reduces patient dropout on chronic conditions.
Directly tied to recurring revenue for the pharmacy.

### 2. Expiry return workflow (RMA)
**Tier:** BASIC+
**What:** When near-expiry stock is flagged, a formal return-to-supplier flow:
select batches, generate a supplier credit note, adjust inventory, record reason.
Currently dead stock is identified but there is no structured return path.
**Why now:** Top pain point in Tanzanian pharmacies. Directly reduces losses.
Schema already has batch and stock movement tables.

### 3. Private insurance claim processing
**Tier:** STANDARD+
**What:** Structured claim submission for private insurers (AAR, Jubilee Allianz,
Strategis, UAP). Not NHIF (blocked by reform). Claim form tied to a dispensing
event: patient name, policy number, drug, amount, prescriber.
**Why now:** Private insurers pay above market. Several Kenya/Tanzania PMS already
support this. Genuine revenue driver for urban pharmacies.

---

## Medium priority (operational quality)

### 4. Barcode label printing
**Tier:** All tiers
**What:** Generate and print shelf labels / price stickers for products that arrive
without barcodes. Integrates with existing barcode scan infrastructure.
**Why now:** Every competitor has it. Low complexity. High value for stock intake.

### 5. Cold chain UI (schema already exists)
**Tier:** BASIC+
**What:** Surface the existing `ColdChainLog` model as a data entry page and alert
when a log entry is overdue. Vaccines and insulin require cold chain evidence for
TMDA inspections.
**Why now:** Schema is done. Just needs a form page and a cron alert job.

### 6. Customer loyalty / points program
**Tier:** STANDARD+
**What:** Points per purchase, redeemable at checkout as a discount. Reward refill
consistency, referrals. iVend/Goodlife and PrimeRx both offer this.
**Why now:** Strong retention driver for chronic disease patients.

### 7. Inter-outlet stock transfer
**Tier:** PREMIUM (multi-outlet owners)
**What:** Request stock from Outlet A to Outlet B when one location runs short.
Transfer request -> confirm -> inventory adjustment at both outlets.
**Why now:** Owners on PREMIUM already have 3-5 outlets. No transfer path today.

---

## Lower priority (Phase 2.5+)

### 8. Pharmacovigilance / ADR reporting
**Tier:** STANDARD+
**What:** Structured adverse drug reaction form pre-filled from dispensing session,
generates TMDA-compatible report. `AdverseReactionReport` model exists. Deferred
page (`PharmacovigilancePage`) already in the frontend.
**Note:** Build the backend form + report generation. Frontend shell is ready.

### 9. Supplier performance scoring
**Tier:** STANDARD+
**What:** Auto-score each supplier after stock receipt: delivery reliability (on time?),
fill rate (did they send everything?), price consistency. Actionable for reorder decisions.

### 10. Structured prescription management
**Tier:** STANDARD+
**What:** Replace prescription photo with a structured record: drug, dose, prescriber
name, valid-until date, refills remaining. Enables proper refill management and
TMDA audit trail. Deferred page (`PrescriptionManagementPage`) already in frontend.
**Note:** Backend needs to be built. Frontend shell is ready.

---

## Onboarding wizard (completed June 2026)
Built as a multi-step first-login wizard for OWNER role. Stored in
`PharmacySetting` key `onboarding_completed`. No migration required.
Files: `frontend/src/components/OnboardingWizard.tsx`,
backend routes `GET/POST /settings/onboarding/status|complete`.
