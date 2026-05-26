-- Migration: add_grace_access
-- Adds GRACE status support and graceActivatedAt field to pharmacies.
--
-- GRACE is a new PharmacyAccountStatus that replaces the hard paywall for
-- lapsed subscriptions. A pharmacy in GRACE retains single-owner read access
-- to core dispensing features permanently — it is never cut off.
--
-- In SQLite, enum values are stored as plain text, so no ALTER TYPE is needed.
-- We only need to add the new column.

ALTER TABLE "pharmacies" ADD COLUMN "grace_activated_at" DATETIME;
