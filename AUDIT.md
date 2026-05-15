# AUDIT.md

Audit date: 2026-04-13

Scope and evidence:
- Reviewed `CODEX_TASKS.md`, `CLAUDE.md`, `backend/prisma/schema.prisma`, existing Prisma migrations, mounted backend routers in `backend/src/index.ts`, backend route files under `backend/src/modules`, frontend routes in `frontend/src/App.tsx`, and current frontend module files under `frontend/src/modules`.
- Live database verification completed against the Supabase project on 2026-04-13. The Task 1 migration at `backend/prisma/migrations/20260413_183000_codex_task1_schema.sql` was applied successfully using the direct connection URL.
- Required database trigger checks were verified live on 2026-04-13:
  - `DELETE FROM override_log` raised `override_log records cannot be deleted`
  - `UPDATE dispensing_events SET total_amount = ...` raised `Core dispensing fields are immutable`
- Local compile verification is not included in this audit update. This pass focused on Task 1 database execution and live verification.

## Section 1 - Database tables

- `pharmacies`: EXISTS - live Task 1 table verified after migration, including subscription and trial fields.
- `users`: EXISTS - live Task 1 table verified after migration, including `pic_pin_hash` support and expanded role enum.
- `products`: EXISTS - live Task 1 table verified after migration, including hybrid and cold-chain fields.
- `suppliers`: EXISTS - live Task 1 table verified after migration.
- `batches`: EXISTS - live Task 1 table verified after migration.
- `stock_movements`: EXISTS - live Task 1 table verified after migration.
- `sync_conflicts`: EXISTS - live Task 1 table verified after migration.
- `compliance_items`: EXISTS - live Task 1 table verified after migration.
- `compliance_documents`: EXISTS - live Task 1 table verified after migration.
- `compliance_alerts`: EXISTS - live Task 1 table verified after migration.
- `staff_credentials`: EXISTS - live Task 1 table verified after migration.
- `inspection_checklists`: EXISTS - live Task 1 table verified after migration.
- `drug_database`: EXISTS - live Task 1 table verified after migration.
- `drug_interactions`: EXISTS - live Task 1 table verified after migration.
- `drug_contraindications`: EXISTS - live Task 1 table verified after migration.
- `override_log`: EXISTS - live Task 1 table verified after migration, and the delete-prevention trigger is active.
- `dispensing_events`: EXISTS - live Task 1 table verified after migration, and immutable core-field protection is active.
- `notifications`: EXISTS - live Task 1 table verified after migration.
- `notification_preferences`: EXISTS - live Task 1 table verified after migration.
- `alert_log`: EXISTS - live Task 1 table verified after migration.
- `articles`: EXISTS - live Task 1 table verified after migration.
- `bulletins`: EXISTS - live Task 1 table verified after migration.
- `publications`: EXISTS - live Task 1 table verified after migration.
- `courses`: EXISTS - live Task 1 table verified after migration.
- `course_enrolments`: EXISTS - live Task 1 table verified after migration.
- `cpd_activities`: EXISTS - live Task 1 table verified after migration.
- `email_subscribers`: EXISTS - live Task 1 table verified after migration.
- `wholesale_catalogues`: EXISTS - live Task 1 table verified after migration.
- `wholesale_catalogue_pricing`: EXISTS - live Task 1 table verified after migration.
- `orders`: EXISTS - live Task 1 table verified after migration.
- `client_credit_limits`: EXISTS - live Task 1 table verified after migration.
- `vat_invoices`: EXISTS - live Task 1 table verified after migration.
- `daily_closings`: EXISTS - live Task 1 table verified after migration.
- `staff_attendance`: EXISTS - live Task 1 table verified after migration.
- `predictions`: EXISTS - live Task 1 table verified after migration.
- `waitlist`: EXISTS - live Task 1 table verified after migration.
- `audit_log`: EXISTS - live Task 1 table verified after migration.

Legacy and out-of-spec database structures still present alongside the new Task 1 schema:
- PascalCase legacy tables from the older Supabase generation remain in the same database, including `Pharmacy`, `User`, `Product`, `Supplier`, `Batch`, `StockMovement`, `ComplianceItem`, `Article`, and `CpdActivity`.
- The older out-of-spec tables still exist as well: `refresh_tokens`, `drug_master`, `patients`, `dispensings`, `dispensing_items`, `nhif_claims`, and `nhif_claim_items`.

