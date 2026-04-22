CREATE TABLE IF NOT EXISTS public."ai_counselling_cache" (
  "id" TEXT NOT NULL,
  "pharmacy_id" TEXT NOT NULL,
  "rule_key" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "drug_name" TEXT NOT NULL,
  "flags_hash" TEXT NOT NULL,
  "flags" JSONB NOT NULL,
  "suggestion_text" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'RULE_TEMPLATE',
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_counselling_cache_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_counselling_cache_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES public."pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_counselling_cache_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES public."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_counselling_cache_unique_rule"
  ON public."ai_counselling_cache"("pharmacy_id", "rule_key", "severity", "drug_name", "flags_hash");

CREATE INDEX IF NOT EXISTS "ai_counselling_cache_pharmacy_created_at_idx"
  ON public."ai_counselling_cache"("pharmacy_id", "created_at");
