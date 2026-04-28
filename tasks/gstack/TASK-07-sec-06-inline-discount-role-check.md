# TASK-07 — SEC-06: Replace Inline Discount Role Check with hasPermission()

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

MEDIUM

## Problem

`backend/src/modules/dispensing/dispensing.router.ts` contains an inline role check
around line 407 that duplicates and can diverge from the central PERMISSIONS map:

```typescript
const canDiscount = ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(req.user!.normalizedRole);
```

This also misses LOCUM (which is added to the map in TASK-06).

---

## Scope

One file only: `backend/src/modules/dispensing/dispensing.router.ts`.

---

## Changes

Replace the inline array check with a `hasPermission` call:

```typescript
// Before
const canDiscount = ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(req.user!.normalizedRole);

// After
import { hasPermission } from '../../middleware/permissions';
const canDiscount = hasPermission(req.user!.role, 'dispensing.apply_discount', req.user!.pharmacy);
```

If `hasPermission` is already imported elsewhere in the file, do not add a duplicate import.

---

## Acceptance Criteria

- After TASK-06 + TASK-07 are both applied, a LOCUM user can apply a discount.
- No inline role arrays remain for discount logic.
- No other checkout handler logic is modified.
