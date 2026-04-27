CREATE TABLE IF NOT EXISTS "data_review_audit_logs" (
  "id" TEXT PRIMARY KEY,
  "queue_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previous_status" "ReviewQueueStatus",
  "next_status" "ReviewQueueStatus",
  "reviewer_type" "ReviewerType",
  "actor_user_id" TEXT,
  "actor_role" TEXT,
  "pharmacy_id" TEXT,
  "note" TEXT,
  "payload_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "data_review_audit_logs_queue_id_fkey"
    FOREIGN KEY ("queue_id") REFERENCES "data_review_queue"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "data_review_audit_logs_queue_created_at_idx"
  ON "data_review_audit_logs" ("queue_id", "created_at");

CREATE INDEX IF NOT EXISTS "data_review_audit_logs_actor_created_at_idx"
  ON "data_review_audit_logs" ("actor_user_id", "created_at");
