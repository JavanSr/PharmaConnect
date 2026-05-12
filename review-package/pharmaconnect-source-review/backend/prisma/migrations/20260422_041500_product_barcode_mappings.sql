CREATE TABLE IF NOT EXISTS "product_barcode_mappings" (
  "id" TEXT NOT NULL,
  "pharmacy_id" TEXT NOT NULL,
  "barcode" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "gs1_payload" JSONB,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_barcode_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_barcode_mappings_pharmacy_barcode_key"
  ON "product_barcode_mappings"("pharmacy_id", "barcode");

CREATE INDEX IF NOT EXISTS "product_barcode_mappings_product_id_idx"
  ON "product_barcode_mappings"("product_id");

ALTER TABLE "product_barcode_mappings"
  ADD CONSTRAINT "product_barcode_mappings_pharmacy_id_fkey"
  FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_barcode_mappings"
  ADD CONSTRAINT "product_barcode_mappings_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_barcode_mappings"
  ADD CONSTRAINT "product_barcode_mappings_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