High-risk schema conflicts that still remain after Task 1:
- `patients` directly conflicts with RULE-03, which forbids persistent patient storage.
- `nhif_claims` and `nhif_claim_items` conflict with RULE-06, which says NHIF claims must remain placeholder-only for now.
- The live Supabase database now contains both the legacy PascalCase schema and the Task 1 snake_case schema, so later tasks should consolidate application access paths carefully to avoid writing into the wrong generation.

## Section 2 - API routes

Expected CODEX routes:

- `GET /api/v1/inventory/products`: EXISTS - mounted through the inventory router.
- `POST /api/v1/patient-safety/check-interactions`: MISSING - no `patient-safety` module or route found.
- `POST /api/v1/patient-safety/match-diagnosis`: MISSING - no `patient-safety` module or route found.
- `/api/v1/dispensing`: PARTIAL - dispensing logic exists, but it is mounted under out-of-spec `POST /api/v1/patients/dispense`, not the CODEX dispensing route family.
- `POST /api/v1/dispensing/daily-close`: MISSING - no route found.
- `POST /api/v1/knowledge/subscribe`: MISSING - no route found.
- `POST /api/v1/b2b/orders`: MISSING - no B2B module or route found.
- `GET /api/v1/b2b/orders/my-queue`: MISSING - no route found.
- `PATCH /api/v1/b2b/orders/:id/pick-items`: MISSING - no route found.
- `POST /api/v1/b2b/orders/:id/verify-items`: MISSING - no route found.
- `PATCH /api/v1/b2b/orders/:id/confirm-delivery`: MISSING - no route found.
- `GET /api/v1/attendance/my-records`: MISSING - no route found.
- `GET /api/v1/attendance/pharmacy-records`: MISSING - no route found.
- `GET /api/v1/notifications`: MISSING - no route found.
- `PATCH /api/v1/notifications/:id/read`: MISSING - no route found.
- `POST /api/v1/waitlist`: MISSING - no route found.

Mounted API areas currently present but outside the CODEX target state:
- `/api/v1/auth/*`
- `/api/v1/inventory/*`
- `/api/v1/compliance/*`
- `/api/v1/patients/*`
- `/api/v1/nhif/*`
- `/api/v1/cpd/*`
- `/api/v1/knowledge/*`
- `/api/v1/analytics/*`
- `/api/v1/settings/*`

Frontend/backend contract mismatches found in the current app:
- Frontend calls `/analytics/summary`, but backend exposes `/analytics/overview`.
- Frontend calls `/inventory/reports/low-stock`, but no backend route exists.
- Frontend calls `/inventory/drug-master/search`, but backend exposes `/inventory/drug-master`.
- Frontend calls `/compliance/health-score`, but no backend route exists.
- Frontend calls `/compliance/items/:id/documents`, but no backend route exists.
- Frontend calls `/compliance/inspection-checklists*`, but no backend route exists.
- Frontend calls `/patients/:id/history`, but no backend route exists.
- Frontend calls `/patients/icd10/search`, but no backend route exists.
- Frontend calls `/patients/dispense/walk-in`, but backend exposes `/patients/dispense`.
- Frontend calls `/auth/password` and `/auth/pharmacy/users*`, but backend exposes settings routes instead.
- Frontend calls `/nhif/analytics/success-rate` and `/nhif/claims/:id/scrub`, but no backend routes exist.

## Section 3 - Frontend pages

Expected CODEX pages:

