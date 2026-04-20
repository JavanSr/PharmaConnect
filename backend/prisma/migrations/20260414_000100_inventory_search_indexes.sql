CREATE INDEX IF NOT EXISTS "products_pharmacy_barcode_idx"
ON "products" ("pharmacyId", "barcode");

CREATE INDEX IF NOT EXISTS "products_pharmacy_sku_idx"
ON "products" ("pharmacyId", "sku");
