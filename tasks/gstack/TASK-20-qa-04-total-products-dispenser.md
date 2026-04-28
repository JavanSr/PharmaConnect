# TASK-20 — QA-04: Fix "Total Products: —" for DISPENSER on Dashboard

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

The dashboard total products count renders as `—` for DISPENSER-role users.
DISPENSER has `inventory.view_products` permission, so this is a query or response
mapping issue — not a permission issue.

---

## Scope

`backend/src/modules/analytics/analytics.router.ts` (dashboard summary endpoint).
If the bug is a frontend null fallback, also check the dashboard component in
`frontend/src/modules/dashboard/`.

---

## Changes

### Backend: ensure the query does not re-check role

The `requirePermission` middleware is the gate. If the product count query has an
additional inline role filter, remove it — the middleware already enforced access.

### Ensure a numeric fallback in the response

```typescript
// If the count can be null/undefined for any reason
totalProducts: productCount ?? 0,
```

### Frontend: ensure the display handles 0

```tsx
// Instead of rendering — for falsy values
{stats.totalProducts ?? '—'}
// Use:
{stats.totalProducts !== undefined && stats.totalProducts !== null
  ? stats.totalProducts
  : '—'}
// Or simply ensure the backend always returns a number
```

---

## Acceptance Criteria

- A logged-in DISPENSER user sees a numeric total product count on the dashboard.
- An OWNER or PIC user's dashboard is unaffected.
- No other dashboard metrics are modified.
