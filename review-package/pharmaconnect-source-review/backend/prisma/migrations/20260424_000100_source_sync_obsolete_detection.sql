DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceSyncChangeType') THEN
    ALTER TYPE "SourceSyncChangeType" ADD VALUE IF NOT EXISTS 'SOURCE_NOT_MONITORED';
  END IF;
END
$$;
