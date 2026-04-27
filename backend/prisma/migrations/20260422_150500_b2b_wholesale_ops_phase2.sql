CREATE SEQUENCE IF NOT EXISTS "credit_note_number_seq" START 1;

CREATE TABLE IF NOT EXISTS "wholesale_returns" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "order_id" TEXT NOT NULL,
  "outlet_id" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "lines" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "credit_note_number" TEXT,
  "credit_amount_tzs" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "wholesale_returns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wholesale_returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wholesale_returns_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wholesale_returns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "wholesale_returns_reason_check" CHECK ("reason" IN ('DAMAGED', 'WRONG_ITEM', 'EXPIRED', 'OTHER')),
  CONSTRAINT "wholesale_returns_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'CREDITED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "wholesale_returns_credit_note_number_key"
  ON "wholesale_returns" ("credit_note_number")
  WHERE "credit_note_number" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "wholesale_returns_outlet_status_idx"
  ON "wholesale_returns" ("outlet_id", "status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "supplier_orders" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "outlet_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "lines" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "expected_delivery_date" TIMESTAMP(3),
  "notes" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_orders_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "supplier_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "supplier_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_orders_status_check" CHECK ("status" IN ('DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS "supplier_orders_outlet_status_idx"
  ON "supplier_orders" ("outlet_id", "status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "delivery_manifests" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "outlet_id" TEXT NOT NULL,
  "delivery_staff_id" TEXT NOT NULL,
  "orders" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "route" TEXT NOT NULL,
  "vehicle_reg" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "departed_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_manifests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_manifests_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "delivery_manifests_delivery_staff_id_fkey" FOREIGN KEY ("delivery_staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "delivery_manifests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "delivery_manifests_status_check" CHECK ("status" IN ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'PARTIAL'))
);

CREATE INDEX IF NOT EXISTS "delivery_manifests_outlet_status_idx"
  ON "delivery_manifests" ("outlet_id", "status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "delivery_manifests_delivery_staff_idx"
  ON "delivery_manifests" ("delivery_staff_id", "status");

CREATE TABLE IF NOT EXISTS "client_price_overrides" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "wholesale_outlet_id" TEXT NOT NULL,
  "client_outlet_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "override_price_tzs" INTEGER NOT NULL,
  "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valid_until" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_price_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_price_overrides_wholesale_outlet_id_fkey" FOREIGN KEY ("wholesale_outlet_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_price_overrides_client_outlet_id_fkey" FOREIGN KEY ("client_outlet_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_price_overrides_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_price_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "client_price_overrides_valid_range_check" CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from")
);

CREATE UNIQUE INDEX IF NOT EXISTS "client_price_overrides_unique_client_product"
  ON "client_price_overrides" ("wholesale_outlet_id", "client_outlet_id", "product_id");

CREATE INDEX IF NOT EXISTS "client_price_overrides_active_lookup_idx"
  ON "client_price_overrides" ("wholesale_outlet_id", "client_outlet_id", "valid_from", "valid_until");
