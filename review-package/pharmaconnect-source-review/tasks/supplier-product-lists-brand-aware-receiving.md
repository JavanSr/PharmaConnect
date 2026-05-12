# Supplier Product Lists and Brand-Aware Receiving

## Goal

Make stock receiving easier for pharmacies that buy from wholesalers by presenting catalog products as brand-aware rows, not generic-only rows. This supports onboarding, barcode/QR workflows, and later brand preference reporting without breaking the current manual receiving flow.

## Phase 1 - Incremental UI Improvement

- Keep the current receive-stock endpoint and batch creation behavior unchanged.
- Keep manual product creation available when no catalog match exists.
- Let staff choose the supplier before searching products so the receiving workflow matches how invoices/proformas are handled.
- Show local and master catalog results with product/brand names first, then generic, form, strength, manufacturer, and source status.
- When a master catalog row is used, create the local product with the catalog product name as the local name and preserve brand/generic fields.

## Out of Scope For This Slice

- No supplier-specific product-list schema yet.
- No purchase-order receiving workflow yet.
- No bulk invoice/proforma import yet.
- No QR/barcode autofill beyond the existing barcode mapping flow.

## Acceptance Criteria

- Existing receive-stock flow still works.
- Existing local products remain selectable.
- Master catalog rows are visibly brand-aware.
- Supplier selection remains optional and backward-compatible.
- No dispensing or inventory availability behavior changes.
