ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "last_supplier_id" TEXT;

CREATE TABLE IF NOT EXISTS "stock_orders" (
  "id" TEXT NOT NULL,
  "pharmacy_id" TEXT NOT NULL,
  "order_number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "expected_by" TIMESTAMP(3),
  "submitted_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stock_order_items" (
  "id" TEXT NOT NULL,
  "stock_order_id" TEXT NOT NULL,
  "product_id" TEXT,
  "product_name" TEXT NOT NULL,
  "generic_name" TEXT,
  "strength" TEXT,
  "dosage_form" TEXT,
  "supplier_id" TEXT,
  "quantity_ordered" INTEGER NOT NULL,
  "quantity_received" INTEGER NOT NULL DEFAULT 0,
  "expected_unit_cost" DECIMAL(12,2),
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_orders_pharmacy_order_number_key"
  ON "stock_orders" ("pharmacy_id", "order_number");

CREATE INDEX IF NOT EXISTS "products_last_supplier_id_idx"
  ON "products" ("last_supplier_id");

CREATE INDEX IF NOT EXISTS "stock_orders_pharmacy_status_idx"
  ON "stock_orders" ("pharmacy_id", "status");

CREATE INDEX IF NOT EXISTS "stock_orders_pharmacy_created_at_idx"
  ON "stock_orders" ("pharmacy_id", "created_at");

CREATE INDEX IF NOT EXISTS "stock_order_items_order_idx"
  ON "stock_order_items" ("stock_order_id");

CREATE INDEX IF NOT EXISTS "stock_order_items_product_idx"
  ON "stock_order_items" ("product_id");

CREATE INDEX IF NOT EXISTS "stock_order_items_supplier_idx"
  ON "stock_order_items" ("supplier_id");

ALTER TABLE "products"
  ADD CONSTRAINT "products_last_supplier_id_fkey"
  FOREIGN KEY ("last_supplier_id") REFERENCES "suppliers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_orders"
  ADD CONSTRAINT "stock_orders_pharmacy_id_fkey"
  FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_orders"
  ADD CONSTRAINT "stock_orders_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_order_items"
  ADD CONSTRAINT "stock_order_items_stock_order_id_fkey"
  FOREIGN KEY ("stock_order_id") REFERENCES "stock_orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_order_items"
  ADD CONSTRAINT "stock_order_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_order_items"
  ADD CONSTRAINT "stock_order_items_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
