-- Allow walk-in / unregistered buyers on manual wholesale orders
ALTER TABLE "orders" ALTER COLUMN "buyer_pharmacy_id" DROP NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "walkin_buyer_name" TEXT;

-- Add free-text notes to wholesale returns for context beyond the reason enum
ALTER TABLE "wholesale_returns" ADD COLUMN IF NOT EXISTS "notes" TEXT;
