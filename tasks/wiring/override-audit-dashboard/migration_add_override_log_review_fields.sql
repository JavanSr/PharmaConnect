-- Migration: add_override_log_review_fields
-- Run via: npx prisma migrate dev --name add_override_log_review_fields
--
-- Adds review/flag fields to the existing OverrideLog table so the
-- dashboard can surface unflagged events and track who reviewed each one.

ALTER TABLE "OverrideLog"
  ADD COLUMN IF NOT EXISTS "flagged"      BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "flagReason"   TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedBy"   TEXT,          -- userId of reviewer
  ADD COLUMN IF NOT EXISTS "reviewedAt"   TIMESTAMP(3);
