-- ─── Admin audit log ─────────────────────────────────────────────────────────
-- Tracks every action taken by SUPER_ADMIN in the admin panel.
-- Separate from the existing audit_log which logs pharmacy user actions.
CREATE TABLE IF NOT EXISTS "admin_audit_log" (
  "id"                  TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "admin_email"         TEXT        NOT NULL,
  "action"              TEXT        NOT NULL,
  "target_pharmacy_id"  TEXT,
  "details"             JSONB,
  "ip_address"          TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "admin_audit_log_action_idx"    ON "admin_audit_log" ("action");
CREATE INDEX IF NOT EXISTS "admin_audit_log_pharmacy_idx"  ON "admin_audit_log" ("target_pharmacy_id");
CREATE INDEX IF NOT EXISTS "admin_audit_log_created_idx"   ON "admin_audit_log" ("created_at" DESC);

-- ─── Admin-logged subscription payments ──────────────────────────────────────
-- Manually recorded payments (M-Pesa confirmations, bank transfers, cash).
-- Separate from subscription_payment_requests (pharmacy-initiated requests).
CREATE TABLE IF NOT EXISTS "subscription_payments" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id"   TEXT        NOT NULL,
  "amount_tzs"    INTEGER     NOT NULL CHECK ("amount_tzs" > 0),
  "payment_date"  DATE        NOT NULL,
  "method"        TEXT        NOT NULL,
  "reference"     TEXT,
  "notes"         TEXT,
  "logged_by"     TEXT        NOT NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "subscription_payments_pharmacy_idx"
  ON "subscription_payments" ("pharmacy_id", "payment_date" DESC);

-- ─── Per-pharmacy feature flags ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id"     TEXT        NOT NULL,
  "feature_key"     TEXT        NOT NULL,
  "enabled"         BOOLEAN     NOT NULL DEFAULT TRUE,
  "overridden_by"   TEXT,
  "overridden_at"   TIMESTAMPTZ,
  PRIMARY KEY ("id"),
  UNIQUE ("pharmacy_id", "feature_key"),
  FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "feature_flags_pharmacy_idx" ON "feature_flags" ("pharmacy_id");

-- ─── Global feature flags ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "global_feature_flags" (
  "feature_key"   TEXT        NOT NULL,
  "enabled"       BOOLEAN     NOT NULL DEFAULT TRUE,
  "updated_by"    TEXT,
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("feature_key")
);

-- Seed the known feature keys so they appear in the UI before any admin touches them
INSERT INTO "global_feature_flags" ("feature_key", "enabled") VALUES
  ('controlled_register',      true),
  ('orders_module',            true),
  ('analytics_module',         true),
  ('b2b_marketplace',          true),
  ('barcode_scanning',         true),
  ('drug_interaction_checker', true),
  ('offline_mode',             true),
  ('cpd_module',               true),
  ('owner_dashboard',          true)
ON CONFLICT ("feature_key") DO NOTHING;

-- ─── Admin broadcast messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "admin_messages" (
  "id"                TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "sent_by"           TEXT        NOT NULL,
  "recipient_filter"  JSONB       NOT NULL,
  "message_body"      TEXT        NOT NULL,
  "recipient_count"   INTEGER     NOT NULL DEFAULT 0,
  "sent_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id")
);

-- ─── Per-pharmacy notifications (from admin messages) ─────────────────────────
CREATE TABLE IF NOT EXISTS "pharmacy_notifications" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id"   TEXT        NOT NULL,
  "message_id"    TEXT,
  "message_body"  TEXT        NOT NULL,
  "read_at"       TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE,
  FOREIGN KEY ("message_id")  REFERENCES "admin_messages"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "pharmacy_notifications_pharmacy_idx"
  ON "pharmacy_notifications" ("pharmacy_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "pharmacy_notifications_unread_idx"
  ON "pharmacy_notifications" ("pharmacy_id") WHERE "read_at" IS NULL;

-- ─── Alter pharmacies ─────────────────────────────────────────────────────────
ALTER TABLE "pharmacies" ADD COLUMN IF NOT EXISTS "internal_notes" TEXT;
