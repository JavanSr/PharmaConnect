-- Migration: pharmacy_links, wholesale_disputes, subscription_invoices
-- Run via: npx prisma migrate deploy (or apply manually)

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "PharmacyLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'DISSOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── pharmacy_links ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "pharmacy_links" (
  "id"               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "retail_id"        TEXT NOT NULL REFERENCES "pharmacies"("id") ON DELETE CASCADE,
  "wholesale_id"     TEXT NOT NULL REFERENCES "pharmacies"("id") ON DELETE CASCADE,
  "status"           "PharmacyLinkStatus" NOT NULL DEFAULT 'PENDING',
  "requested_by"     TEXT NOT NULL,
  "responded_by"     TEXT,
  "rejection_reason" TEXT,
  "dissolved_by"     TEXT,
  "dissolved_at"     TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "pharmacy_links_retail_wholesale_unique" UNIQUE ("retail_id", "wholesale_id")
);

CREATE INDEX IF NOT EXISTS "pharmacy_links_retail_idx"     ON "pharmacy_links" ("retail_id");
CREATE INDEX IF NOT EXISTS "pharmacy_links_wholesale_idx"  ON "pharmacy_links" ("wholesale_id");
CREATE INDEX IF NOT EXISTS "pharmacy_links_status_idx"     ON "pharmacy_links" ("status");

-- ─── wholesale_disputes ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "wholesale_disputes" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "order_id"          TEXT NOT NULL,
  "buyer_pharmacy_id" TEXT NOT NULL REFERENCES "pharmacies"("id") ON DELETE CASCADE,
  "seller_pharmacy_id" TEXT NOT NULL REFERENCES "pharmacies"("id") ON DELETE CASCADE,
  "status"            "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "description"       TEXT NOT NULL,
  "resolution"        TEXT,
  "reported_by"       TEXT NOT NULL,
  "resolved_by"       TEXT,
  "resolved_at"       TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "wholesale_disputes_order_idx"  ON "wholesale_disputes" ("order_id");
CREATE INDEX IF NOT EXISTS "wholesale_disputes_buyer_idx"  ON "wholesale_disputes" ("buyer_pharmacy_id");
CREATE INDEX IF NOT EXISTS "wholesale_disputes_status_idx" ON "wholesale_disputes" ("status");

CREATE TABLE IF NOT EXISTS "wholesale_dispute_items" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dispute_id"        TEXT NOT NULL REFERENCES "wholesale_disputes"("id") ON DELETE CASCADE,
  "product_id"        TEXT NOT NULL,
  "product_name"      TEXT NOT NULL,
  "quantity_ordered"  INTEGER NOT NULL,
  "quantity_received" INTEGER NOT NULL,
  "quantity_disputed" INTEGER NOT NULL,
  "unit_price"        NUMERIC(12,2) NOT NULL,
  "notes"             TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "wholesale_dispute_items_dispute_idx" ON "wholesale_dispute_items" ("dispute_id");

-- ─── subscription_invoices ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "subscription_invoices" (
  "id"                 TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pharmacy_id"        TEXT NOT NULL REFERENCES "pharmacies"("id") ON DELETE CASCADE,
  "payment_request_id" TEXT,
  "invoice_number"     TEXT NOT NULL UNIQUE,
  "period_from"        TIMESTAMPTZ NOT NULL,
  "period_to"          TIMESTAMPTZ NOT NULL,
  "tier"               "SubscriptionTier" NOT NULL,
  "billing_cycle"      "BillingCycle" NOT NULL,
  "subtotal"           NUMERIC(12,2) NOT NULL,
  "status"             "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issued_at"          TIMESTAMPTZ,
  "paid_at"            TIMESTAMPTZ,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "subscription_invoices_pharmacy_idx" ON "subscription_invoices" ("pharmacy_id");
CREATE INDEX IF NOT EXISTS "subscription_invoices_status_idx"   ON "subscription_invoices" ("status");
