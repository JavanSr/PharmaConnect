# Codex Prompt — Retail Order Preparation

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Overview

A retail pharmacy needs to prepare purchase orders to its external drug suppliers
before stock runs out. Currently there is no way to do this inside PharmaConnect —
a staff member has to write a list on paper, call the supplier, and then manually
enter the received goods with no traceability back to what was ordered.

This feature adds a full **Retail Order Preparation** workflow:

1. Staff open the Order Preparation screen.
2. The system automatically suggests products that are at or below their reorder
   level, pre-assigned to the supplier last used for each product.
3. Staff search for and add any additional products.
4. The cart is displayed and grouped by supplier.
5. Staff review and edit quantities per item, change supplier per item if needed.
6. They save the order as a draft (auto-saved) or submit it.
7. On submission the system generates a printable/shareable Purchase Order
   document per supplier.
8. When the goods arrive, staff open the PO and click "Receive Stock" —
   the batch intake form is pre-filled with the PO's products and quantities.
9. Individual items can be partially received; outstanding items remain open
   until fully received or cancelled.

This feature works entirely with the existing `Supplier` model (name, phone,
email). It does not depend on wholesale pharmacies being registered on
PharmaConnect. Suppliers are just contacts.

---

## Scope

Four tasks only. Do not exceed this scope.

1. **Schema** — `StockOrder`, `StockOrderItem`, `lastSupplierId` on `Product`
2. **Backend** — service functions and REST router
3. **Frontend** — list page, preparation cart page, view/receive page
4. **Sidebar + routes** — wire into the app

---

## Task 1 — Schema

### 1a. Add `lastSupplierId` to `Product`

```prisma
lastSupplierId String? @map("last_supplier_id")

lastSupplier Supplier? @relation("ProductLastSupplier", fields: [lastSupplierId], references: [id], onDelete: SetNull)
```

Add the inverse relation on `Supplier`:
```prisma
productsLastOrdered Product[] @relation("ProductLastSupplier")
```

This field is updated automatically each time a batch is received via a stock
order or a standard batch intake that references a supplier. It powers the
"suggested supplier" in the order preparation screen.

Migration: `npx prisma migrate dev --name add_last_supplier_to_products`

---

### 1b. Add `StockOrder` and `StockOrderItem`

```prisma
model StockOrder {
  id            String    @id @default(uuid())
  pharmacyId    String    @map("pharmacy_id")
  orderNumber   String    @map("order_number")          // PO-2026-0001 auto-generated
  status        String    @default("DRAFT")
  // DRAFT: being prepared, not submitted
  // SUBMITTED: sent to supplier(s), awaiting delivery
  // PARTIALLY_RECEIVED: at least one item received
  // RECEIVED: all items fully received or cancelled
  // CANCELLED: entire order cancelled before any receipt
  notes         String?
  expectedBy    DateTime? @map("expected_by")           // expected delivery date
  submittedAt   DateTime? @map("submitted_at")
  createdBy     String    @map("created_by")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  pharmacy      Pharmacy        @relation(fields: [pharmacyId], references: [id], onDelete: Cascade)
  createdByUser User            @relation("StockOrderCreatedBy", fields: [createdBy], references: [id], onDelete: Restrict)
  items         StockOrderItem[]

  @@index([pharmacyId, status], map: "stock_orders_pharmacy_status_idx")
  @@index([pharmacyId, createdAt], map: "stock_orders_pharmacy_created_at_idx")
  @@map("stock_orders")
}

model StockOrderItem {
  id               String   @id @default(uuid())
  stockOrderId     String   @map("stock_order_id")
  productId        String?  @map("product_id")          // nullable: item not yet in product list
  productName      String   @map("product_name")        // denormalised for display even if product deleted
  genericName      String?  @map("generic_name")
  strength         String?
  dosageForm       String?  @map("dosage_form")
  supplierId       String?  @map("supplier_id")         // per-item supplier assignment
  quantityOrdered  Int      @map("quantity_ordered")
  quantityReceived Int      @default(0) @map("quantity_received")
  expectedUnitCost Decimal? @db.Decimal(12, 2) @map("expected_unit_cost") // optional expected price
  notes            String?
  status           String   @default("PENDING")
  // PENDING: not yet received
  // PARTIALLY_RECEIVED: some received, some outstanding
  // RECEIVED: fully received
  // CANCELLED: removed from active order
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  stockOrder StockOrder @relation(fields: [stockOrderId], references: [id], onDelete: Cascade)
  product    Product?   @relation(fields: [productId], references: [id], onDelete: SetNull)
  supplier   Supplier?  @relation(fields: [supplierId], references: [id], onDelete: SetNull)

  @@index([stockOrderId], map: "stock_order_items_order_idx")
  @@index([productId],    map: "stock_order_items_product_idx")
  @@map("stock_order_items")
}
```

