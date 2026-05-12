# tasks/patient-safety-tanzania-master-data.md

## Objective

Add a Tanzania-first master drug and safety data layer to PharmaConnect **without breaking the current MVP**.
This work must be implemented incrementally on top of the existing system.

---

## Non-Negotiables

- Do not rebuild the MVP
- Do not break current inventory, dispensing, or onboarding flows
- New data layer must be additive
- Keep manual entry as fallback everywhere relevant
- Every clinical/safety rule must preserve source attribution
- Prefer Tanzania official sources first
- Mark uncertain data for review instead of guessing

---

## Current Product Constraint

PharmaConnect already has an MVP running.
Therefore:

- preserve current UI and workflows unless a small improvement is clearly needed
- add new schema and services behind existing features
- integrate gradually
- release in phases

---

## High-Level Goal

Create a master medicine catalog for Tanzania that supports:

1. inventory receiving
2. generic-brand mapping
3. dispensing support
4. patient safety alerts
5. future regulatory and clinical expansion

---

## Phase 1 — Source Discovery

### Goal

Identify official and reliable Tanzania-first data sources for registered products and safety information.

### Tasks

1. Find official Tanzania source(s) for registered medicines/products
2. Find official source(s) for approved product information / SmPC-style safety information
3. Determine whether each source is:
   - searchable
   - downloadable
   - scrapeable
   - manual-import only
4. Document update strategy for each source

### Primary sources to evaluate (in priority order)

1. **TMDA Approved Product Information portal** — tmda.go.tz/pages/approved-product-information
   — assess whether bulk export or structured download is available; if only a search interface exists, document that explicitly
2. **Tanzania NEMLIT 2021** (National Essential Medicines List) — published by the Ministry of Health Tanzania; a PDF is publicly available and contains the structured formulary used by all public health facilities
3. **MSD Tanzania procurement catalogue** (Medical Stores Department) — msd.go.tz; MSD is the largest single buyer of medicines in Tanzania and publishes a product list that is more consistently structured than the TMDA portal; use as primary fallback if TMDA bulk data is unavailable
4. **WHO Essential Medicines List 23rd edition (2023)** — fallback for drugs not yet registered in Tanzania but commonly stocked

### Fallback rule

If TMDA does not provide a bulk-downloadable or scrapeable product register, begin Phase 3 using the MSD procurement catalogue as the seed dataset, supplemented by manual entry of NEMLIT drugs. Document this decision in `docs/data-sources.md` under "Import method: MSD fallback".

### Deliverables

- `docs/data-sources.md`

### Required fields in documentation

- source name
- URL
- source type
- trust level
- fields available
- update frequency if known
- import method
- notes/limitations

---

## Existing Schema Context — Read Before Phase 2

> **This section must be read before designing any new tables.**

PharmaConnect already has the following models in `backend/prisma/schema.prisma` that are live and used by the patient safety and dispensing modules:

| Existing model | Purpose | Status |
|---|---|---|
| `DrugDatabase` | Core drug record: generic name, brand names, dosage, pregnancy category, cautions, NCD hints | Live — used by patient safety checks |
| `DrugInteraction` | Pair-level drug-drug interaction rules: severity, effect summary, management, PIC PIN flag | Live — used by dispensing interaction checker |
| `DrugContraindication` | Per-drug contraindication rules: condition type/value, severity, message, PIC PIN flag | Live — used by dispensing safety alerts |
| `DrugMaster` | Lightweight catalog stub: msdCode, name, genericName, dosageForm, strength, unitPrice, category | Exists — referenced by `Product.drugMasterId` FK but largely unpopulated |
| `Product.drugMasterId` | Foreign key linking a pharmacy's inventory product to the master catalog | Exists in schema — the intended join point between inventory and catalog |
| `Product.tmdaRegistrationNumber` | TMDA registration number stored on inventory products | Exists in schema — must be preserved and populated from catalog data |

