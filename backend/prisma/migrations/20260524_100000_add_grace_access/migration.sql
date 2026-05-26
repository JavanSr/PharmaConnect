-- Migration: add_grace_access
-- Adds GRACE status support and graceActivatedAt field to pharmacies.
--
-- GRACE is a new PharmacyAccountStatus that replaces the hard paywall for
-- lapsed subscriptions. A pharmacy in GRACE retains single-owner read access
-- to core dispensing features — it is never cut off.

-- Add GRACE to the existing PharmacyAccountStatus enum.
-- IF NOT EXISTS guard is safe on PostgreSQL 9.3+ (Railway uses 14+).
ALTER TYPE "PharmacyAccountStatus" ADD VALUE IF NOT EXISTS 'GRACE';

-- Add the graceActivatedAt timestamp column.
-- IF NOT EXISTS prevents a crash if the migration was partially applied.
ALTER TABLE "pharmacies" ADD COLUMN IF NOT EXISTS "grace_activated_at" TIMESTAMPTZ;
