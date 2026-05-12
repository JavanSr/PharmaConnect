# Pilot Readiness Offline Dispensing

## Scope

Implement the pilot-critical offline dispensing path additively. Preserve the current MVP checkout, stock intake, inventory, and conflict review flows.

## Tasks

- Add `localCreatedAt` and `syncedAt` to `StockMovement`.
- Capture `localTimestamp` on app-level offline writes.
- Add a local inventory delta applier for dispensing UI stock correctness while offline.
- Queue whole dispensing sessions atomically in IndexedDB.
- Add `POST /api/v1/dispensing/sync-batch` for atomic session replay.
- Keep service-worker write handling passive; app-level IndexedDB is the source of truth for mutations.
- Purge queued writes after 7 days and warn users before data ages out.
- Improve conflict review with side-by-side local/server payloads from `sync_conflicts`.
- Add service-worker to app sync-status messaging.
- Reduce volatile API cache durations.
- Add a `Prescription` model and a lightweight `DispensingTransaction` schema for future normalized dispensing work.

## Out Of Scope For This Pass

- Replacing the existing `dispensing_events` flow.
- A full offline-first mirror of every backend table.
- Moving all reporting to a dedicated dispensing transaction table.
