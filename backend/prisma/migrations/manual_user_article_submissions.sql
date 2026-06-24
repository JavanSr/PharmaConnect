-- Migration: User article submissions (Medium-like contributor model)
-- Run directly against Railway/Supabase PostgreSQL

ALTER TABLE "articles"
  ADD COLUMN IF NOT EXISTS "submitted_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "submission_status"    TEXT CHECK ("submission_status" IN ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED')),
  ADD COLUMN IF NOT EXISTS "rejection_note"       TEXT,
  ADD COLUMN IF NOT EXISTS "author_bio"           TEXT;

CREATE INDEX IF NOT EXISTS "articles_submission_status_idx" ON "articles"("submission_status");
CREATE INDEX IF NOT EXISTS "articles_submitted_by_idx"      ON "articles"("submitted_by_user_id");
