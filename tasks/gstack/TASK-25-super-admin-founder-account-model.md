# TASK-25 — Fix SUPER_ADMIN Null Assertion Crashes

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

HIGH

## Problem

SUPER_ADMIN has `pharmacyId: null` by design — the founder account operates at
platform level with no pharmacy affiliation. However, many routes call
`req.user!.pharmacyId!` (non-null assertion) or fail to guard against null,
causing a runtime 500 crash whenever SUPER_ADMIN accesses any pharmacy-specific
route (dispensing, inventory, stock orders, analytics).

The founder uses the existing demo accounts (OWNER, PIC, DISPENSER, etc.) to
test the pharmacy app experience. SUPER_ADMIN is retained solely for
platform-level oversight. No new accounts or seed pharmacies are needed.

The only fix required is replacing every unsafe `pharmacyId!` assertion with a
proper guard so SUPER_ADMIN receives a clear 400 instead of a 500.

---

## Scope

`backend/src/` only. Do not touch frontend, seed, or prisma schema.

---

## Changes required

### 1. Audit all `pharmacyId` assertions

Search the entire `backend/src/` directory for:
- `\.pharmacyId!`
- `req.user!\.pharmacyId`
- `req\.user!\.`

List every file and line found.

### 2. Apply the safe guard pattern everywhere

Replace each unsafe assertion with:

```typescript
function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}
```

If a file already has a `pid` helper (e.g. `dispensing.router.ts`), confirm it
already uses this pattern — skip if correct, fix if not.

Known instances requiring a fix at the time of writing:
- `backend/src/modules/inventory/stock-order.router.ts` line 70-71

There may be others — the audit in step 1 will confirm.

### 3. Do not change SUPER_ADMIN routes

Routes that are intentionally cross-pharmacy (founder dashboard, pharmacy list,
subscription management) should remain unchanged — they already work without
`pharmacyId`.

---

## Acceptance Criteria

- `grep -r '\.pharmacyId!' backend/src/` returns zero results.
- SUPER_ADMIN navigating to any pharmacy-specific route receives
  `{ "error": "Pharmacy context required" }` with HTTP 400, not a 500 crash.
- All existing demo accounts (OWNER, PIC, DISPENSER, CASHIER, DATA_ENTRY_CLERK)
  continue to work without any change.
- No other modules, seed files, or schema are modified.
