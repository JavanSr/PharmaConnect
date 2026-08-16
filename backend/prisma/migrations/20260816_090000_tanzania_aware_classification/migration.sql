-- Tanzania STG/NEMLIT 2021 antibiotic classification is now stored separately
-- from WHO's global AWaRe list. Tanzania's classification is primary (drives
-- the dispensing badge); WHO's is kept as a secondary/reference field. See
-- enrichProductsWithAwarClass() in inventory.service.ts for resolution order.

ALTER TABLE "drug_database"
  ADD COLUMN IF NOT EXISTS "tanzania_aware_class" TEXT,
  ADD COLUMN IF NOT EXISTS "nemlit_listed" BOOLEAN NOT NULL DEFAULT false;
