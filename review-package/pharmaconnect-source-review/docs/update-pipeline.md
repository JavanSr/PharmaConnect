# Update Pipeline

## Goal

Add a lightweight Phase 8 source update pipeline that can:

- check monitored source documents
- record each check as a run
- record per-source changes or failures
- expose an admin-readable update report

## Current scope

The first implementation monitors the seeded Tanzania and safety source documents:

- MSD Tanzania catalogue
- NEMLIT 2021
- WHO/Tanzania safety source documents already registered in seed data

The check currently compares:

- final resolved URL
- document version from monitored seed metadata
- response headers gathered from `HEAD` requests
- a stored fingerprint saved into `source_documents.checksum`
- for master catalog sources, a reconciliation snapshot of imported product count vs current source seed count
- for master catalog sources, a normalized imported-vs-source fingerprint comparison
- for safety sources, approved rule counts plus linked review-queue activity
- whether an active source document is no longer part of the monitored source list

## Stored history

Two new tables support reporting:

- `source_sync_runs`
- `source_sync_changes`

Each run records:

- start and finish time
- status
- who triggered the run
- how many sources were checked
- how many changes were detected

Each change records:

- source document
- change type
- summary
- previous value snapshot
- next value snapshot

Current change types:

- `NEW_SOURCE`
- `SOURCE_METADATA_UPDATED`
- `SOURCE_UNCHANGED`
- `SOURCE_CHECK_FAILED`
- `SOURCE_NOT_MONITORED`

## Interfaces

### CLI

Run:

`npm run source-sync:check`

### API

- `GET /api/v1/source-sync/runs`
- `POST /api/v1/source-sync/runs`

### UI

Settings -> `Source Updates`

Access is restricted to `SUPER_ADMIN`.

## Limitations

- master catalog reconciliation currently detects source-vs-import drift, but it does not yet classify exact adds, edits, and retirements row by row
- some publishers may not return rich `HEAD` metadata, so failures are logged for review
- MSD source breadth still depends on the curated fallback seed until a stable bulk-access path is confirmed
- safety-source reconciliation reports approved-rule coverage and pending review load, but it does not yet extract new clinical rules automatically
