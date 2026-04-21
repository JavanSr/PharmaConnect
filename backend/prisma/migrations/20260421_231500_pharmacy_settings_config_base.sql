CREATE TABLE IF NOT EXISTS "pharmacy_settings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pharmacy_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pharmacy_settings_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pharmacy_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_settings_pharmacy_key_key"
  ON "pharmacy_settings" ("pharmacy_id", "key");

CREATE INDEX IF NOT EXISTS "pharmacy_settings_pharmacy_id_idx"
  ON "pharmacy_settings" ("pharmacy_id");
