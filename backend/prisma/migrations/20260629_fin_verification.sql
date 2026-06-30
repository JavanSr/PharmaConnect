-- Migration: Add FIN number and isVerified fields to pharmacies

ALTER TABLE "pharmacies"
  ADD COLUMN IF NOT EXISTS "fin_number" TEXT,
  ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT FALSE;

-- Pharmacies that already provided a licence number (non-PENDING) are considered verified
UPDATE "pharmacies"
  SET "is_verified" = TRUE
  WHERE "licenceNumber" NOT LIKE 'PENDING-%';