### Schema decision for Phase 2

**Do not create parallel drug tables that duplicate `DrugDatabase`, `DrugInteraction`, or `DrugContraindication`.**

Instead:

- Extend the existing models where new fields are needed (use `ALTER TABLE` migrations, not new tables)
- Replace `DrugMaster` with the richer catalog schema described in Phase 2 — write a migration that drops `drug_master` and replaces it with the new `drug_products` / `active_ingredients` / `brands` structure
- Ensure `Product.drugMasterId` is updated to reference the new catalog table via a rename migration; do not leave it pointing at a dropped table
- The safety rules tables (`drug_interactions`, `drug_contraindications`) remain but gain a `source_document_id` FK and a `review_status` column — add via migration, not replacement
- Any seed data already in `DrugDatabase` must be preserved through this migration

---

## Phase 2 — Add Master Data Schema

### Goal

Introduce the data model required for regulated drug catalog + safety support.

### Tasks

Create schema/tables for:

- `active_ingredients`
- `drug_products`
- `brands`
- `manufacturers`
- `registrants`
- `dosage_forms`
- `strengths`
- `routes`
- `pack_sizes`
- `therapeutic_classes`
- `product_aliases`
- `allergies`
- `conditions`
- `contraindication_rules`
- `interaction_rules`
- `warnings`
- `pregnancy_flags`
- `lactation_flags`
- `renal_flags`
- `hepatic_flags`
- `source_documents`
- `data_review_queue`

### Rules

- one generic can map to many brands
- one brand can have multiple strengths/forms
- one product may have registration metadata
- every safety rule must store its source
- schema must allow manual review and future updates

### Deliverables

- migration files
- `docs/master-data-schema.md`

---

## Phase 3 — Build Initial Tanzania Master Drug Catalog

### Goal

Create a first working catalog for medicine selection and matching.

### Tasks

1. Import a first dataset of Tanzania-registered medicines/products
2. Normalize and structure:
   - generic name
   - brand name
   - strength
   - dosage form
   - route
   - pack size
   - manufacturer
   - registrant / MAH
   - registration identifier if available
   - source URL
   - last verified date
3. Deduplicate duplicates and spelling variants
4. Support combination products
5. Create aliases for:
   - brand search
   - generic search
   - common spelling variations

### MVP scope rule

Start with a limited but high-value set first if full import is too large.

### Deliverables

- importer script(s)
- normalized seed data
- initial master catalog dataset

---

## Phase 4 — Connect Master Catalog to Existing Inventory

### Goal

Improve inventory receiving without removing the current manual process.

### Tasks

1. Add product search from master catalog during inventory receiving
2. Keep manual entry fallback
3. If user selects catalog product, auto-fill where possible:
   - brand
   - generic
   - strength
   - dosage form
   - manufacturer
   - therapeutic class
4. If product not found:
   - allow manual entry
   - mark as unverified
   - optionally queue for review

### Rules

- current receiving flow must continue to work
- do not force pharmacies to use catalog-only entry yet

### Deliverables

- inventory receiving enhancement
- safe fallback behavior
- unverified product queue

---

## Phase 5 — Build Safety Knowledge Base

### Goal

Create structured clinical safety rules from approved product information and trusted sources.

### Source priority for safety rules

Use sources in this order. Do not guess or synthesize rules not found in at least one of these:

1. **TMDA Approved Product Information (SmPC)** — product-specific; use where available for Tanzania-registered products
2. **WHO Model Formulary / WHO Essential Medicines List 23rd edition (2023)** — use for interaction and contraindication rules where TMDA SmPC is unavailable; this is the primary practical source for most rules in the initial build
3. **British National Formulary (BNF)** — use for interaction severity classifications (MAJOR / MODERATE / MINOR) and pregnancy/lactation guidance where WHO documentation is insufficient
4. **Tanzania NEMLIT 2021 STG notes** — use for Tanzania-specific dosing and caution notes embedded in the Standard Treatment Guidelines

