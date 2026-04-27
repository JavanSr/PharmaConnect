CREATE TABLE IF NOT EXISTS "cold_chain_logs" (
  "id" TEXT NOT NULL,
  "pharmacy_id" TEXT NOT NULL,
  "product_id" TEXT,
  "logged_by" TEXT NOT NULL,
  "temperature_c" DECIMAL(5, 2) NOT NULL,
  "storage_unit" TEXT,
  "excursion" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cold_chain_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cold_chain_logs_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cold_chain_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cold_chain_logs_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "cold_chain_logs_pharmacy_logged_at_idx"
  ON "cold_chain_logs"("pharmacy_id", "logged_at");
