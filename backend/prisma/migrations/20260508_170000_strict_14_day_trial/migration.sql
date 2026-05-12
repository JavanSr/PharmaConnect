ALTER TABLE "pharmacies"
  ALTER COLUMN "trial_ends_at" SET DEFAULT (now() + interval '14 days');

UPDATE "pharmacies"
SET
  "trial_ends_at" = LEAST("trial_ends_at", "createdAt" + interval '14 days'),
  "trial_active" = LEAST("trial_ends_at", "createdAt" + interval '14 days') >= now()
WHERE "status" = 'TRIAL';
