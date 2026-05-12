# TASK-06 — REV-01: Add LOCUM to Dispensing Permissions Map

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

HIGH

## Problem

`backend/src/middleware/permissions.ts` is missing LOCUM from `dispensing.access`,
`dispensing.apply_discount`, and `dispensing.void_sale`. Inline role checks elsewhere
in the codebase do include LOCUM, causing inconsistent enforcement and blocking
LOCUM users from dispensing.

---

## Scope

One file only: `backend/src/middleware/permissions.ts`.

---

## Changes

```typescript
// Before
'dispensing.access': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'CASHIER', 'SUPER_ADMIN'],
'dispensing.apply_discount': ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'],
'dispensing.void_sale': ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'],

// After
'dispensing.access': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'CASHIER', 'LOCUM', 'SUPER_ADMIN'],
'dispensing.apply_discount': ['OWNER', 'PHARMACIST_IN_CHARGE', 'LOCUM', 'SUPER_ADMIN'],
'dispensing.void_sale': ['OWNER', 'PHARMACIST_IN_CHARGE', 'LOCUM', 'SUPER_ADMIN'],
```

---

## Acceptance Criteria

- A user with role `LOCUM` can reach the dispensing screen (200, not 403).
- Discount and void endpoints return 200 for LOCUM.
- No other permission entries are modified.
