-- Merge retired staff roles into supported MVP roles before schema cleanup.
UPDATE "users"
SET "role" = 'DISPENSER'
WHERE "role"::TEXT = ('DATA_ENTRY' || '_CLERK');

UPDATE "users"
SET "role" = 'CASHIER'
WHERE "role"::TEXT = ('ACCOUNT' || 'ANT');

UPDATE "pharmacy_memberships"
SET "role" = 'DISPENSER'
WHERE "role"::TEXT = ('ACCOUNT' || 'ANT');

-- Phase-1 schema cleanup: remove persistent patient/NHIF business tables.
DROP TABLE IF EXISTS "NhifClaimItem" CASCADE;
DROP TABLE IF EXISTS "NhifClaim" CASCADE;
DROP TABLE IF EXISTS "Patient" CASCADE;
DROP TABLE IF EXISTS "nhif_claim_items" CASCADE;
DROP TABLE IF EXISTS "nhif_claims" CASCADE;
DROP TABLE IF EXISTS "patients" CASCADE;

-- Prescription photos remain dispensing attachments, but must not carry patient IDs.
ALTER TABLE "prescriptions"
  DROP COLUMN IF EXISTS "patient_id";

DROP TYPE IF EXISTS "NhifClaimStatus" CASCADE;
DROP TYPE IF EXISTS "Gender" CASCADE;
