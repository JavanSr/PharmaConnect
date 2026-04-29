ALTER TABLE public."pharmacies"
  ALTER COLUMN "trial_ends_at" SET DEFAULT (now() + interval '30 days');

UPDATE public."pharmacies"
SET
  "trial_starts_at" = "createdAt",
  "trial_ends_at" = "createdAt" + interval '30 days',
  "trial_active" = ("createdAt" + interval '30 days') >= now()
WHERE "status" = 'TRIAL'
  AND "trial_ends_at" <= "trial_starts_at" + interval '1 minute';
