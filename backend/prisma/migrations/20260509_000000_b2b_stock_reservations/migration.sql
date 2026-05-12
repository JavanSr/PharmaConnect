-- B2B stock reservations: tracks wholesale-reserved stock per product per seller
-- Released when order is CANCELLED or COMPLETED

CREATE TABLE IF NOT EXISTS "b2b_stock_reservations" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id"            UUID NOT NULL,
  "product_id"          TEXT NOT NULL,
  "seller_pharmacy_id"  TEXT NOT NULL,
  "reserved_qty"        INTEGER NOT NULL CHECK ("reserved_qty" > 0),
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "b2b_stock_reservations_order_product_unique" UNIQUE ("order_id", "product_id")
);

CREATE INDEX IF NOT EXISTS "b2b_stock_reservations_seller_product_idx"
  ON "b2b_stock_reservations" ("seller_pharmacy_id", "product_id");

CREATE INDEX IF NOT EXISTS "b2b_stock_reservations_order_idx"
  ON "b2b_stock_reservations" ("order_id");
