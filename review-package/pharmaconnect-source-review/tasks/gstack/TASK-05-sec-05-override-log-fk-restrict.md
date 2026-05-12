# TASK-05 — SEC-05: Fix Override Log Pharmacy FK (CASCADE → RESTRICT)

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

HIGH

## Problem

`override_log.pharmacy_id` uses `ON DELETE CASCADE`. When a pharmacy row is deleted,
all its override log records are silently wiped — bypassing the
`no_delete_override_log` trigger that is supposed to make these records permanent.
The CLAUDE.md explicitly requires override log records to be permanent medical records
that cannot be deleted by any role.

---

## Scope

One new migration SQL file only. Do not touch the Prisma schema or any router.

---

## Changes

Create `backend/prisma/migrations/YYYYMMDD_000000_fix_override_log_fk/migration.sql`
(replace YYYYMMDD with today's date):

```sql
-- Fix: override_log pharmacy FK must be RESTRICT, not CASCADE.
-- CASCADE bypasses the no_delete_override_log trigger, silently destroying medical records.

ALTER TABLE "override_log"
  DROP CONSTRAINT "override_log_pharmacy_id_fkey";

ALTER TABLE "override_log"
  ADD CONSTRAINT "override_log_pharmacy_id_fkey"
  FOREIGN KEY ("pharmacy_id")
  REFERENCES "pharmacies"("id")
  ON DELETE RESTRICT;
```

---

## Acceptance Criteria

- `DELETE FROM pharmacies WHERE id = '<id-with-override-log-rows>'` raises a foreign key
  violation error rather than silently deleting rows.
- The `prevent_override_log_delete` trigger and function are untouched.
- No other FK constraints on `override_log` are modified.
