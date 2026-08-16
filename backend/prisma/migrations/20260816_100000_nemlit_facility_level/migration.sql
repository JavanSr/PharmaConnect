-- NEMLIT 2021 prescribing-level restriction (A/B/C/D/S), independent of AWaRe.

ALTER TABLE "drug_database"
  ADD COLUMN IF NOT EXISTS "nemlit_facility_level" TEXT;
