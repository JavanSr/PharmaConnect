# TASK-11 — QA-02: Handle Null sellingPrice in Dispensing Basket

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

MEDIUM

## Problem

When a product has `sellingPrice: null`, the dispensing basket total renders as
`TSh 0` or `NaN` and checkout silently sends a zero-price sale — a financial integrity
issue. The user receives no warning.

---

## Scope

One file only: `frontend/src/modules/dispensing/DispensingScreen.tsx`.

---

## Changes

### 1 — Block adding a product with no price

In the "Add to basket" handler, before pushing to basket state:

```typescript
if (!product.sellingPrice) {
  showToast('This product has no selling price set. Update it in Inventory first.', 'error');
  return;
}
```

### 2 — Null-guard line total and basket total calculations

```typescript
// Line total per item
const lineTotal = (item.sellingPrice ?? 0) * item.quantity;

// Basket grand total
const total = basketItems.reduce(
  (sum, item) => sum + (item.sellingPrice ?? 0) * item.quantity,
  0
);
```

---

## Acceptance Criteria

- Attempting to add a product with `null` or `0` `sellingPrice` shows an error toast.
  The item is not added to the basket.
- Products with a valid price behave exactly as before.
- Checkout API call, receipt PDF, and inventory product editing are not modified.