If a rule cannot be sourced to one of the above, mark it `review_status = 'NEEDS_VERIFICATION'` and do not show it in the dispensing UI until approved.

### Tasks

Extract and structure:

- contraindications
- warnings/precautions
- drug-drug interactions
- allergy-related restrictions
- pregnancy restrictions if available
- lactation restrictions if available
- major counseling points if available

For each rule store:

- severity
- rule type
- plain-language message
- source product or source document
- source section if available
- source URL
- extraction/import date
- review status

### Separate rules into

- product-specific rules
- ingredient-class rules
- class-class interaction rules

### Deliverables

- safety datasets
- parser/import workflow if feasible
- review-ready rules table

---

## Phase 6 — Add Patient Safety Checks to Dispensing

### Goal

Use the new data layer to support safe dispensing.

### Tasks

At dispensing time, check selected medicine against:

- allergies
- conditions
- current medications
- pregnancy/lactation flags if enabled later
- age flags if added later

### Output

Show alerts by severity:

- high
- moderate
- informational

### Rules

- if no trusted rule exists, show nothing rather than guess
- current dispensing flow must not break
- alerts should be short and actionable

### Deliverables

- safety check service
- alert UI integration
- source-linked alert detail in admin or review view

---

## Phase 7 — Human Review Workflow

### Goal

Ensure clinical data is reviewable and governable.

### Reviewer context

The reviewer role in this system is a **PharmaConnect-affiliated pharmacist or Pharmacist in Charge (PIC)** operating at the platform level — not a per-pharmacy user. The `data_review_queue` model must include a `reviewer_type` field to distinguish between:

- `PLATFORM_PHARMACIST` — a PharmaConnect-contracted clinical reviewer (can approve any rule)
- `PIC_OVERRIDE` — a Pharmacist in Charge at a specific pharmacy who has flagged a rule for correction at their outlet level only
- `TMDA_REFERENCE` — a rule approved by reference to an official TMDA document (no human reviewer required; source document is the authority)

Rules approved only by `PIC_OVERRIDE` must remain visible to that pharmacy only until a `PLATFORM_PHARMACIST` confirms them platform-wide.

### Tasks

1. Create reviewer/admin interface for:
   - approving rules
   - editing wording
   - rejecting uncertain entries
   - retiring outdated rules
2. Track statuses such as:
   - draft
   - imported
   - reviewed
   - approved
   - rejected
3. Support audit trail for updates

### Deliverables

- review dashboard
- status model
- audit trail support

---

## Phase 8 — Update Pipeline

### Goal

Keep the catalog and safety rules current over time.

### Tasks

1. Create sync/check process for updated sources
2. Detect:
   - new products
   - changed products
   - retired/obsolete records if visible
3. Preserve version history
4. Produce update reports for admin review

### Deliverables

- sync job or update script
- audit/version logging
- admin update report

---

## Implementation Rules for Codex

- work phase by phase
- do not refactor unrelated modules
- do not redesign the whole product
- preserve current MVP behavior
- prefer backward-compatible migrations
- keep files and code modular
- add comments only where useful
- stop and summarize assumptions when source data is incomplete

---

## Immediate Execution Order

Implement only this order unless explicitly changed:

1. Phase 1 source discovery
2. Phase 2 schema
3. Phase 3 initial catalog
4. Phase 4 inventory integration

Do **not** start Phase 5+ until the first four phases are stable.

---

## Definition of Success

Success means:

- current MVP still works
- inventory can use a master drug catalog optionally
- catalog supports brand/generic matching
- safety layer is structurally ready
- data is source-attributed and expandable

---

## Final Output Expected From Codex

At the end of each phase, provide:

1. files changed
2. migrations added
3. scripts created
4. assumptions made
5. what still needs manual review
6. risks before next phase
