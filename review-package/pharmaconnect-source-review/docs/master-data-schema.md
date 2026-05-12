# Tanzania Master Data Schema

Verified for Phase 2 on `2026-04-23`.

## Goal

This schema adds a normalized Tanzania-first master drug and safety layer without replacing the current MVP inventory, dispensing, or patient-safety flows.

## Compatibility Decisions

- `DrugDatabase` remains the live generic drug reference used by current patient-safety checks.
- `DrugInteraction` and `DrugContraindication` remain the live safety-rule tables; they were extended instead of replaced.
- `DrugMaster` is replaced at the database level by `drug_products`, but the app-level `Product.drugMasterId` contract is preserved for now.
- The `products` table now points to `drug_products` through the renamed database column `drug_product_id`, while Prisma still exposes the legacy field name `drugMasterId` to avoid breaking current code paths.
- Existing seed data in `drug_database` is untouched by this phase.

## Physical Tables Added

Catalog core:

- `drug_products`
- `active_ingredients`
- `brands`
- `manufacturers`
- `registrants`
- `dosage_forms`
- `strengths`
- `routes`
- `pack_sizes`
- `therapeutic_classes`
- `drug_product_ingredients`
- `product_aliases`

Safety and source governance:

- `source_documents`
- `warnings`
- `pregnancy_flags`
- `lactation_flags`
- `renal_flags`
- `hepatic_flags`
- `data_review_queue`
- `allergies`
- `conditions`

## Logical Tables Mapped To Existing Live Tables

The task called for `contraindication_rules` and `interaction_rules`, but Phase 2 keeps the live MVP tables in place:

- Logical `interaction_rules` => physical `drug_interactions`
- Logical `contraindication_rules` => physical `drug_contraindications`

Both tables now carry:

- `source_document_id`
- `source_section`
- `source_url`
- `review_status`
- `imported_at`
- `updated_at`

This keeps the current dispensing safety checks intact while making the rules source-attributed and reviewable.

## Relationship Model

Core catalog:

- One `brand` can map to many `drug_products`.
- One `manufacturer` can map to many `drug_products`.
- One `registrant` can map to many `drug_products`.
- One `therapeutic_class` can map to many `drug_products` and many `active_ingredients`.
- One `drug_product` can map to many `active_ingredients` through `drug_product_ingredients`.

This is the combination-product support needed for Phase 3.

Product/source attribution:

- One `source_document` can be the primary source for many `drug_products`.
- One `source_document` can also support many aliases, warnings, flags, interactions, contraindications, and review-queue entries.

Safety targets:

- `warnings`, `pregnancy_flags`, `lactation_flags`, `renal_flags`, and `hepatic_flags` can attach to:
  - `drug_products`
  - `active_ingredients`
  - `drug_database`

That gives Phase 5 room for product-specific and ingredient-level safety data without disturbing the current `drug_database` driven workflows.

## Key Table Notes

### `drug_products`

Primary regulated catalog record. Holds:

- product identity
- TMDA/MSD identifiers
- registration status
- cold-chain and essential-medicine flags
- optional normalized lookups for brand, dosage form, route, pack size, manufacturer, registrant, and therapeutic class
- source attribution and review status

### `drug_product_ingredients`

Join table for combination products. Stores:

- product to ingredient link
- ingredient ordering
- optional normalized strength reference
- free-text strength fallback

### `product_aliases`

Supports:

- brand aliases
- generic aliases
- spelling variants
- MSD code aliases
- TMDA registration aliases

### `source_documents`

Stores provenance needed for later clinical governance:

- source name
- source type
- trust level
- import method
- authority
- publication/effective dates
- last checked timestamp

### `data_review_queue`

Tracks reviewable imported content across entities. Includes:

- `entity_type`
- `entity_id`
- `status`
- `current_payload`
- `proposed_payload`
- `reviewer_type`

`reviewer_type` was included now because Phase 7 already requires it.

## Prisma/App Layer Notes

- Prisma model `DrugProduct` maps to table `drug_products`.
- The inventory route `/inventory/drug-master` is intentionally retained for MVP compatibility, but it now reads from `drug_products`.
- Current inventory create/update payloads can continue sending `drugMasterId`.

## Deferred To Phase 3

Phase 2 creates structure only. It does not yet:

- import Tanzania product data
- backfill lookup tables from TMDA/MSD/NEMLIT
- populate `drug_products`
- map existing `DrugDatabase` rows to `active_ingredients`
- enable catalog search during receiving beyond the existing compatibility endpoint

## Risks Going Into Phase 3

- `drug_products` is structurally richer than the current data sources, so importer backfill rules must be conservative.
- TMDA public register export behavior is still unconfirmed, so Phase 3 should seed from MSD and verify with TMDA rather than assume TMDA bulk import.
- Existing UI still uses legacy naming such as `drugMasterId` and `/inventory/drug-master`; that is intentional compatibility debt and should be cleaned up only after Phase 4 is stable.