- `/knowledge`: PARTIAL - page exists, but CODEX requires public article access and the current route is protected by `AuthGuard`.
- `/knowledge/:slug`: PARTIAL - page exists, but it is protected and does not satisfy the CODEX public-read + SSR sponsorship requirements.
- `/inventory/expiry`: EXISTS - page route exists and is wired to a working expiry report endpoint.
- `/compliance/inspection`: PARTIAL - page route exists, but it depends on missing backend inspection checklist APIs.
- `/dispensing`: PARTIAL - page route exists, but it depends on missing/mismatched APIs and persistent patient data flows that conflict with the CODEX.
- `/cpd`: PARTIAL - page route exists, but the current frontend expects fields that the backend summary endpoint does not return.
- `/settings/subscription`: MISSING - no route or page component found.
- `/inventory/conflicts`: MISSING - no route or page component found.
- `/verify/:id`: MISSING - no route or page component found.
- `/unsubscribe/:token`: MISSING - no route or page component found.
- `/nhif-claims`: MISSING - required placeholder page is absent.
- `/prescriptions`: MISSING - required placeholder page is absent.
- `/symptom-checker`: MISSING - required placeholder page is absent.
- `/patient-records`: MISSING - required placeholder page is absent.
- `/accredited-cpd`: MISSING - required placeholder page is absent.
- `/controlled-substances`: MISSING - required placeholder page is absent.

Out-of-spec frontend pages currently implemented:
- `/nhif`
- `/nhif/claims`
- `/nhif/claims/:id`
- `/patients/new`
- `/patients/:id`

These conflict with the current CODEX direction because NHIF is deferred and patient data must not be stored persistently.

## Section 4 - Features

Module A:
- `A1`, `A2`: PARTIAL - product CRUD and batch management exist, but the schema is incomplete and the current frontend/backend contracts do not fully match the CODEX.
- `A3`: MISSING - no enforced FEFO helper or API-level FEFO routing found.
- `A4`: MISSING - no expiry alert cron job found.
- `A5`: PARTIAL - `/inventory/expiry` exists, but the surrounding alert and dedup workflow is not implemented.
- `A6`: MISSING - no low-stock cron job or alert dedup flow found.
- `A7`: MISSING - no barcode scanner component or ZXing integration found.
- `A8`: PARTIAL - stock intake form exists, but barcode-linked intake and CODEX scanner behavior are missing.
- `A9`: PARTIAL - stock adjustment exists, but the full workflow is incomplete.
- `A10`: PARTIAL - write-off behavior is only partially represented through stock movement types.
- `A11`: PARTIAL - supplier listing exists, but full supplier CRUD is missing.
- `A12`: MISSING - no CSV import flow found.
- `A13`: PARTIAL - the product form shows a cold-chain UI control, but the database/API do not support the field.
- `A14`: MISSING - no full product database validation matching the CODEX was found.
- `A15`: MISSING - no enterprise-gated multi-outlet visibility found.
- `A16`: MISSING - no inter-branch transfer feature found.
- `A17`: MISSING - no service worker, Workbox, or offline sync hook found.
- `A18`: MISSING - no sync conflict table, route, or `/inventory/conflicts` UI found.

Module B:
- `B1`, `B2`, `B3`: PARTIAL - compliance item CRUD exists, but the full CODEX compliance model does not.
- `B4`: MISSING - no compliance alert scheduler or expiry reminder engine found.
- `B5`: PARTIAL - the frontend expects a health score dashboard, but the backend route/job is missing.
- `B6`: MISSING - no IndexedDB/offline compliance cache found.
- `B7`: MISSING - no Supabase Storage upload flow found.
- `B8`: MISSING - no staff credentials management feature found.
- `B9`: PARTIAL - an inspection checklist page exists, but the required backend checklist/PDF pipeline is missing.

Module C:
- `C1`, `C2`, `C3`, `C4`, `C5`, `C6`, `C7`, `C8`, `C9`, `C10`: MISSING - no session-based patient-safety module or required API routes exist. The current code instead uses persistent patient storage, which conflicts with RULE-03.

Module D:
- `D1`: PARTIAL - a dispensing screen exists, but it depends on missing endpoints and out-of-spec persistent patient data.
- `D2`: PARTIAL - payment method selection exists in the dispensing UI, but the backend flow does not match the CODEX dispensing route family.
- `D3`: PARTIAL - dispensing records exist as `dispensings`/`dispensing_items`, but not as immutable `dispensing_events` with CODEX triggers.
- `D4`: MISSING - no audit trigger or `audit_log` implementation found.
- `D5`: MISSING - no PIC-only void workflow found.
- `D6`: MISSING - no PIC-only discount workflow found.

