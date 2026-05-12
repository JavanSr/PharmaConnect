CREATE TABLE IF NOT EXISTS "product_barcode_mappings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "barcode" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "gs1_payload" JSONB,
  "shared_to_network" BOOLEAN NOT NULL DEFAULT FALSE,
  "network_confirmations" INTEGER NOT NULL DEFAULT 0,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_barcode_mappings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "product_barcode_mappings"
  ADD COLUMN IF NOT EXISTS "shared_to_network" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "network_confirmations" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "product_barcode_mappings_pharmacy_barcode_key"
  ON "product_barcode_mappings"("pharmacy_id", "barcode");

CREATE INDEX IF NOT EXISTS "product_barcode_mappings_product_id_idx"
  ON "product_barcode_mappings"("product_id");

CREATE INDEX IF NOT EXISTS "product_barcode_mappings_barcode_shared_idx"
  ON "product_barcode_mappings"("barcode", "shared_to_network");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_barcode_mappings_pharmacy_id_fkey'
  ) THEN
    ALTER TABLE "product_barcode_mappings"
      ADD CONSTRAINT "product_barcode_mappings_pharmacy_id_fkey"
      FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_barcode_mappings_product_id_fkey'
  ) THEN
    ALTER TABLE "product_barcode_mappings"
      ADD CONSTRAINT "product_barcode_mappings_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_barcode_mappings_created_by_fkey'
  ) THEN
    ALTER TABLE "product_barcode_mappings"
      ADD CONSTRAINT "product_barcode_mappings_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "barcode_scan_telemetry" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "barcode" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "matched_product_id" TEXT,
  "metadata" JSONB,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "barcode_scan_telemetry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "barcode_scan_telemetry_pharmacy_created_at_idx"
  ON "barcode_scan_telemetry"("pharmacy_id", "created_at");

CREATE INDEX IF NOT EXISTS "barcode_scan_telemetry_source_result_idx"
  ON "barcode_scan_telemetry"("source", "result");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'barcode_scan_telemetry_pharmacy_id_fkey'
  ) THEN
    ALTER TABLE "barcode_scan_telemetry"
      ADD CONSTRAINT "barcode_scan_telemetry_pharmacy_id_fkey"
      FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'barcode_scan_telemetry_matched_product_id_fkey'
  ) THEN
    ALTER TABLE "barcode_scan_telemetry"
      ADD CONSTRAINT "barcode_scan_telemetry_matched_product_id_fkey"
      FOREIGN KEY ("matched_product_id") REFERENCES "products"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'barcode_scan_telemetry_created_by_fkey'
  ) THEN
    ALTER TABLE "barcode_scan_telemetry"
      ADD CONSTRAINT "barcode_scan_telemetry_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
