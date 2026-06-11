-- Migration: supplier_portal
-- Creates SupplierPortalToken and SupplierPortalLineItem tables for Tier 2
-- wholesaler integration (tokenized order-confirmation portal).

CREATE TYPE "SupplierPortalStatus" AS ENUM (
  'PENDING',
  'VIEWED',
  'CONFIRMED',
  'PARTIALLY_CONFIRMED',
  'REJECTED',
  'EXPIRED'
);

CREATE TABLE "supplier_portal_tokens" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "token"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "stock_order_id" TEXT         NOT NULL,
  "pharmacy_id"    TEXT         NOT NULL,
  "pharmacy_name"  TEXT         NOT NULL,
  "supplier_name"  TEXT         NOT NULL,
  "supplier_phone" TEXT,
  "supplier_email" TEXT,
  "status"         "SupplierPortalStatus" NOT NULL DEFAULT 'PENDING',
  "supplier_notes" TEXT,
  "delivery_date"  TIMESTAMPTZ,
  "viewed_at"      TIMESTAMPTZ,
  "responded_at"   TIMESTAMPTZ,
  "expires_at"     TIMESTAMPTZ NOT NULL,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "supplier_portal_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_portal_tokens_token_key" UNIQUE ("token"),
  CONSTRAINT "supplier_portal_tokens_stock_order_id_key" UNIQUE ("stock_order_id"),
  CONSTRAINT "supplier_portal_tokens_stock_order_fk"
    FOREIGN KEY ("stock_order_id") REFERENCES "stock_orders"("id") ON DELETE CASCADE,
  CONSTRAINT "supplier_portal_tokens_pharmacy_fk"
    FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE
);

CREATE INDEX "supplier_portal_tokens_token_idx"       ON "supplier_portal_tokens"("token");
CREATE INDEX "supplier_portal_tokens_stock_order_idx" ON "supplier_portal_tokens"("stock_order_id");
CREATE INDEX "supplier_portal_tokens_pharmacy_idx"    ON "supplier_portal_tokens"("pharmacy_id");

CREATE TABLE "supplier_portal_line_items" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "token_id"            UUID         NOT NULL,
  "stock_order_item_id" TEXT         NOT NULL,
  "product_name"        TEXT         NOT NULL,
  "generic_name"        TEXT,
  "strength"            TEXT,
  "dosage_form"         TEXT,
  "quantity_requested"  INT          NOT NULL,
  "quantity_confirmed"  INT,
  "unit_price"          NUMERIC(12,2),
  "available"           BOOLEAN      NOT NULL DEFAULT TRUE,
  "notes"               TEXT,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "supplier_portal_line_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_portal_line_items_token_fk"
    FOREIGN KEY ("token_id") REFERENCES "supplier_portal_tokens"("id") ON DELETE CASCADE
);

CREATE INDEX "supplier_portal_line_items_token_idx" ON "supplier_portal_line_items"("token_id");

-- Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'supplier_portal_tokens_updated_at'
  ) THEN
    CREATE TRIGGER supplier_portal_tokens_updated_at
      BEFORE UPDATE ON supplier_portal_tokens
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'supplier_portal_line_items_updated_at'
  ) THEN
    CREATE TRIGGER supplier_portal_line_items_updated_at
      BEFORE UPDATE ON supplier_portal_line_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