Module E:
- `E1`: PARTIAL - article read flows exist, but admin CRUD, full-text search, and sponsored ordering rules are incomplete.
- `E2`: MISSING - no bulletins feature found.
- `E3`: MISSING - no publications library found.
- `E4`: MISSING - no courses, certificates, or public verification route found.
- `E5`: PARTIAL - CPD activity logging exists.
- `E6`: PARTIAL - CPD summary/tracker exists in limited form.
- `E7`: MISSING - no CPD auto-log flow found.
- `E8`: PARTIAL - sponsored labels are rendered client-side in a protected SPA, not server-rendered HTML.

Module F:
- `F1`, `F2`, `F3`, `F4`, `F5`, `F6`, `F7`, `F8`, `F9`, `F10`, `F11`, `F12`, `F13`, `F14`, `F15`, `F16`: MISSING - no B2B buyer/seller implementation, routes, tables, or frontend modules found.
- `F-H1`, `F-H2`, `F-H3`, `F-H4`, `F-H5`: MISSING - no hybrid retail/wholesale feature set found.

Module G:
- `G1`, `G2`, `G3`, `G4`, `G5`, `G6`, `G7`, `G8`, `G9`: PARTIAL - the current app has stock-on-hand, expiry, dashboard stats, and movement summaries, but no dedicated reports module or export layer.
- `G10`, `G11`, `G12`, `G13`, `G14`, `G15`, `G16`, `G17`, `G18`: MISSING - no financial reports suite found.
- `G19`, `G20`, `G21`, `G22`, `G23`, `G24`, `G25`: PARTIAL - limited operational summaries exist, but not the CODEX reports module or exports.
- `G26`, `G27`, `G28`, `G29`, `G30`, `G31`: MISSING - no safety reports found.
- `G32`, `G33`, `G34`, `G35`, `G36`: PARTIAL - compliance dashboard/stat views exist, but not the required compliance reporting/export module.
- `G37`, `G38`, `G39`, `G40`, `G41`, `G42`, `G43`: MISSING - no wholesale reports found.
- `G44`, `G45`, `G46`, `G47`, `G48`, `G49`, `G50`: MISSING - no BI, benchmarking, or prediction implementation found.
- `G51`, `G52`, `G53`, `G54`, `G55`: MISSING - no enterprise/custom report builder found.

Meta features:
- `M1`: PARTIAL - the frontend references VFD receipt fields, but no backend VFD settings, queue, retry job, or integration exists.
- `M2`: MISSING - no attendance feature found.
- `M3`: MISSING - no daily closing or reconciliation feature found.
- `M4`: MISSING - the current dispensing flow performs API-based patient loading instead of frontend-only session search.

Summary counts:
- Tables: 3 EXISTS · 6 PARTIAL · 28 MISSING
- Routes: 1 EXISTS · 1 PARTIAL · 14 MISSING
- Pages: 1 EXISTS · 5 PARTIAL · 10 MISSING
- Features: 0 DONE · 42 PARTIAL · 89 MISSING

Most important audit findings before Task 1:
- The current schema and routes still implement persistent patients and NHIF logic, both of which conflict with the current CODEX rules.
- Core P0 foundations are not in place yet: subscription/trial schema, override log, dispensing events, notifications, waitlist, B2B, attendance, and reports tables/routes are missing.
- The frontend and backend are materially out of sync in several live areas, especially analytics, compliance, dispensing, NHIF, and settings.

## Post-Task 1 update

Updated live database status on 2026-04-13:
- Tables: 37 EXISTS, 0 PARTIAL, 0 MISSING
- Task 1 migration applied successfully from `backend/prisma/migrations/20260413_183000_codex_task1_schema.sql`
- `override_log` delete protection verified live
- `dispensing_events` immutable core-field protection verified live

Most important remaining findings after Task 1:
- Task 1 database foundations are now in place, but the backend and frontend have not yet been updated to use the new schema consistently.
- The current codebase still contains persistent patient and NHIF claim structures that conflict with the CODEX rules.
- The live database contains both legacy PascalCase tables and the new Task 1 snake_case tables, so Task 2 onward should standardize application access before feature work expands further.

## Final Progress Update (2026-04-14)

