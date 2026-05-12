# TASK-27 — Remove LOCUM Role from Codebase

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW (cleanup)

## Context

The LOCUM role was added during early development but is not a recognised role in
Tanzanian pharmacy practice and is not listed in CLAUDE.md's role table. A covering
pharmacist in Tanzania would be registered as PHARMACIST_IN_CHARGE or DISPENSER.
Remove it completely from all backend and frontend files.

---

## Backend files

### `backend/src/types/roles.ts`
- Remove `'LOCUM'` from the `KnownRole` union type
- Remove `'LOCUM'` from the `ALL_ROLES` (or equivalent) array
- Remove `LOCUM: 'LOCUM'` from the roles map/constant

### `backend/src/middleware/permissions.ts`
Remove `'LOCUM'` from every permission array it appears in:
- `dispensing.access`
- `dispensing.apply_discount`
- `dispensing.void_sale`
- `dispensing.override_major_alert`
- `analytics.view_dashboard`

### `backend/src/modules/compliance/compliance.service.ts`
- Remove `| 'LOCUM'` from the role union type on line 26

### `backend/src/modules/dispensing/dispensing.router.ts`
- Remove `'LOCUM'` from the `requireRole(...)` call on line 874

### `backend/src/modules/patient-safety/patient-safety.router.ts`
- Remove `'LOCUM'` from the `ACCESS_ROLES` array on line 23

### `backend/src/modules/auth/pharmacy-membership.service.ts`
- Remove the `case 'LOCUM': return 'LOCUM';` block (lines 46–47)

---

## Frontend files

### `frontend/src/types/index.ts`
- Remove `| 'LOCUM'` from the role union type

### `frontend/src/hooks/useAuth.ts`
- Remove `'LOCUM'` from the `dispensing` roles array (line 6)
- Remove `'LOCUM'` from the `compliance` roles array (line 7)

### `frontend/src/components/layout/Sidebar.tsx`
- Remove `'LOCUM'` from the Dispensing nav item roles array (line 31)
- Remove `'LOCUM'` from the Controlled Register nav item roles array (line 33)

### `frontend/src/modules/dispensing/DispensingScreen.tsx`
- Remove `'LOCUM'` from the `canApplyDiscount` array (line 141)

### `frontend/src/modules/settings/FeaturesPage.tsx`
- Remove `'LOCUM'` from every `grantableRoles` array it appears in
- Remove `| 'LOCUM'` from the `grantableRoles` type definition (line 20)
- Update the analytics.view description (line 71) which mentions "locums" — reword
  to remove the reference

---

## Acceptance Criteria

- `grep -r "LOCUM" backend/src frontend/src` returns zero results
- TypeScript compiles without errors in both `backend/` and `frontend/`
- All existing non-LOCUM roles (OWNER, PHARMACIST_IN_CHARGE, DISPENSER, CASHIER,
  DATA_ENTRY_CLERK, WHOLESALE_MANAGER, WHOLESALE_COUNTER_STAFF, DELIVERY_STAFF,
  SUPER_ADMIN) are unaffected
- No database migration needed — no LOCUM users exist in the seed data
