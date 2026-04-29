-- Repair production databases where the email verification migration touched
-- a legacy "User" table instead of the mapped "users" table.
ALTER TABLE public."users"
  ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "email_verification_token" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "email_verification_expiry" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_verification_token_key"
  ON public."users" ("email_verification_token");

UPDATE public."users"
SET "email_verified_at" = NOW()
WHERE "email_verified_at" IS NULL;