Add inverse relations on `Product`, `Supplier`:
```prisma
// on Product
stockOrderItems StockOrderItem[]

// on Supplier
stockOrderItems StockOrderItem[]
```

Add inverse relation on `User`:
```prisma
createdStockOrders StockOrder[] @relation("StockOrderCreatedBy")
```

Migration: `npx prisma migrate dev --name add_stock_orders`

---

### 1c. Order number generation

Order numbers follow the format `PO-YYYY-NNNN` where NNNN is a zero-padded
sequential integer scoped to the pharmacy and calendar year. Generate in the
service layer using a `MAX(orderNumber)` query on creation — do not use a
separate sequence table.

---

## Task 2 — Backend Service and Router

### 2a. Service functions (`backend/src/modules/inventory/stock-order.service.ts`)

Create a new service file. Do not add to `inventory.service.ts`.

#### `getLowStockSuggestions(pharmacyId: string)`

Returns products where current stock on hand ≤ `reorderLevel`. For each
product, includes:
- `id`, `name`, `genericName`, `strength`, `dosageForm`, `reorderLevel`
- `currentStock` — sum of `Batch.quantity` where `isActive = true` for this product
- `lastSupplierId`, `lastSupplier.name` — the suggested supplier
- `suggestedOrderQuantity` — `reorderLevel * 2 - currentStock` (order up to 2×
  reorder level), minimum 1

Ordered by most critical first (lowest `currentStock / reorderLevel` ratio).

#### `createStockOrder(pharmacyId, userId, data)`

Input: `{ notes?, expectedBy?, items: [{ productId?, productName, genericName?, strength?, dosageForm?, supplierId?, quantityOrdered, expectedUnitCost?, notes? }] }`

- Generate order number (`PO-YYYY-NNNN`)
- Create `StockOrder` with status `DRAFT`
- Create all `StockOrderItem` records
- Return full order with items

#### `getStockOrders(pharmacyId, filters)`

