# CODEX Task Gap Focus

## Scope

Close concrete gaps identified from `CODEX_TASKS.md` without rewriting existing MVP flows.

## Current Pass

- [x] Fix Task 11 route mismatch for Controlled Substances TMDA Reporting.
- [x] Preserve the existing controlled-drugs operational register under a non-conflicting protected route.
- [x] Fix Task 6 / M4 patient shortcut behavior so patient search is frontend-only and session-memory only.
- [x] Implement Task 3 / A16 enterprise inter-branch stock transfer endpoint.
- [x] Return eligible enterprise outlets for multi-outlet transfers.
- [x] Add PostgreSQL trigram search indexes for instant medicine/product lookup.
- [x] Keep one- and two-letter medicine suggestions prefix-only to avoid broad fallback scans.
- [x] Limit dispensing and receive medicine text search to generic and brand names.
- [x] Re-run typechecks for touched frontend and backend code.
- [x] Re-run production frontend build.
- [x] Re-run backend typecheck after inter-branch transfer changes.
- [x] Add anonymous safety event retention for dispensing safety reviews.
- [x] Add pharmacy-level and APOTEKH Office aggregate safety impact reporting.
- [x] Prove Task 3 offline receive acceptance with targeted Playwright coverage.
- [x] Prove Task 5 warm-cache five-drug safety review stays under 500ms.
- [x] Prove Task 8 dispenser denial on wholesale workspace with targeted Playwright coverage.
- [x] Re-run backend build and frontend typecheck after safety/reporting changes.

## Out Of Scope For This Pass

- Full G1-G55 reports completion.
- Provider credential setup for Resend, Africa's Talking, or WhatsApp.
- Expanding backend coverage to 80%.
