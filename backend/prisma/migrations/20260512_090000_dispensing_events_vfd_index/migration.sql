-- Partial index for VFD retry job: only indexes PENDING rows, which is the
-- only status the retry job ever queries. Keeps the index tiny as events move
-- to SUBMITTED/FAILED and are no longer included.
CREATE INDEX IF NOT EXISTS "dispensing_events_vfd_pending_idx"
  ON "dispensing_events" ("created_at" ASC)
  WHERE "vfd_status" = 'PENDING';

-- General pharmacy + date index for list/history queries on dispensing_events.
CREATE INDEX IF NOT EXISTS "dispensing_events_pharmacy_created_at_idx"
  ON "dispensing_events" ("pharmacy_id", "created_at" DESC);
