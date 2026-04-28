# TASK-28 — Remove DATA_ENTRY_CLERK Role, Merge Permissions into DISPENSER

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW (cleanup)

## Context

In a Tanzanian pharmacy, there is no dedicated data-entry-only staff member.
The DISPENSER already handles day-to-day dispensing and is the natural person
to also receive stock, manage products, and maintain compliance records.
DATA_ENTRY_CLERK is removed and its permissions merge into DISPENSER.

---

## Permission changes

Two permissions that DATA_ENTRY_CLERK has but DISPENSER currently does not —
add DISPENSER to both in `backend/src/middleware/permissions.ts`:

| Permission | Before | After |
|---|---|---|
| `inventory.manage_products` | OWNER, PIC, DATA_ENTRY_CLERK, WM, SUPER_ADMIN | + DISPENSER |
| `compliance.manage` | OWNER, PIC, DATA_ENTRY_CLERK, WM, WCS, SUPER_ADMIN | + DISPENSER |

All other DATA_ENTRY_CLERK permissions (`inventory.view_products`,
`inventory.manage_stock`, `compliance.view`, `knowledge.view`) are already
shared with DISPENSER — no change needed there.

---

## Backend files

### `backend/src/types/roles.ts`
- Remove `'DATA_ENTRY_CLERK'` from the KnownRole union
- Remove `'DATA_ENTRY_CLERK'` from ALL_ROLES array
- Remove `DATA_ENTRY_CLERK: 'DATA_ENTRY_CLERK'` from the roles map

### `backend/src/middleware/permissions.ts`
- Add `'DISPENSER'` to `inventory.manage_products`
- Add `'DISPENSER'` to `compliance.manage`
- Remove `'DATA_ENTRY_CLERK'` from every permission array

### `backend/src/modules/inventory/stock-order.router.ts`
- Line 7 `editableRoles` — replace `'DATA_ENTRY_CLERK'` with `'DISPENSER'`
  (DISPENSER should be able to create and edit stock orders)
- Line 8 `receiverRoles` — replace `'DATA_ENTRY_CLERK'` with `'DISPENSER'`
  (DISPENSER should be able to receive stock)

### `backend/src/modules/catalogue-import/catalogue-import.router.ts`
- Line 26 `requireRole(...)` — remove `'DATA_ENTRY_CLERK'`
  (DISPENSER already in the list)

### `backend/src/modules/compliance/compliance.service.ts`
- Line 27 — remove `| 'DATA_ENTRY_CLERK'` from the role union type
- Line 381 — remove `'DATA_ENTRY_CLERK'` from the inline array
  (DISPENSER already present)

### `backend/src/modules/auth/pharmacy-membership.service.ts`
- Read lines 44–55 carefully before editing. There is a `case 'DATA_ENTRY_CLERK'`
  block that maps DATA_ENTRY_CLERK to ACCOUNTANT (a legacy normalisation).
  Remove this case block entirely.

### `backend/prisma/seed.ts`
- Line 9: remove `case 'DATA_ENTRY_CLERK': return 'ACCOUNTANT'`
- Line 54: the demo clerk user (`clerk@amani.co.tz`, role `DATA_ENTRY_CLERK`) —
  change role to `'DISPENSER'` so the demo account still works after removal.

---

## Frontend files

### `frontend/src/types/index.ts`
- Remove `| 'DATA_ENTRY_CLERK'`

### `frontend/src/hooks/useAuth.ts`
- Line 7 compliance array — remove `'DATA_ENTRY_CLERK'`

### `frontend/src/components/layout/Sidebar.tsx`
- Line 28 Order Preparation roles — remove `'DATA_ENTRY_CLERK'`
- Line 38 Sync Conflicts roles — remove `'DATA_ENTRY_CLERK'`

### `frontend/src/modules/settings/TeamManagementPage.tsx`
- Remove `DATA_ENTRY_CLERK: 'muted'` from the badge colour map
- Remove `{ value: 'DATA_ENTRY_CLERK', label: 'Data Entry Clerk' }` from the
  role options array

### `frontend/src/modules/settings/FeaturesPage.tsx`
- Remove `'DATA_ENTRY_CLERK'` from the `grantableRoles` type (line 20)
- Remove `'DATA_ENTRY_CLERK'` from `inventory.receive_stock` grantableRoles
- Remove `'DATA_ENTRY_CLERK'` from `inventory.adjust_stock` grantableRoles
- Line 63 `compliance.manage` — `grantableRoles` currently only contains
  `['DATA_ENTRY_CLERK']`. Change to `['DISPENSER']`
- Remove `'DATA_ENTRY_CLERK'` from `reports.attendance` grantableRoles

---

## Acceptance Criteria

- `grep -r "DATA_ENTRY_CLERK" backend/src frontend/src` returns zero results
- `grep -r "DATA_ENTRY_CLERK" backend/prisma` returns zero results
- DISPENSER can view and manage products, manage stock, manage compliance records
- The demo clerk account (`clerk@amani.co.tz`) logs in as DISPENSER without error
- TypeScript compiles without errors in both `backend/` and `frontend/`
- No Prisma migration needed — the role is not enforced at DB level
