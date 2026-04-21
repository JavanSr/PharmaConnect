CREATE TABLE IF NOT EXISTS "stock_adjustment_suggestions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "batch_id" TEXT,
  "quantity_delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "photo_path" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_by" TEXT NOT NULL,
  "reviewed_by" TEXT,
  "approved_quantity_delta" INTEGER,
  "review_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  CONSTRAINT "stock_adjustment_suggestions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_adjustment_suggestions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_adjustment_suggestions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_adjustment_suggestions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "stock_adjustment_suggestions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "stock_adjustment_suggestions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "stock_adjustment_suggestions_pharmacy_status_idx"
  ON "stock_adjustment_suggestions" ("pharmacy_id", "status");

CREATE INDEX IF NOT EXISTS "stock_adjustment_suggestions_product_created_at_idx"
  ON "stock_adjustment_suggestions" ("product_id", "created_at");
