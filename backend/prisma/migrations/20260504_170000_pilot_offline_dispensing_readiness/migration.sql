ALTER TABLE "stock_movements"
  ADD COLUMN IF NOT EXISTS "local_created_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "synced_at" TIMESTAMP(3);

UPDATE "stock_movements"
SET "synced_at" = COALESCE("synced_at", "createdAt")
WHERE "synced_at" IS NULL;

CREATE INDEX IF NOT EXISTS "stock_movements_pharmacy_local_created_at_idx"
  ON "stock_movements"("pharmacyId", "local_created_at");

ALTER TABLE "dispensing_events"
  ADD COLUMN IF NOT EXISTS "local_session_id" TEXT,
  ADD COLUMN IF NOT EXISTS "local_created_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "synced_at" TIMESTAMP(3);

UPDATE "dispensing_events"
SET "synced_at" = COALESCE("synced_at", "created_at")
WHERE "synced_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "dispensing_events_pharmacy_local_session_key"
  ON "dispensing_events"("pharmacy_id", "local_session_id")
  WHERE "local_session_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "prescriptions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "dispensing_event_id" TEXT,
  "reference_number" TEXT,
  "photo_path" TEXT,
  "source" TEXT NOT NULL DEFAULT 'DISPENSING',
  "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prescriptions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "prescriptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "prescriptions_pharmacy_created_at_idx"
  ON "prescriptions"("pharmacy_id", "created_at");

CREATE INDEX IF NOT EXISTS "prescriptions_dispensing_event_id_idx"
  ON "prescriptions"("dispensing_event_id");

CREATE TABLE IF NOT EXISTS "dispensing_transactions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "local_session_id" TEXT,
  "dispensing_event_id" TEXT,
  "reference_number" TEXT,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "local_created_at" TIMESTAMP(3),
  "synced_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dispensing_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dispensing_transactions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "dispensing_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "dispensing_transactions_pharmacy_local_session_key"
  ON "dispensing_transactions"("pharmacy_id", "local_session_id")
  WHERE "local_session_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "dispensing_transactions_pharmacy_created_at_idx"
  ON "dispensing_transactions"("pharmacy_id", "created_at");

CREATE INDEX IF NOT EXISTS "dispensing_transactions_event_id_idx"
  ON "dispensing_transactions"("dispensing_event_id");
