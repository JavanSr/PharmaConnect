# TASK-24 — QA-NEW2: Fix Inventory Dashboard Stats Showing Zero

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

MEDIUM

## Problem

The Inventory dashboard page (`/inventory`) shows **Total SKUs: 0**, **Total Units: 0**,
**Low Stock: 0**, **Expiring ≤30d: 0** — even though:

- The main Dashboard correctly shows 306 products and 3 low stock items.
- The API returns correct data:
  - `GET /api/v1/inventory/reports/dashboard-summary` → `totalProducts: 306, lowStockCount: 3`
  - `GET /api/v1/inventory/reports/stock-on-hand` → returns a full array of products (350KB)
  - `GET /api/v1/inventory/reports/low-stock` → returns 3 items
  - `GET /api/v1/inventory/reports/expiry?days=30` → returns 0 items

The data is arriving from the backend. The bug is in the frontend component
not reading or displaying it correctly.

---

## Scope

One file: `frontend/src/modules/inventory/InventoryDashboardPage.tsx`.
Check also `frontend/src/modules/inventory/` for any shared hooks or services
that fetch the dashboard data — but do not modify files outside inventory.

---

## How to diagnose

Open `InventoryDashboardPage.tsx` and look for:

1. **Wrong field name** — the API returns `totalProducts` but the component
   might be reading `totalSKUs`, `skuCount`, or similar. Check the field names
   the component expects against what the API actually returns.

2. **Data not reaching state** — the `useEffect` or query hook that fetches
   `dashboard-summary` might have a dependency issue (see TASK-23), causing it
   to reset state before the data is applied. Add a `console.log` mentally to
   trace: fetch → response → setState → render.

3. **Stock-on-hand aggregation missing** — `Total SKUs` and `Total Units` may
   be computed client-side from the `stock-on-hand` array (`.length` and sum
   of `quantityRemaining`), but the aggregation code may be missing or broken.

4. **Race condition with the infinite loop** — if TASK-23's `AnalyticsPage`
   loop is also affecting this page's state (shared store or context), fixing
   TASK-23 first may resolve this. Check if the zeroes appear in a fresh browser
   session where `AnalyticsPage` has never been mounted.

---

## Fix approach

Once the root cause is identified, apply the minimal fix:

- **Wrong field name:** Align the component's destructuring to match the API
  response shape.
- **Aggregation missing:** Add the reduce/sum correctly:
  ```typescript
  const totalSKUs = stockOnHand.length;
  const totalUnits = stockOnHand.reduce((sum, p) => sum + (p.totalQuantity ?? 0), 0);
  ```
- **State reset:** Add a null/loading guard so the displayed value is not
  overwritten with `0` before data arrives:
  ```typescript
  {stats ? stats.totalProducts : '—'}
  ```

---

## Acceptance Criteria

- `/inventory` page shows correct non-zero values for Total SKUs and Total Units
  that match the product count visible on `/inventory/products`.
- Low Stock count matches the count shown on the main Dashboard (currently 3).
- Expiring ≤30d shows 0 (correct — no batches expiring within 30 days in test data).
- No other inventory pages are modified.
- Fix applies whether or not TASK-23 has been applied first.
