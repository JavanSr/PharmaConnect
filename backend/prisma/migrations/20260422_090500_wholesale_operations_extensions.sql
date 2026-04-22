ALTER TABLE "wholesale_catalogue_pricing"
  ADD COLUMN IF NOT EXISTS "tier_prices" JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE "client_credit_limits"
  ADD COLUMN IF NOT EXISTS "block_new_orders" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "block_reason" TEXT;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "scheduled_delivery_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "delivery_window_label" TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_note" TEXT;

ALTER TABLE "vat_invoices"
  ADD COLUMN IF NOT EXISTS "efdms_status" TEXT NOT NULL DEFAULT 'STUBBED',
  ADD COLUMN IF NOT EXISTS "efdms_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "efdms_payload" JSONB,
  ADD COLUMN IF NOT EXISTS "efdms_synced_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "orders_scheduled_delivery_at_idx"
  ON "orders" ("scheduled_delivery_at");
