# TASK-10 — QA-01: Fix Analytics Overview (Table Mismatch)

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

MEDIUM

## Problem

`backend/src/modules/analytics/analytics.router.ts` crashes with Prisma P2021 on
the overview endpoint because:

1. `prisma.patient.count()` — no `patients` table exists (patient safety is session-based by design).
2. `prisma.dispensing.count()` — no `dispensings` table exists (checkout writes to `dispensing_events` via raw SQL, not via the Prisma Dispensing model).

---

## Scope

One file only: `backend/src/modules/analytics/analytics.router.ts`.

---

## Changes

In the overview handler, replace both failing calls:

```typescript
// Before
const patientCount   = await prisma.patient.count({ where: { pharmacyId: pid(req) } });
const dispensingCount = await prisma.dispensing.count({ where: { pharmacyId: pid(req) } });

// After
// Patients are session-based — no persistent table exists by design
const patientCount = 0;

// Dispensings are written to dispensing_events via raw SQL
const [dispensingResult] = await prisma.$queryRaw<[{ count: bigint }]>`
  SELECT COUNT(*) AS count FROM dispensing_events WHERE pharmacy_id = ${pid(req)}
`;
const dispensingCount = Number(dispensingResult.count);
```

---

## Acceptance Criteria

- `GET /api/v1/analytics/overview` returns 200 with `dispensingCount` as a number.
- No 500 / P2021 errors from the analytics overview endpoint.
- `patientCount` is returned as `0` (correct — no persistent patient records).
- No other analytics queries are modified.
