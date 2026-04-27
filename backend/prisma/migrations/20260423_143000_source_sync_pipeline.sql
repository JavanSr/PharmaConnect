DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceSyncStatus') THEN
    CREATE TYPE "SourceSyncStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceSyncChangeType') THEN
    CREATE TYPE "SourceSyncChangeType" AS ENUM (
      'NEW_SOURCE',
      'SOURCE_METADATA_UPDATED',
      'SOURCE_UNCHANGED',
      'SOURCE_CHECK_FAILED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "source_sync_runs" (
  "id" TEXT PRIMARY KEY,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "status" "SourceSyncStatus" NOT NULL DEFAULT 'STARTED',
  "triggered_by" TEXT,
  "notes" TEXT,
  "sources_checked" INTEGER NOT NULL DEFAULT 0,
  "changes_detected" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source_document_id" TEXT,
  CONSTRAINT "source_sync_runs_source_document_id_fkey"
    FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "source_sync_changes" (
  "id" TEXT PRIMARY KEY,
  "sync_run_id" TEXT NOT NULL,
  "source_document_id" TEXT,
  "change_type" "SourceSyncChangeType" NOT NULL,
  "summary" TEXT NOT NULL,
  "previous_value" JSONB,
  "next_value" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "source_sync_changes_sync_run_id_fkey"
    FOREIGN KEY ("sync_run_id") REFERENCES "source_sync_runs"("id") ON DELETE CASCADE,
  CONSTRAINT "source_sync_changes_source_document_id_fkey"
    FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "source_sync_runs_status_started_at_idx"
  ON "source_sync_runs" ("status", "started_at");

CREATE INDEX IF NOT EXISTS "source_sync_changes_run_change_type_idx"
  ON "source_sync_changes" ("sync_run_id", "change_type");

CREATE INDEX IF NOT EXISTS "source_sync_changes_source_created_at_idx"
  ON "source_sync_changes" ("source_document_id", "created_at");