Completed or materially advanced since the original audit:
- Task 2: auth, RBAC, trial enforcement, wholesale role expansion, and subscription settings endpoint are implemented.
- Task 3: inventory CRUD, FEFO, barcode intake, offline queueing, conflicts UI, supplier CRUD, cron registration, and enterprise gates are in place. Live checks passed for FEFO ordering, barcode lookup, expiry dedupe, and WCS write-off restriction.
- Task 4: compliance dashboard, staff credentials, inspection checklist generation, alert dedupe, and Supabase private storage uploads are implemented and live-verified.
- Task 5: session-based patient safety endpoints, reviewed-drug filtering, dose calculator, contraindication checks, and override flow exist. Live checks previously verified contraindicated alerts, override trigger protection, and tier gating.
- Task 6: dispensing checkout, PIC override enforcement, void, discount restriction, daily close, and immutable core-field protection are implemented and live-verified.
- Task 7: articles, sponsored SSR HTML badge, bulletins, publications, courses, public certificate verification, weekly digest scaffolding, CPD logging/tracker, and course auto-log are implemented. Live checks passed for sponsored SSR output, cooldown `429`, public `/verify/:id`, ADDO course blocking, and WHOLESALE CPD blocking.
- Task 8: B2B module now exists with closed-network enforcement, credit limits, state machine validation, WCS queue/filtering, item verification, and VAT invoice PDF generation. Live checks passed for `403 SELLER_NOT_ON_PLATFORM`, `402 CREDIT_LIMIT_EXCEEDED`, `422 INVALID_STATE_TRANSITION`, invoice generation, WCS credit-limit denial, and WCS queue filtering.
- Task 9: reports and attendance routes now exist, CSV/PDF export paths are implemented, peer benchmarking privacy guard exists, custom builder allowlists reject injection, and VFD retry job exists. Live checks passed for revenue sum matching manual totals, WCS financial report denial, custom builder injection returning `400`, peer benchmark hiding cohorts under 10, and VFD pending/retry behavior.
- Task 10: notification service, preferences, trial alerts, and in-app notification bell are implemented. In-app and preference persistence were live-verified; external delivery remains config-dependent.
- Task 11: all six deferred-feature placeholder pages are live, public, and save to `waitlist`. Deferred backend routes now fail closed with `410 FEATURE_DEFERRED`.
- Task 12: subscription page, trial banner, and trial paywall are implemented, and backend trial gating was live-verified.
- Task 13: backend Vitest harness is added and `npm test` now runs successfully, but only the deterministic unit subset is in the default run.

Remaining important gaps before everything can honestly be marked fully DONE:
- Task 3: true browser-level offline acceptance for zero-loss sync is still not proved end-to-end from this terminal.
- Task 5: the strict `<500ms` end-to-end patient-safety timing target was not re-proved in automated tests during this pass.
- Task 8: frontend `/wholesale/*` route denial for hybrid `DISPENSER` exists in UI code, but that browser-only acceptance was not formally exercised.
- Task 9: the 50,000-row CSV streaming criterion is implemented in code and unit-tested at the stream utility level, but not live-proved against a real 50,000-row dataset.
- Task 10 / Task 11: Resend, Africa's Talking, and WhatsApp external delivery remain partially blocked because provider credentials are not fully configured in this workspace.
- Task 13: the DB-backed integration suite had to be skipped from the default test run because this Supabase environment was intermittently unavailable under Vitest. Current automated coverage is well below the CODEX 80% target.

Suggested follow-up tasks:
- Follow-up 1: configure Resend / Africa's Talking / WhatsApp credentials and rerun live delivery verification.
- Follow-up 2: stabilize a dedicated test database or local Postgres replica so the skipped integration tests can become part of `npm test`.
- Follow-up 3: expand automated coverage to the business-critical integration flows until the 80% target is genuinely met.

## Hardening Update (2026-04-20)

