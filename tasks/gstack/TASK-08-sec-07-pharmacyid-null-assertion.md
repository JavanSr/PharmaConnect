# TASK-08 — SEC-07 / REV-04: Guard pharmacyId Null Assertion for SUPER_ADMIN

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

MEDIUM

## Problem

Both `backend/src/modules/dispensing/dispensing.router.ts` and
`backend/src/modules/analytics/analytics.router.ts` use `req.user!.pharmacyId!`
(TypeScript `!` assertion). SUPER_ADMIN has `pharmacyId: null` by design, so at
runtime these crash with an unhandled rejection, returning 500 instead of a
meaningful error.

---

## Scope

Two files:
- `backend/src/modules/dispensing/dispensing.router.ts`
- `backend/src/modules/analytics/analytics.router.ts`

---

## Changes

### dispensing.router.ts — replace `getPharmacyId()` helper

```typescript
// Before
function getPharmacyId(req: AuthRequest): string {
  return req.user!.pharmacyId!;
}

// After
function getPharmacyId(req: AuthRequest): string {
  const pid = req.user?.pharmacyId;
  if (!pid) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return pid;
}
```

### analytics.router.ts — replace `pid` inline function

```typescript
// Before
const pid = (req: AuthRequest) => req.user!.pharmacyId!;

// After
const pid = (req: AuthRequest): string => {
  const id = req.user?.pharmacyId;
  if (!id) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return id;
};
```

---

## Acceptance Criteria

- A SUPER_ADMIN hitting `/dispensing` or `/analytics` without a pharmacy context
  receives 400 with `{ error: 'Pharmacy context required' }`, not a 500 crash.
- The `errorHandler` middleware in `middleware/errorHandler.ts` reads the `.status`
  property on thrown errors — confirm it does before deploying.
- No other middleware or auth logic is modified.
