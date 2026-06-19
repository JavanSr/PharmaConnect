-- Migration: perf_indexes
-- Adds missing indexes identified from Supabase Query Performance report.
-- All three are read-hot paths with no existing index coverage.

-- 1. Notifications inbox
--    Query: WHERE pharmacy_id = $1 AND (user_id = $2 OR user_id IS NULL) ORDER BY created_at DESC
--    1,051 calls in sample window; no index existed on this table.
CREATE INDEX IF NOT EXISTS "notifications_pharmacy_user_created_idx"
  ON "notifications" ("pharmacy_id", "user_id", "created_at" DESC);

-- 2. VFD retry job
--    Query: SELECT ... FROM dispensing_events WHERE vfd_status = 'PENDING' ORDER BY created_at ASC
--    5,705 calls; dispensing_events is a raw SQL table (not a Prisma model), so the
--    index is defined here rather than in schema.prisma.
CREATE INDEX IF NOT EXISTS "dispensing_events_vfd_status_created_idx"
  ON "dispensing_events" ("vfd_status", "created_at" ASC);

-- 3. drug_products ILIKE search (knowledge hub / dispensing search)
--    Query uses ILIKE on generic_name, product_name, tmda_registration_number.
--    B-tree indexes exist but cannot accelerate ILIKE — need GIN trigram indexes.
--    pg_trgm is enabled on all Supabase projects by default.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "drug_products_generic_name_trgm_idx"
  ON "drug_products" USING GIN ("generic_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "drug_products_product_name_trgm_idx"
  ON "drug_products" USING GIN ("product_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "drug_products_tmda_reg_trgm_idx"
  ON "drug_products" USING GIN ("tmda_registration_number" gin_trgm_ops);

-- product_aliases normalized_alias is already indexed with a B-tree; the ILIKE
-- on that column is inside an IN subquery, so the trigram index on drug_products
-- is the main win. If alias search is separately slow, add a trigram index here:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "product_aliases_alias_trgm_idx"
--   ON "product_aliases" USING GIN ("normalized_alias" gin_trgm_ops);
