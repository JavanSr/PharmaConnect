-- Add email verification fields to User table
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "email_verified_at"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "email_verification_token"  VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "email_verification_expiry" TIMESTAMP(3);

-- Unique index on token (sparse — only non-null values are unique)
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_verification_token_key"
  ON "User" ("email_verification_token")
  WHERE "email_verification_token" IS NOT NULL;

-- Mark all existing users as already verified so they are not locked out
UPDATE "User" SET "email_verified_at" = NOW() WHERE "email_verified_at" IS NULL;
