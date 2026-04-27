# Safety Knowledge Base

This document records the Phase 5-6 initial safety-rule implementation for Tanzania master data.

## Source priority

The current seed workflow uses these sources in the order defined by `tasks/patient-safety-tanzania-master-data.md`:

1. TMDA Approved Product Information (preferred when available, not yet bulk-seeded)
2. WHO Model Formulary 2008
3. WHO Model List of Essential Medicines, 23rd list (2023)
4. Tanzania Standard Treatment Guidelines / NEMLIT 2021
5. Tanzania STG/NEMLIT addendum dated April 12, 2023

## Current implementation

- Safety rules are seeded through `backend/prisma/seed-drug-database.ts`
- Approved rules are stored in:
  - `drug_interactions`
  - `drug_contraindications`
  - `warnings`
  - `pregnancy_flags`
  - `lactation_flags`
  - `renal_flags`
  - `hepatic_flags`
- The dispensing UI only surfaces rules with `review_status = APPROVED`
- Unsourced or unapproved rules should remain hidden from the dispensing UI
- Where a matching master-catalog ingredient exists, precaution rules are also linked to `active_ingredients` so dispensing can reuse the Tanzania catalog join points without replacing the MVP safety tables

## Scope of the initial dataset

The initial dataset is intentionally narrow and conservative:

- interaction alerts for high-risk common outpatient medicines
- contraindications for pregnancy, allergy, renal, hepatic, diagnosis, and elderly risk
- structured precaution alerts for counselling, renal, hepatic, pregnancy, and lactation checks

This phase does not attempt full TMDA SmPC coverage yet. The current seed is a reviewable bridge until TMDA-specific extraction is added.

## Operational commands

Run from `backend`:

```bash
npm run seed:drugs
```

This command now seeds:

- reviewed `drug_database` rows
- source documents for WHO and Tanzania references
- approved interaction and contraindication rules
- approved precaution and patient-flag rules

## UI behavior

- If an approved rule exists, it can appear in the patient safety panel
- If no approved rule exists, nothing is shown instead of inferring risk from incomplete data
- PIC override behavior remains driven only by high-risk interactions and contraindications
- Precaution alerts can now match approved rules through reviewed drugs, linked catalog products, or linked active ingredients when those joins exist
