-- Documentation catch-up, not new functionality. "p2p_orders" and
-- "p2p_order_items" were applied directly against the database on
-- 2026-05-23 (migration name "20260523_185000_add_p2p_marketplace_models")
-- without the migration file ever being committed to git — discovered via
-- `prisma migrate status` showing an applied migration with no local
-- counterpart. This migration recreates that structure (IF NOT EXISTS, so a
-- no-op against the existing live database) purely so it is finally tracked
-- in version control and Prisma's schema.
--
-- Zero rows, zero code references anywhere in the app as of this commit.
-- See the model comment on P2pOrder in schema.prisma before building
-- anything on top of this — the current documented product policy is a
-- closed B2B ordering network, not open peer-to-peer retail trading.

CREATE TABLE IF NOT EXISTS "p2p_orders" (
  "id"                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "buyer_pharmacy_id"   TEXT NOT NULL REFERENCES "pharmacies"("id"),
  "seller_pharmacy_id"  TEXT NOT NULL REFERENCES "pharmacies"("id"),
  "order_number"        TEXT NOT NULL,
  "status"              TEXT NOT NULL,
  "total_amount"        DECIMAL(12,2) NOT NULL,
  "notes"               TEXT,
  "submitted_at"        TIMESTAMP,
  "confirmed_at"        TIMESTAMP,
  "ready_at"            TIMESTAMP,
  "completed_at"        TIMESTAMP,
  "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "p2p_orders_order_number_key" ON "p2p_orders" ("order_number");
CREATE INDEX IF NOT EXISTS "p2p_orders_buyer_status_idx" ON "p2p_orders" ("buyer_pharmacy_id", "status");
CREATE INDEX IF NOT EXISTS "p2p_orders_seller_status_idx" ON "p2p_orders" ("seller_pharmacy_id", "status");
CREATE INDEX IF NOT EXISTS "p2p_orders_created_at_idx" ON "p2p_orders" ("created_at");

CREATE TABLE IF NOT EXISTS "p2p_order_items" (
  "id"                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "p2p_order_id"        TEXT NOT NULL REFERENCES "p2p_orders"("id") ON DELETE CASCADE,
  "product_id"          TEXT NOT NULL REFERENCES "products"("id"),
  "quantity_ordered"    INTEGER NOT NULL,
  "quantity_confirmed"  INTEGER NOT NULL,
  "unit_price"          DECIMAL(12,2) NOT NULL,
  "status"              TEXT NOT NULL,
  "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "p2p_order_items_order_idx" ON "p2p_order_items" ("p2p_order_id");
CREATE INDEX IF NOT EXISTS "p2p_order_items_product_idx" ON "p2p_order_items" ("product_id");
