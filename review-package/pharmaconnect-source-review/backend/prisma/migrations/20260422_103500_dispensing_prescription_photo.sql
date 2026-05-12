ALTER TABLE "dispensing_events"
  ADD COLUMN IF NOT EXISTS "prescription_photo_path" TEXT;
