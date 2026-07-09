-- B2B backorders: shortfall queue for partial fulfilment.
-- When a buyer submits an order with allowPartialFulfilment and the seller is
-- short on stock, the unshipped remainder lands here. Visible to both sides;
-- the seller fulfils it into a new order once stock arrives.

DO $$ BEGIN
  CREATE TYPE "B2bBackorderStatus" AS ENUM ('OPEN', 'FULFILLED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "b2b_backorders" (
  "id"                 TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "order_id"           TEXT NOT NULL,
  "order_number"       TEXT NOT NULL,
  "seller_pharmacy_id" TEXT NOT NULL,
  "buyer_pharmacy_id"  TEXT NOT NULL,
  "product_id"         TEXT NOT NULL,
  "product_name"       TEXT NOT NULL,
  "quantity"           INTEGER NOT NULL CHECK ("quantity" > 0),
  "unit_price"         DECIMAL(12,2) NOT NULL,
  "status"             "B2bBackorderStatus" NOT NULL DEFAULT 'OPEN',
  "fulfilled_order_id" TEXT,
  "fulfilled_at"       TIMESTAMPTZ,
  "cancelled_by"       TEXT,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "b2b_backorders_seller_pharmacy_id_status_idx"
  ON "b2b_backorders" ("seller_pharmacy_id", "status");
CREATE INDEX IF NOT EXISTS "b2b_backorders_buyer_pharmacy_id_status_idx"
  ON "b2b_backorders" ("buyer_pharmacy_id", "status");
CREATE INDEX IF NOT EXISTS "b2b_backorders_product_id_status_idx"
  ON "b2b_backorders" ("product_id", "status");
