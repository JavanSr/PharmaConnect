-- Chat Room V1 — cross-pharmacy regional community. Deliberately not
-- pharmacy-scoped (distinct from the unused chat_threads/chat_messages
-- forum tables): membership carries user_type and is_apotekh_customer
-- independently of the users table so a future non-APOTEKH registration
-- path (Phase 2 knowledge-community opening) needs no schema change.

DO $$ BEGIN
  CREATE TYPE "ChatRoomKind" AS ENUM ('NATIONAL', 'REGIONAL', 'DRUG_ALERTS', 'CLINICAL_CASES', 'STOCK_HELP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "chat_rooms" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "slug"         TEXT NOT NULL UNIQUE,
  "name"         TEXT NOT NULL,
  "kind"         "ChatRoomKind" NOT NULL,
  "region"       TEXT,
  "description"  TEXT,
  "is_read_only" BOOLEAN NOT NULL DEFAULT false,
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chat_room_memberships" (
  "id"                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "room_id"             TEXT NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
  "user_id"             TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_type"           TEXT NOT NULL,
  "is_apotekh_customer" BOOLEAN NOT NULL DEFAULT true,
  "joined_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("room_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "chat_room_messages" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "room_id"           TEXT NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
  "author_id"         TEXT NOT NULL REFERENCES "users"("id"),
  "body"              TEXT NOT NULL,
  "linked_drug_name"  TEXT,
  "is_system_message" BOOLEAN NOT NULL DEFAULT false,
  "is_flagged"        BOOLEAN NOT NULL DEFAULT false,
  "is_removed"        BOOLEAN NOT NULL DEFAULT false,
  "removed_by"        TEXT,
  "removed_reason"    TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "chat_room_messages_room_created_idx" ON "chat_room_messages" ("room_id", "created_at");
