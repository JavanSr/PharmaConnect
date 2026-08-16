-- Migration: knowledge_cms_and_chat
-- Run: npx prisma migrate dev --name knowledge_cms_and_chat
-- Or apply manually against your Railway/Supabase PostgreSQL database.
--
-- SUPERSEDED 2026-08-16 — DO NOT RUN. Investigated after discovering this
-- file was never actually applied: step 1 (articles.html_content) is already
-- live in the database via a different path. Steps 2-5 (chat_threads /
-- chat_messages) built the "Community" feature, which was removed from the
-- app the same day the gap was found — it shipped with a frontend tab and a
-- live router, but this table-creation step never ran, so it 500'd on every
-- use since it was built. Replaced by ChatRoom / ChatRoomMessage (see
-- 20260816_130000_chat_room_v1), which now lives inside Knowledge Hub.
-- Left in place as a historical record rather than deleted.

-- 1. Add html_content column to articles (if not already present)
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "html_content" TEXT;

-- 2. Create chat_threads table
CREATE TABLE IF NOT EXISTS "chat_threads" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "pharmacy_id"  UUID         NOT NULL REFERENCES "pharmacies"("id") ON DELETE CASCADE,
  "author_id"    UUID         NOT NULL REFERENCES "users"("id"),
  "title"        TEXT         NOT NULL,
  "body"         TEXT         NOT NULL,
  "category"     TEXT         NOT NULL DEFAULT 'GENERAL',
  "is_pinned"    BOOLEAN      NOT NULL DEFAULT false,
  "is_locked"    BOOLEAN      NOT NULL DEFAULT false,
  "view_count"   INTEGER      NOT NULL DEFAULT 0,
  "reply_count"  INTEGER      NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. Create chat_messages table
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "thread_id"   UUID         NOT NULL REFERENCES "chat_threads"("id") ON DELETE CASCADE,
  "author_id"   UUID         NOT NULL REFERENCES "users"("id"),
  "body"        TEXT         NOT NULL,
  "is_edited"   BOOLEAN      NOT NULL DEFAULT false,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_chat_threads_pharmacy_id" ON "chat_threads"("pharmacy_id");
CREATE INDEX IF NOT EXISTS "idx_chat_threads_created_at"  ON "chat_threads"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_chat_messages_thread_id"  ON "chat_messages"("thread_id");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_created_at" ON "chat_messages"("created_at" ASC);

-- 5. Auto-update updated_at on chat_threads
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW."updated_at" = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_chat_threads_updated_at') THEN
    CREATE TRIGGER set_chat_threads_updated_at
      BEFORE UPDATE ON "chat_threads"
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_chat_messages_updated_at') THEN
    CREATE TRIGGER set_chat_messages_updated_at
      BEFORE UPDATE ON "chat_messages"
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;