Completed since the last audit update:
- Browser acceptance coverage now exists in Playwright for deferred waitlist signup, near-expiry trial banner visibility, expired-trial paywall escape to subscription, wholesale route denial for a dispenser, and offline stock intake queue-and-flush behavior.
- The frontend Vite proxy was corrected so local `/api/v1/*` requests no longer strip `/api` during development.
- The stock intake offline path was fixed by forcing the mutation to run while offline instead of being paused by React Query, which closed the remaining Task 3 browser acceptance gap.
- A real frontend infinite-update bug was fixed in the subscription/profile shell synchronization logic, removing the blank-screen failure that surfaced during browser verification.
- Backend auth and a few database-heavy routes now use bounded Prisma retry handling for transient pooler failures instead of flattening them into misleading auth errors.
- Compliance storage now lazy-loads the Supabase client so a broken local install of the Supabase auth helper does not prevent the backend from booting.

Verified status as of 2026-04-20:
- `frontend`: `npm run build` passes
- `frontend`: `npm run test:e2e` passes with 5 browser acceptance tests
- `backend`: `npm run build` passes
- `backend`: `npm test` passes, but still with low coverage and skipped DB-backed cases

Remaining honest constraints:
- External email/SMS/WhatsApp delivery remains only partially verifiable until provider credentials and sender registration are complete.
- The live Supabase pooler is still intermittently unstable from this environment, so DB-backed browser E2E is not yet a reliable CI target.
- Backend automated coverage remains far below the CODEX 80% target, even though the deterministic default suite is green.

## Safety Reporting and Tasks 1-8 Follow-up (2026-05-14)

Completed in this pass:
- Anonymous long-term safety events are now retained in `safety_events` without storing patient names, phone numbers, addresses, national IDs, exact DOB, or reusable patient profiles.
- Dispensing checkout and offline sync now record anonymous safety signals for interactions, allergy/contraindication warnings, precautions, NCD hints, and PIC overrides.
- `/api/v1/reports/safety-impact` now returns pharmacy-level safety impact for OWNER/PIC users and APOTEKH Office aggregate safety impact for SUPER_ADMIN.
- `/reports` now includes the safety impact view, with APOTEKH Office accounts seeing aggregate signal volume and pharmacy-level ranking.
- Patient-safety active-ingredient name lookup is cached under the existing safety catalogue TTL, closing the warm-cache five-drug review timing gap.

Tasks 1-8 evidence refreshed:
- Task 3: targeted Playwright offline stock intake acceptance passed.
- Task 5: targeted backend safety reporting/timing test passed, including warm-cache five-drug `sessionReview` under 500ms.
- Task 8: targeted Playwright dispenser denial on `/wholesale` passed.

Verification commands run:
- `backend`: `npx vitest run tests/safety-events.test.ts --coverage=false` passed.
- `frontend`: `npx playwright test --grep "offline stock intake|dispenser is denied on wholesale dashboard"` passed.
- `backend`: `npm run build` passed.
- `frontend`: `npm run typecheck` passed.

## Pre-Deployment Hardening Update (2026-05-14)

Completed in this pass:
- Password reset now uses one-hour, single-use hashed tokens and clears old refresh sessions after reset.
- `/uploads/*` now requires authentication and checks pharmacy ownership before serving local uploaded files.
- Production CORS defaults exclude localhost unless explicitly supplied through environment configuration.
- `/ready` and `/api/v1/ready` now verify database connectivity for green deployment promotion.
- `docs/deployment-runbook.md` documents release gates, blue-green/equivalent promotion, rollback order, and emergency migration backout notes.
- `scripts/pre-deploy-check.ps1` runs the repeatable pre-deployment build/test gates and can optionally verify a live readiness URL.

Verification commands run:
- `backend`: `npm run build` passed.
- `backend`: `npx vitest run tests/predeployment-hardening.test.ts tests/cors.test.ts --coverage=false` passed.
- `frontend`: `npm run typecheck` passed.
- `frontend`: `$env:VITE_API_URL='https://pharmaconnect-production-e082.up.railway.app/api/v1'; npm run build` passed.
- `website`: `npm run build` passed.
- root: `.\scripts\pre-deploy-check.ps1 -FrontendApiUrl "https://pharmaconnect-production-e082.up.railway.app/api/v1" -SkipPrismaGenerate -SkipWebsite` passed.

Remaining operational items:
- Configure provider-side alerting in Railway/Vercel/Supabase.
- Use the runbook to promote a real preview/staging deployment and test the provider rollback path once before relying on it in production.
