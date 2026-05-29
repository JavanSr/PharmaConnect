-- Wholesale payment recording
CREATE TABLE IF NOT EXISTS "wholesale_payments" (
  "id"                  TEXT         NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "seller_pharmacy_id"  TEXT         NOT NULL,
  "buyer_pharmacy_id"   TEXT         NOT NULL,
  "invoice_id"          TEXT,
  "amount_tzs"          DECIMAL(14,2) NOT NULL CHECK ("amount_tzs" > 0),
  "payment_method"      TEXT         NOT NULL DEFAULT 'CASH',
  "payment_ref"         TEXT,
  "notes"               TEXT,
  "recorded_by"         TEXT         NOT NULL,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "wholesale_payments_seller_idx" ON "wholesale_payments" ("seller_pharmacy_id");
CREATE INDEX IF NOT EXISTS "wholesale_payments_buyer_idx"  ON "wholesale_payments" ("buyer_pharmacy_id");

-- Promotional / pricing schemes
CREATE TABLE IF NOT EXISTS "wholesale_schemes" (
  "id"                  TEXT         NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "seller_pharmacy_id"  TEXT         NOT NULL,
  "name"                TEXT         NOT NULL,
  "description"         TEXT,
  "scheme_type"         TEXT         NOT NULL,   -- FREE_GOODS | PERCENTAGE_DISCOUNT | FIXED_DISCOUNT
  "product_id"          TEXT,                    -- NULL = applies to all products
  "min_order_qty"       INTEGER      NOT NULL DEFAULT 1,
  "bonus_qty"           INTEGER,                 -- FREE_GOODS: free units per qualifying order
  "discount_pct"        DECIMAL(5,2),            -- PERCENTAGE_DISCOUNT: 0-100
  "discount_tzs"        DECIMAL(14,2),           -- FIXED_DISCOUNT: flat amount off line total
  "is_active"           BOOLEAN      NOT NULL DEFAULT true,
  "valid_from"          DATE         NOT NULL DEFAULT CURRENT_DATE,
  "valid_until"         DATE,
  "created_by"          TEXT         NOT NULL,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "wholesale_schemes_seller_active_idx" ON "wholesale_schemes" ("seller_pharmacy_id", "is_active");

-- Extend orders table to track applied scheme savings
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheme_savings_tzs"  DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "applied_scheme_ids"  JSONB         NOT NULL DEFAULT '[]';
