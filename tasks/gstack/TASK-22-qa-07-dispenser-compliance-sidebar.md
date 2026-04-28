# TASK-22 — QA-07: Add DISPENSER to Compliance Sidebar Nav

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

`frontend/src/components/layout/Sidebar.tsx` hides the Compliance nav item from
DISPENSER-role users. However, DISPENSER has `compliance.view` permission and needs
access to FEFO expiry and recall checks as part of their daily workflow.

---

## Scope

One file only: `frontend/src/components/layout/Sidebar.tsx`.

---

## Changes

Find the Compliance nav item definition. Add `DISPENSER` to its `allowedRoles` array:

```typescript
// Before
allowedRoles: ['OWNER', 'PHARMACIST_IN_CHARGE', 'DATA_ENTRY_CLERK', 'SUPER_ADMIN'],

// After
allowedRoles: ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'SUPER_ADMIN'],
```

---

## Acceptance Criteria

- A logged-in DISPENSER sees the Compliance link in the sidebar.
- Clicking it navigates to the Compliance page without a 403 error.
- No other sidebar nav items are modified.
