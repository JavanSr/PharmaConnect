CREATE TYPE "SubscriptionPaymentRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

CREATE TABLE "subscription_payment_requests" (
  "id" TEXT NOT NULL,
  "pharmacy_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "requested_tier" "SubscriptionTier" NOT NULL,
  "billing_cycle" "BillingCycle" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "payment_method" TEXT NOT NULL,
  "transaction_ref" TEXT NOT NULL,
  "provider" TEXT,
  "provider_reference" TEXT,
  "checkout_url" TEXT,
  "payer_phone" TEXT,
  "note" TEXT,
  "status" "SubscriptionPaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "review_note" TEXT,
  "paid_until" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_payment_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_payment_requests_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "subscription_payment_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "subscription_payment_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "subscription_payment_requests_pharmacy_transaction_ref_key"
  ON "subscription_payment_requests" ("pharmacy_id", "transaction_ref");

CREATE INDEX "subscription_payment_requests_pharmacy_status_created_idx"
  ON "subscription_payment_requests" ("pharmacy_id", "status", "created_at");

CREATE INDEX "subscription_payment_requests_status_created_idx"
  ON "subscription_payment_requests" ("status", "created_at");