Filters: `status?`, `page`, `limit`. Returns paginated list with item count and
supplier summary per order (comma-separated supplier names, max 3 then "+ N
more").

#### `getStockOrder(pharmacyId, orderId)`

Returns full order with items, each item including `product` and `supplier`
relations.

#### `updateStockOrder(pharmacyId, orderId, data)`

Allowed only while `status = DRAFT`. Updates `notes`, `expectedBy`. Does not
allow status change via this function.

#### `addItemToStockOrder(pharmacyId, orderId, data)`

Adds a single item to a DRAFT order. Same input shape as items in create.
Validates order belongs to pharmacy and is in DRAFT status.

#### `updateStockOrderItem(pharmacyId, orderId, itemId, data)`

Updates `quantityOrdered`, `supplierId`, `expectedUnitCost`, `notes` on a DRAFT
order item.

#### `removeStockOrderItem(pharmacyId, orderId, itemId)`

Removes item from DRAFT order. If the order would have 0 items after removal,
throw 400: "An order must have at least one item."

#### `submitStockOrder(pharmacyId, orderId)`

- Validates status is DRAFT and order has ≥1 item
- Sets `status = SUBMITTED`, `submittedAt = now()`
- For each unique supplier with an email address, send a notification email
  (use the existing email/notification infrastructure; if no email infra
  is available, skip silently and log)
- Returns updated order

#### `receiveStockOrderItems(pharmacyId, orderId, userId, receipts)`

Input: `receipts: [{ itemId, quantityReceived, batchNumber, expiryDate, unitCost }]`

For each receipt:
- Validate `itemId` belongs to this order
- Validate `quantityReceived > 0`
- Create a `Batch` record (same logic as standard `receiveBatch` in
  `inventory.service.ts`) — link the batch to the product
- Update `StockOrderItem.quantityReceived += quantityReceived`
- If `quantityReceived >= quantityOrdered`, set item `status = RECEIVED`;
  else set to `PARTIALLY_RECEIVED`
- Update `Product.lastSupplierId` to the item's `supplierId` if set
- After processing all receipts, recompute `StockOrder.status`:
  - All items RECEIVED or CANCELLED → `RECEIVED`
  - At least one RECEIVED or PARTIALLY_RECEIVED → `PARTIALLY_RECEIVED`
  - Otherwise unchanged

This all runs inside a `prisma.$transaction`.

#### `cancelStockOrder(pharmacyId, orderId)`

Allowed for DRAFT and SUBMITTED orders only. Sets `status = CANCELLED`. Does
not reverse any received batches (partial receipts are permanent).

---

### 2b. Router (`backend/src/modules/inventory/stock-order.router.ts`)

Mount at `/api/v1/stock-orders`.

```
GET    /stock-orders/suggestions          — getLowStockSuggestions
GET    /stock-orders                      — getStockOrders
POST   /stock-orders                      — createStockOrder
GET    /stock-orders/:id                  — getStockOrder
PATCH  /stock-orders/:id                  — updateStockOrder (notes, expectedBy)
POST   /stock-orders/:id/items            — addItemToStockOrder
PATCH  /stock-orders/:id/items/:itemId    — updateStockOrderItem
DELETE /stock-orders/:id/items/:itemId    — removeStockOrderItem
POST   /stock-orders/:id/submit           — submitStockOrder
POST   /stock-orders/:id/receive          — receiveStockOrderItems
POST   /stock-orders/:id/cancel           — cancelStockOrder
```

**Permissions:**
- All routes: `requirePermission('inventory.manage_stock')`
- `receiveStockOrderItems`: additionally restricted to `OWNER`, `PHARMACIST_IN_CHARGE`, `DATA_ENTRY_CLERK`
- `cancelStockOrder` after SUBMITTED: `OWNER` and `PHARMACIST_IN_CHARGE` only

**Validation with Zod** at the router layer for all inputs. Key rules:
- `quantityOrdered`: positive integer, min 1
- `quantityReceived`: positive integer, min 1, max = `quantityOrdered - quantityReceived` (remaining)
- `batchNumber`: string, min 1 char
- `expiryDate`: valid ISO date string, must be future date
- `unitCost`: positive decimal if provided

**Mount in `backend/src/index.ts`:**
```typescript
import { stockOrderRouter } from './modules/inventory/stock-order.router';
app.use(`${API_PREFIX}/stock-orders`, authenticate, stockOrderRouter);
```

---

## Task 3 — Frontend

### 3a. `frontend/src/modules/inventory/StockOrderListPage.tsx`

List of all stock orders for the pharmacy.

**Filters:** status tabs — All / Draft / Submitted / Receiving / Received / Cancelled

**Table columns:**
- Order No. (PO-YYYY-NNNN)
- Date created
- Suppliers (first 2 supplier names, then "+ N more")
- Items (count)
- Expected by (if set)
- Status badge (DRAFT=slate, SUBMITTED=blue, PARTIALLY_RECEIVED=amber, RECEIVED=green, CANCELLED=red)
- Actions: View / Continue (if DRAFT) / Receive (if SUBMITTED or PARTIALLY_RECEIVED)

**Top action:** "Prepare New Order" button → navigates to `/inventory/stock-orders/new`

---

### 3b. `frontend/src/modules/inventory/StockOrderPreparePage.tsx`

This is the main preparation screen. It is used for both creating a new order
(`/inventory/stock-orders/new`) and continuing a DRAFT
(`/inventory/stock-orders/:id/edit`).

**Layout — two panels side by side (desktop) or stacked (mobile):**

**Left panel — Add Products:**
- Search input: search products in the pharmacy's inventory by name, generic name, or barcode
- Below the search: collapsible "Low Stock Suggestions" section
  - Shows products at or below reorder level
  - Each row: product name, current stock / reorder level, suggested quantity, suggested supplier
  - "Add All Suggestions" button and individual "Add" button per row
  - If suggestions exist when the page loads, expand this section automatically
- Search results list: each result shows name, strength, dosage form, current stock
  - "Add to Order" button per result; opens a small inline form to set quantity and supplier
  - Quantity defaults to `suggestedOrderQuantity` from suggestions, or 1 if not suggested
  - Supplier defaults to `lastSupplierId` for that product
  - "Add" confirms and closes the inline form

**Right panel — Order Cart, grouped by supplier:**

- Group each item under its assigned supplier name
- "No supplier assigned" group for items without a supplier
- Per group header: supplier name, total items in this group, supplier phone/email if available
- Per item row:
  - Product name, strength, dosage form
  - Quantity input (editable inline)
  - Expected unit cost input (optional, editable inline)
  - Supplier dropdown (can reassign to different supplier)
  - Notes input (optional)
  - Remove button (trash icon)
- Cart footer:
  - Total items across all suppliers
  - "Save Draft" button — saves without submitting (disabled if cart is empty)
  - "Submit Order" button — submits; confirmation modal appears first
  - "Expected delivery" date picker (optional, applies to whole order)
  - Notes textarea (optional, applies to whole order)

**Auto-save:** The cart auto-saves to the server every time a quantity or
supplier changes (debounced 800ms). Show a small "Saved" indicator.

For new orders, create the `StockOrder` in DRAFT on first item add (not on page
load). Use the returned `id` for all subsequent API calls.

---

### 3c. `frontend/src/modules/inventory/StockOrderViewPage.tsx`

View a submitted, receiving, or received order. Route: `/inventory/stock-orders/:id`

**Header:** Order number, status badge, created by, created date, submitted date,
expected delivery date.

**Items grouped by supplier** — same grouping as the cart but read-only for
RECEIVED/CANCELLED orders.

**For SUBMITTED and PARTIALLY_RECEIVED orders:**
- Each pending item shows a "Record Receipt" inline form:
  - Batch number (required)
  - Expiry date (required)
  - Quantity received (required, max = outstanding quantity)
  - Unit cost (required — used for batch costing)
- "Receive Selected" button processes all filled-in receipt forms at once
- Items already received show a green "Received" badge with quantity and date

**Printable PO section:**
- "Print / Share PO" button — generates one PDF per supplier group
- The PDF uses the `pdf` skill pattern and includes:
  - Pharmacy name, address, and licence number as letterhead
  - "PURCHASE ORDER" title with PO number and date
  - Supplier name, phone, email
  - Item table: product name, generic name, strength, dosage form, qty ordered, expected unit cost, line total
  - Notes
  - Signature lines: Prepared by / Approved by / Date
- Each supplier PDF is named `PO-YYYY-NNNN-SupplierName.pdf`

**Cancel Order** button visible for DRAFT and SUBMITTED orders (OWN/PIC only).

---

### 3d. Routes in `frontend/src/App.tsx`

```tsx
<Route path="/inventory/stock-orders"        element={<AuthGuard><StockOrderListPage /></AuthGuard>} />
<Route path="/inventory/stock-orders/new"    element={<AuthGuard><StockOrderPreparePage /></AuthGuard>} />
<Route path="/inventory/stock-orders/:id/edit" element={<AuthGuard><StockOrderPreparePage /></AuthGuard>} />
<Route path="/inventory/stock-orders/:id"    element={<AuthGuard><StockOrderViewPage /></AuthGuard>} />
```

---

### 3e. Sidebar entry

In `Sidebar.tsx`, under the Inventory section, add:

```tsx
{ label: 'Order Preparation', path: '/inventory/stock-orders', icon: <ClipboardList size={18} /> }
```

This is a Phase 1 retail feature — no lock, no phase badge. Visible to roles
with `inventory.manage_stock` permission:
`OWNER`, `PHARMACIST_IN_CHARGE`, `DATA_ENTRY_CLERK`, `WHOLESALE_MANAGER`.

---

### 3f. "Prepare Order" shortcut from Low Stock report

In `frontend/src/modules/inventory/` wherever the low-stock report is rendered,
add a button:

```tsx
<Button onClick={() => navigate('/inventory/stock-orders/new?prefill=low-stock')}>
  Prepare Restock Order
</Button>
```

When the preparation page loads with `?prefill=low-stock`, automatically fetch
suggestions and expand the Low Stock Suggestions panel with all items pre-checked.

---

## Task 4 — Existing batch intake link-back

In `StockIntakePage.tsx` (the existing stock receiving form), after a batch is
successfully received, update `Product.lastSupplierId` to the `supplierId` used
in that intake (if a supplier was selected). Call:

```
PATCH /inventory/products/:id
{ lastSupplierId: supplierId }
```

This ensures the supplier memory builds up even for stock intake not coming
through a formal stock order.

---

## Acceptance Criteria

### Schema
- [ ] `stock_orders` and `stock_order_items` tables exist after migrations
- [ ] `products.last_supplier_id` column exists
- [ ] All relations compile without TypeScript errors

### Backend
- [ ] `GET /stock-orders/suggestions` returns products below reorder level with `currentStock`, `suggestedOrderQuantity`, and `lastSupplier`
- [ ] Full CRUD cycle: create → add items → update items → submit → receive items
- [ ] `receiveStockOrderItems` creates `Batch` records and updates stock via transaction
- [ ] Order status transitions correctly: DRAFT → SUBMITTED → PARTIALLY_RECEIVED → RECEIVED
- [ ] `cancelStockOrder` blocked on RECEIVED orders
- [ ] Financial reports not exposed through this module
- [ ] CASHIER, DISPENSER, DELIVERY_STAFF cannot create or modify orders (403)

### Frontend
- [ ] Low Stock Suggestions panel auto-expands when suggestions exist
- [ ] Cart groups items by supplier correctly
- [ ] Auto-save fires on quantity/supplier change with "Saved" indicator
- [ ] Receive inline forms process correctly and update item status badges
- [ ] "Prepare Restock Order" shortcut from low-stock report pre-fills suggestions
- [ ] No existing inventory or dispensing flow is broken

---

## Final Output Expected

1. Files changed
2. Migrations added
3. Assumptions made
4. What the frontend PDF generation approach used (inline jsPDF or server-side)
5. Any edge cases needing manual review before go-live
