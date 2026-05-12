# TASK-18 — REV-07: Add Deduplication Check in Catalogue Import

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

`frontend/src/modules/inventory/CatalogueImportPage.tsx` has no deduplication check
before saving imported products. Importing the same CSV twice creates duplicate
product rows in the database.

---

## Scope

One file only: `frontend/src/modules/inventory/CatalogueImportPage.tsx`.

---

## Changes

Before calling the save/import API, fetch existing product names and filter:

```typescript
// Fetch existing product names
const existingRes = await api.get('/inventory/products?fields=name');
const existingNames = new Set(
  existingRes.data.data.map((p: any) => p.name.toLowerCase().trim())
);

// Filter out duplicates
const newRows = parsedRows.filter(
  row => !existingNames.has(row.name.toLowerCase().trim())
);
const duplicateCount = parsedRows.length - newRows.length;

if (duplicateCount > 0) {
  showToast(`${duplicateCount} duplicate product(s) skipped.`, 'warning');
}

if (newRows.length === 0) {
  showToast('All products already exist in your catalogue.', 'info');
  return;
}

// Proceed with newRows only
```

---

## Acceptance Criteria

- Re-importing the same CSV shows a "X duplicate product(s) skipped" toast.
- No duplicate product rows are created.
- First-time imports with all-new products work exactly as before.
- The CSV parse logic, API endpoint, and other inventory pages are not modified.
