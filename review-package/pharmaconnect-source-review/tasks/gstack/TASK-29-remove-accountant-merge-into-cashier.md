# TASK-29 — Remove ACCOUNTANT Role, Merge Permissions into CASHIER

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW (cleanup)

## Context

In a small Tanzanian pharmacy, the person handling cash is the same person
doing the books. ACCOUNTANT was never formally adopted as a role — it exists
in code but not in CLAUDE.md's role table. CASHIER absorbs its financial
reporting permissions. Anywhere ACCOUNTANT was listed, CASHIER takes its place.

---

## Permission changes

Two permissions that ACCOUNTANT has but CASHIER currently does not —
add CASHIER to both in `backend/src/middleware/permissions.ts`:

| Permission | Before | After |
|---|---|---|
| `analytics.view_dashboard` | OWNER, PIC, ACCOUNTANT, DISPENSER, WM, SUPER_ADMIN | + CASHIER |
| `analytics.view_financial_reports` | OWNER, ACCOUNTANT, WM, SUPER_ADMIN | + CASHIER |

---

## Backend files

### `backend/src/types/roles.ts`
- Remove `'ACCOUNTANT'` from the KnownRole union
- Remove `'ACCOUNTANT'` from ALL_ROLES array
- Remove `ACCOUNTANT: 'ACCOUNTANT'` from the roles map

### `backend/src/middleware/permissions.ts`
- Add `'CASHIER'` to `analytics.view_dashboard`
- Add `'CASHIER'` to `analytics.view_financial_reports`
- Remove `'ACCOUNTANT'` from both arrays

### `backend/src/modules/auth/pharmacy-membership.service.ts`
- Read lines 44–55 carefully before editing.
- Remove the `case 'ACCOUNTANT': return 'ACCOUNTANT'` block.
- If any other case returns `'ACCOUNTANT'` (including a legacy DATA_ENTRY_CLERK
  mapping), remove those too — coordinate with TASK-28 if running together.

### `backend/src/modules/compliance/compliance.service.ts`
- Line 26 — remove `| 'ACCOUNTANT'` from the role union type

### `backend/prisma/seed.ts`
- Line 9: remove any `case` block that returns `'ACCOUNTANT'`
  (coordinate with TASK-28 — both tasks touch this file)
- If a demo accountant user exists in the seed, change their role to `'CASHIER'`

---

## Frontend files

### `frontend/src/types/index.ts`
- Remove `| 'ACCOUNTANT'`

### `frontend/src/hooks/useAuth.ts`
- Line 9 analytics array — replace `'ACCOUNTANT'` with `'CASHIER'`
- Line 11 reports array — replace `'ACCOUNTANT'` with `'CASHIER'`

### `frontend/src/components/layout/Sidebar.tsx`
- Line 36 Reports sidebar item roles — replace `'ACCOUNTANT'` with `'CASHIER'`

### `frontend/src/modules/settings/FeaturesPage.tsx`
- Remove `| 'ACCOUNTANT'` from the `grantableRoles` type (line 20)
- Line 79 `reports.financial` — `grantableRoles` currently `['ACCOUNTANT']`.
  Change to `['CASHIER']`. Update the description to remove the word "accountants".

---

## Acceptance Criteria

- `grep -r "ACCOUNTANT" backend/src frontend/src` returns zero results
- CASHIER can view the analytics dashboard and financial reports
- TypeScript compiles without errors in both `backend/` and `frontend/`
- No Prisma migration needed — the role is not enforced at DB level

## Note: run with TASK-28

TASK-28 and TASK-29 both touch `pharmacy-membership.service.ts`, `seed.ts`,
`compliance.service.ts`, and `FeaturesPage.tsx`. If running both in the same
session, apply all changes to each file at once rather than editing the same
file twice.
