-- Stockout alternatives — general-purpose therapeutic-class substitution
-- suggestions, triggered by "this drug has zero stock" at dispensing, not by
-- a clinical indication (contrast with stewardship_suggestions). Same
-- DRAFT-until-APPROVED governance.

CREATE TABLE IF NOT EXISTS "therapeutic_alternatives" (
  "id"                    TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "trigger_generic_name"  TEXT NOT NULL,
  "suggested_generic_name" TEXT NOT NULL,
  "therapeutic_category"  TEXT NOT NULL,
  "rationale"              TEXT NOT NULL,
  "source_citation"        TEXT NOT NULL,
  "review_status"          "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "therapeutic_alternatives_lookup_idx" ON "therapeutic_alternatives" ("trigger_generic_name", "review_status");
