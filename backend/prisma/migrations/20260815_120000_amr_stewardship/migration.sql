-- AMR stewardship: optional, non-blocking indication capture at dispensing time
-- for AWaRe WATCH/RESERVE antibiotics, plus a reviewable Access-tier alternative
-- suggestion sourced from the Tanzania Standard Treatment Guidelines. Suggestions
-- are DRAFT until a platform pharmacist flips them to APPROVED — only APPROVED
-- rows are ever surfaced to a dispenser. The dispense-time signal itself is
-- captured as an anonymous SafetyEvent (event_type = 'AMR_INDICATION_CAPTURED'),
-- no new table needed for that half.

DO $$ BEGIN
  CREATE TYPE "StewardshipIndication" AS ENUM ('URTI', 'PNEUMONIA', 'UTI', 'STI', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "stewardship_suggestions" (
  "id"                     TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "trigger_generic_name"   TEXT NOT NULL,
  "indication"             "StewardshipIndication" NOT NULL,
  "suggested_generic_name" TEXT NOT NULL,
  "rationale"               TEXT NOT NULL,
  "source_citation"        TEXT NOT NULL DEFAULT 'Tanzania Standard Treatment Guidelines 2023',
  "review_status"          "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "stewardship_suggestions_lookup_idx"
  ON "stewardship_suggestions" ("trigger_generic_name", "indication", "review_status");
