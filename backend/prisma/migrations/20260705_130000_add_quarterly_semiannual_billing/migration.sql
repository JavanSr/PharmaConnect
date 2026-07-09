-- Add 3-month and 6-month billing cycles (pharmacies resist annual but want
-- less friction than monthly — matches local market convention).
ALTER TYPE "BillingCycle" ADD VALUE IF NOT EXISTS 'QUARTERLY';
ALTER TYPE "BillingCycle" ADD VALUE IF NOT EXISTS 'SEMI_ANNUAL';
