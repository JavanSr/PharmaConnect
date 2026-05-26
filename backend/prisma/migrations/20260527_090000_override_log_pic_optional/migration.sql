-- Migration: make pic_user_id nullable on override_log
--
-- Reason: CLAUDE.md product design — "Override model: dispenser proceeds at own risk.
-- No Superintendent PIN required, no escalation."
-- The old schema required a PIC user ID (NOT NULL), which made it impossible to
-- create override logs without a PIC PIN, effectively disabling the entire feature.
--
-- pic_user_id is now optional. Existing records are unaffected (they already have
-- a value or the column holds a FK reference). The no_delete_override_log trigger
-- is unchanged — override records remain permanently immutable.

ALTER TABLE "override_log"
  ALTER COLUMN "pic_user_id" DROP NOT NULL;
