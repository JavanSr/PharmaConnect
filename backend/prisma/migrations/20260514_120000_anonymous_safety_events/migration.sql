CREATE TABLE IF NOT EXISTS "safety_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "user_id" TEXT,
  "dispensing_event_id" TEXT,
  "reference_number" TEXT,
  "event_type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "action_taken" TEXT NOT NULL DEFAULT 'WARNING_SHOWN',
  "drug_names" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "drug_classes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "product_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "age_band" TEXT,
  "pregnancy_flag" BOOLEAN NOT NULL DEFAULT FALSE,
  "breastfeeding_flag" BOOLEAN NOT NULL DEFAULT FALSE,
  "renal_flag" BOOLEAN NOT NULL DEFAULT FALSE,
  "hepatic_flag" BOOLEAN NOT NULL DEFAULT FALSE,
  "allergy_flag" BOOLEAN NOT NULL DEFAULT FALSE,
  "diagnosis_flag" BOOLEAN NOT NULL DEFAULT FALSE,
  "source" TEXT NOT NULL DEFAULT 'DISPENSING_CHECKOUT',
  "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "safety_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "safety_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "safety_events_pharmacy_created_at_idx" ON "safety_events" ("pharmacy_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "safety_events_type_created_at_idx" ON "safety_events" ("event_type", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "safety_events_severity_created_at_idx" ON "safety_events" ("severity", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "safety_events_drug_names_idx" ON "safety_events" USING GIN ("drug_names");
CREATE INDEX IF NOT EXISTS "safety_events_product_ids_idx" ON "safety_events" USING GIN ("product_ids");
