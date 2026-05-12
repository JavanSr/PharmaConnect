# Codex Prompt — AWaRe Classification, Cold Chain Schema, Pharmacovigilance Schema

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Scope

Three additions only. Do not exceed this scope.

1. **AWaRe antibiotic classification** — full implementation (schema + seed + dispensing UI flag)
2. **Cold chain temperature log** — schema and migration only, no UI, no API
3. **Pharmacovigilance (ADR reporting)** — schema and migration only, plus one placeholder page

---

## Task 1 — AWaRe Antibiotic Classification

### Background

Tanzania's NEMLIT 2021 (5th edition, Ministry of Health) categorises all antibacterials into three groups per WHO AWaRe framework:
- **ACCESS** — first-line antibiotics; can be dispensed at all levels including ADDOs and dispensaries
- **WATCH** — second-line; restricted to council hospital level and above
- **RESERVE** — protected antibiotics; tertiary facilities only

PharmaConnect dispenses antibiotics daily with no visibility into which group they fall under. Adding this classification closes a real compliance gap and is a visible differentiator with Pharmacists in Charge.

### Schema change

Add one nullable field to `DrugDatabase` in `backend/prisma/schema.prisma`:

```prisma
awarClass  String?  @map("awar_class")  // 'ACCESS' | 'WATCH' | 'RESERVE' | null
```

Write migration: `npx prisma migrate dev --name add_awar_class_to_drug_database`

### Seed data update

In `backend/src/data/drug-database-seed.ts`, add `awarClass` to the `DrugSeed` type (optional field) and populate it for all antibacterial entries. Use the NEMLIT 2021 AWaRe classification:

**ACCESS antibiotics** (dispensable at all levels):
amoxicillin, co-trimoxazole, metronidazole, doxycycline, erythromycin, benzylpenicillin, phenoxymethylpenicillin, ampicillin, cloxacillin, nitrofurantoin, chloramphenicol, clindamycin

**WATCH antibiotics** (council hospital and above only):
ciprofloxacin, azithromycin, ceftriaxone, cefixime, cephalexin, gentamicin

**RESERVE antibiotics** (tertiary only — flag for awareness but these are rarely stocked at retail):
None in the current seed need RESERVE classification. Leave `awarClass: null` for non-antibacterials.

### API update

In the patient safety / dispensing drug lookup endpoint, include `awarClass` in the response so the frontend can use it.

### Frontend — dispensing UI

In the dispensing drug search results and the active dispensing item list, show a small inline badge next to any drug where `awarClass` is `WATCH` or `RESERVE`. Do not badge ACCESS drugs — that is the expected default.

Badge design (consistent with existing Badge component):
- WATCH → `variant="warning"` with text "WATCH antibiotic"
- RESERVE → `variant="danger"` with text "RESERVE antibiotic"

On hover or tap, show a tooltip: "This antibiotic is classified as [WATCH/RESERVE] under WHO AWaRe / Tanzania NEMLIT 2021. Dispensing requires a valid prescription from an authorised facility."

Do not block dispensing. Do not require PIC PIN for AWaRe alone (interaction/contraindication rules already handle that separately). This is an informational flag only.

### Acceptance criteria

- [ ] `awarClass` field exists in `drug_database` table after migration
- [ ] Seed data updated with correct AWaRe classification for all antibacterials
- [ ] WATCH and RESERVE badges visible in dispensing drug search
- [ ] No badge shown for ACCESS or non-antibiotic drugs
- [ ] Tooltip text correct and readable
- [ ] No existing test or dispensing flow broken

---

## Task 2 — Cold Chain Temperature Log Schema

### Background

TMDA's Good Storage and Distribution Practices (GSDP) Regulations 2021 require pharmacies to document storage conditions for temperature-sensitive products. PharmaConnect already tracks `cold_chain_required` per product but has no log of actual temperatures recorded. This migration reserves the table for when the UI is built in a future phase.

### Schema addition

Add the following model to `backend/prisma/schema.prisma`:

```prisma
model ColdChainLog {
  id             String   @id @default(uuid())
  pharmacyId     String   @map("pharmacy_id")
  productId      String?  @map("product_id")   // nullable — log can be for fridge generally
  loggedBy       String   @map("logged_by")
  temperatureC   Decimal  @db.Decimal(5, 2) @map("temperature_c")
  storageUnit    String?  @map("storage_unit")  // e.g. "Fridge A", "Cold room 1"
  excursion      Boolean  @default(false)        // true if outside acceptable range
  notes          String?
  loggedAt       DateTime @default(now()) @map("logged_at")
  createdAt      DateTime @default(now()) @map("created_at")

  pharmacy Pharmacy @relation(fields: [pharmacyId], references: [id], onDelete: Cascade)
  product  Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  logger   User     @relation(fields: [loggedBy], references: [id], onDelete: Restrict)

  @@index([pharmacyId, loggedAt], map: "cold_chain_logs_pharmacy_logged_at_idx")
  @@map("cold_chain_logs")
}
```

