CREATE TABLE IF NOT EXISTS "barcode_scan_telemetry" (
  "id" TEXT NOT NULL,
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

ALTER TABLE "barcode_scan_telemetry"
  ADD CONSTRAINT "barcode_scan_telemetry_pharmacy_id_fkey"
  FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "barcode_scan_telemetry"
  ADD CONSTRAINT "barcode_scan_telemetry_matched_product_id_fkey"
  FOREIGN KEY ("matched_product_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "barcode_scan_telemetry"
  ADD CONSTRAINT "barcode_scan_telemetry_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
