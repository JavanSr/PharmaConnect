CREATE INDEX IF NOT EXISTS "products_pharmacy_active_name_idx"
  ON "products"("pharmacyId", "isActive", "name");

CREATE INDEX IF NOT EXISTS "batches_pharmacy_expiry_received_idx"
  ON "batches"("pharmacyId", "expiryDate", "receivedAt");

CREATE INDEX IF NOT EXISTS "batches_pharmacy_product_quantity_idx"
  ON "batches"("pharmacyId", "productId", "quantityRemaining");

CREATE INDEX IF NOT EXISTS "stock_movements_pharmacy_created_at_idx"
  ON "stock_movements"("pharmacyId", "createdAt");

CREATE INDEX IF NOT EXISTS "stock_movements_pharmacy_type_created_at_idx"
  ON "stock_movements"("pharmacyId", "type", "createdAt");