Add the `coldChainLogs` relation to the `Pharmacy`, `Product`, and `User` models.

Write migration: `npx prisma migrate dev --name add_cold_chain_logs`

### No UI, no API, no routes

Do not build any API endpoint, service, or frontend page for this table. The table exists so data can be captured in a future phase without a breaking schema change. Leave a `// TODO Phase 2: cold chain log UI and API` comment in a logical location in the compliance module.

### Acceptance criteria

- [ ] `cold_chain_logs` table exists after migration
- [ ] Relations on Pharmacy, Product, and User compile without TypeScript errors
- [ ] No existing functionality changed
- [ ] No frontend changes

---

## Task 3 — Pharmacovigilance (ADR) Schema and Placeholder Page

### Background

TMDA expects pharmacies to report suspected Adverse Drug Reactions (ADRs). Currently PharmaConnect has no mechanism for a Pharmacist in Charge to log or submit an ADR report. This task creates the data structure and a placeholder page so the feature is visible to users and the schema is ready for Phase 2 implementation.

### Schema addition

Add the following model to `backend/prisma/schema.prisma`:

```prisma
model AdverseReactionReport {
  id               String   @id @default(uuid())
  pharmacyId       String   @map("pharmacy_id")
  reportedBy       String   @map("reported_by")
  suspectedDrug    String   @map("suspected_drug")       // generic name, free text
  brandUsed        String?  @map("brand_used")
  batchNumber      String?  @map("batch_number")
  reaction         String                                  // description of adverse event
  onset            String?                                 // e.g. "2 hours after first dose"
  outcome          String?                                 // e.g. "Resolved", "Hospitalised", "Fatal"
  patientAgeYears  Int?     @map("patient_age_years")
  patientSex       String?  @map("patient_sex")           // 'MALE' | 'FEMALE' | 'OTHER'
  seriousness      String   @default("NON_SERIOUS") @map("seriousness") // 'SERIOUS' | 'NON_SERIOUS'
  status           String   @default("DRAFT")              // 'DRAFT' | 'READY' | 'SUBMITTED'
  tmdaReferenceNo  String?  @map("tmda_reference_no")     // filled after TMDA submission
  submittedAt      DateTime? @map("submitted_at")
  notes            String?
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  pharmacy  Pharmacy @relation(fields: [pharmacyId], references: [id], onDelete: Cascade)
  reporter  User     @relation(fields: [reportedBy], references: [id], onDelete: Restrict)

  @@index([pharmacyId, createdAt], map: "adverse_reaction_reports_pharmacy_created_at_idx")
  @@index([status], map: "adverse_reaction_reports_status_idx")
  @@map("adverse_reaction_reports")
}
```

Add `adverseReactionReports` relation to `Pharmacy` and `User` models.

Write migration: `npx prisma migrate dev --name add_adverse_reaction_reports`

### Placeholder route

Add route `/pharmacovigilance` to `frontend/src/App.tsx` pointing to a deferred placeholder page.

Create `frontend/src/modules/deferred/PharmacovigilancePage.tsx` using the existing `DeferredFeaturePage` component pattern with:
- Feature name: "Adverse Drug Reaction Reporting"
- Description: "Report suspected adverse reactions directly to TMDA from PharmaConnect. Structured ADR forms, automatic reference tracking, and submission history — launching when TMDA's electronic reporting integration is ready."
- Dependency: "TMDA electronic ADR reporting system integration"
- Waitlist capture: yes

### Sidebar

Add to `phase2Nav` in `Sidebar.tsx`:

```tsx
{ label: 'ADR Reporting', path: '/pharmacovigilance', icon: <AlertTriangle size={18} />, locked: true, phase: 2 }
```

### Access control note

When the real implementation is built in Phase 2, this route must be restricted to `OWNER`, `PHARMACIST_IN_CHARGE`, and `LOCUM` roles only. The placeholder is accessible without authentication (consistent with other deferred pages).

### Acceptance criteria

- [ ] `adverse_reaction_reports` table exists after migration
- [ ] `/pharmacovigilance` route renders placeholder page without errors
- [ ] Placeholder page is accessible without login
- [ ] ADR Reporting appears in sidebar Coming Soon section
- [ ] No existing functionality changed

---

## Final output expected

At the end:
1. Files changed
2. Migrations added
3. Assumptions made
4. What still needs manual review or clinical input
5. Risks before next phase
