-- Fix: override_log pharmacy FK must be RESTRICT, not CASCADE.
-- CASCADE bypasses the no_delete_override_log trigger, silently destroying medical records.

ALTER TABLE "override_log"
  DROP CONSTRAINT IF EXISTS "override_log_pharmacy_id_fkey";

ALTER TABLE "override_log"
  ADD CONSTRAINT "override_log_pharmacy_id_fkey"
  FOREIGN KEY ("pharmacy_id")
  REFERENCES "pharmacies"("id")
  ON DELETE RESTRICT;
