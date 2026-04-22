CREATE TABLE IF NOT EXISTS "feature_telemetry" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "feature_key" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "metadata" JSONB,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feature_telemetry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feature_telemetry_pharmacy_created_at_idx"
  ON "feature_telemetry"("pharmacy_id", "created_at");

CREATE INDEX IF NOT EXISTS "feature_telemetry_feature_event_idx"
  ON "feature_telemetry"("feature_key", "event_type");

ALTER TABLE "feature_telemetry"
  ADD CONSTRAINT "feature_telemetry_pharmacy_id_fkey"
  FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feature_telemetry"
  ADD CONSTRAINT "feature_telemetry_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
