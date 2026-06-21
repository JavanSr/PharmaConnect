-- Allow supplier_orders without a registered supplier (walk-in / unregistered)
ALTER TABLE "supplier_orders"
  ALTER COLUMN "supplier_id" DROP NOT NULL;

ALTER TABLE "supplier_orders"
  ADD COLUMN IF NOT EXISTS "walkin_supplier_name" TEXT;

ALTER TABLE "supplier_orders"
  ADD COLUMN IF NOT EXISTS "walkin_supplier_phone" TEXT;
