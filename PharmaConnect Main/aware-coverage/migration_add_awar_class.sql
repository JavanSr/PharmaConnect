-- Migration: add_awar_class_to_drug_database
-- Run via: npx prisma migrate dev --name add_awar_class_to_drug_database
--
-- AWaRe applies to ANTIBIOTICS ONLY (antibacterials).
-- All other drug rows remain NULL — this is correct by design.

ALTER TABLE "drug_database"
  ADD COLUMN IF NOT EXISTS "awar_class" TEXT;

-- Constraint: only allow valid values (or null for non-antibiotics)
ALTER TABLE "drug_database"
  ADD CONSTRAINT "awar_class_valid_values"
  CHECK ("awar_class" IN ('ACCESS', 'WATCH', 'RESERVE') OR "awar_class" IS NULL);
