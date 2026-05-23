# PharmaConnect — Claude Code Task Prompt

Use this prompt as context when opening Claude Code in the `pharmaconnect/` repo.
All tasks below are backend or full-stack and require direct file editing + migrations.

---

## Project context (read first)

- **Stack**: Node.js / Express / TypeScript / Prisma / PostgreSQL (backend) · React / Vite / TypeScript / Tailwind (frontend)
- **Root guidance**: See `CLAUDE.md` at repo root — follow it strictly.
- **Backend entry**: `backend/src/index.ts`. Modules are in `backend/src/modules/`.
- **Schema**: `backend/prisma/schema.prisma`. Run `npx prisma migrate dev --name <name>` after schema changes.
- **Conventions**: `{ data: ... }` API responses. Zod at router layer. `prisma.$transaction` for multi-table ops. Named exports, no class components.
- **Currency**: Tsh. Country: Tanzania. Regulatory: TMDA, NHIF, PC (Pharmacy Council). Never PPB.
- **Do not touch**: `src/` at repo root (old prototype). Do not commit `.env`.

---

## Task A — Complete dispensing daily-close service

**File**: `backend/src/modules/dispensing/dispensing.router.ts`

The `POST /dispensing/close-day` route and its service function are truncated around line 775. Complete the daily-close logic:
1. Aggregate all `SaleTransaction` records for `today` (midnight → midnight, outlet-scoped).
2. Compute: total sales count, total revenue (Tsh), total items dispensed, unique products, payment method breakdown.
3. Write a `DailyClose` record (or equivalent — check schema; add model + migration if absent).
4. Return `{ data: { date, totalSales, totalRevenueTzs, itemsDispensed, paymentBreakdown } }`.
5. Guard: one close per outlet per calendar day (return 409 if already closed).

---

## Task B — Implement forecasting services (4 endpoints, all stubs)

**Module**: `backend/src/modules/analytics/` (or create `backend/src/modules/forecasting/`)

All four routes return stub data. Replace with real logic using `StockMovement` / `SaleTransaction` / `InventoryItem` data:

### B1 — `GET /forecasting/stockout`
- For each product with stock > 0: compute `avgDailyDemand` = units dispensed last 30 days ÷ 30.
- `daysUntilStockout` = `currentStock / avgDailyDemand` (null if demand = 0).
- `status`: `OUT` if stock = 0, `RISK` if daysUntilStockout ≤ leadTimeDays, else `OK`.
- Lead time default: 7 days (use product field if present, else default).
- Return top 20 by urgency (OUT first, then ascending daysUntilStockout).

### B2 — `GET /forecasting/seasonality`
- Aggregate dispensed units + revenue by calendar month for the last 12 complete months.
- Return array of 12 `{ key: 'YYYY-MM', label: 'Jan', dispensedUnits, revenueTzs }`.
- Gate: return 403 if outlet tier is not PREMIUM or ENTERPRISE.

### B3 — `GET /forecasting/dead-stock`
- Products where `daysSinceSale > 60` and `currentStock > 0`.
- `deadStockScore` = `currentStock × costPriceTzs × (daysSinceSale / 30)` (proxy for capital at risk).
- Return top 15 sorted descending by score.
- Gate: return 403 if tier is ADDO.

### B4 — `GET /forecasting/regional`
- This is a stub by design for Phase 1. Return `{ enabled: false, status: 'stub', message: 'Regional demand insights launch in Phase 2 with network-wide data pooling.' }`.

---

## Task C — Wholesale returns & credit notes

**Module**: `backend/src/modules/wholesale/`

Add return/credit-note workflow:

1. **Schema**: Add `WholesaleReturn` model — fields: `id`, `orderId`, `outletId`, `createdBy`, `reason` (enum: DAMAGED, WRONG_ITEM, EXPIRED, OTHER), `status` (PENDING → APPROVED → CREDITED), `lines` (JSON: productId, qty, unitPrice), `creditNoteNumber` (auto-generated `CN-YYYY-NNNNN`), `creditAmountTzs`, `createdAt`, `resolvedAt`.
2. `POST /wholesale/returns` — create return request (WHOLESALE_MANAGER or OWNER only).
3. `PATCH /wholesale/returns/:id/approve` — approve + generate credit note (WHOLESALE_MANAGER, OWNER).
4. `GET /wholesale/returns` — list returns for the outlet (paginated).
5. `GET /wholesale/returns/:id` — single return with lines.
6. Deduct stock on approval (reverse the original delivery quantities).

---

## Task D — Wholesale purchase orders to upstream suppliers

**Module**: `backend/src/modules/wholesale/`

Wholesale pharmacies need to order from manufacturers/distributors (not PharmaConnect network):

1. **Schema**: Add `SupplierOrder` model — `id`, `outletId`, `supplierId`, `status` (DRAFT → SENT → PARTIAL → RECEIVED → CANCELLED), `lines` (JSON), `expectedDeliveryDate`, `notes`, `createdBy`, `createdAt`, `updatedAt`.
   - `Supplier` model if not present: `id`, `name`, `contactName`, `phone`, `email`, `address`, `outletId` (supplier is outlet-scoped).
2. CRUD for suppliers: `GET/POST /wholesale/suppliers`, `PATCH/DELETE /wholesale/suppliers/:id`.
3. Purchase order endpoints: `POST /wholesale/purchase-orders`, `GET /wholesale/purchase-orders`, `GET /wholesale/purchase-orders/:id`, `PATCH /wholesale/purchase-orders/:id/status`.
4. On status → RECEIVED: increment stock for each line item using `prisma.$transaction`.
5. Roles allowed: WHOLESALE_MANAGER, OWNER only.

---

## Task E — Wholesale delivery manifests & multi-route management

**Module**: `backend/src/modules/wholesale/`

1. **Schema**: Add `DeliveryManifest` model — `id`, `outletId`, `deliveryStaffId`, `orders` (JSON: array of orderId), `route` (text description), `vehicleReg`, `status` (PENDING → IN_TRANSIT → DELIVERED → PARTIAL), `departedAt`, `completedAt`, `notes`.
2. `POST /wholesale/manifests` — WHOLESALE_MANAGER or OWNER creates manifest, assigns DELIVERY_STAFF.
3. `GET /wholesale/manifests` — list (manager sees all; DELIVERY_STAFF sees own).
4. `PATCH /wholesale/manifests/:id/depart` — DELIVERY_STAFF marks departure (sets `departedAt`).
5. `PATCH /wholesale/manifests/:id/complete` — DELIVERY_STAFF marks delivered; body: `{ deliveredOrderIds, partialLines? }`. Update order statuses to DELIVERED.
6. `GET /wholesale/manifests/:id` — full manifest with order lines.

---

## Task F — Wholesale per-client price overrides

**Module**: `backend/src/modules/wholesale/`

1. **Schema**: Add `ClientPriceOverride` model — `id`, `wholesaleOutletId`, `clientOutletId`, `productId`, `overridePriceTzs`, `validFrom`, `validUntil` (nullable), `createdBy`, `createdAt`.
2. `GET /wholesale/clients/:clientId/prices` — return product list with effective price (override if active, else catalogue price).
3. `POST /wholesale/clients/:clientId/prices` — set override (WHOLESALE_MANAGER or OWNER).
4. `DELETE /wholesale/clients/:clientId/prices/:productId` — remove override.
5. When a B2B order is placed, resolve prices using overrides (check `validFrom ≤ now ≤ validUntil OR validUntil IS NULL`).
6. WHOLESALE_COUNTER_STAFF must NOT see this endpoint — return 403.

---

## Task G — Patient Safety AI counselling service (verify + complete)

**File**: `backend/src/modules/patients/ai-counselling.service.ts` (may be incomplete)

1. Read the file fully. If the counselling service is stubbed or truncated, complete it.
2. The service should accept `{ drugs: string[], patientAge?: number, conditions?: string[] }` and return structured counselling points.
3. If an LLM call is involved, use the environment variable `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY` — check `.env.example`). Do not hard-code keys.
4. If AI is unavailable (no key, network error), fall back gracefully to a rule-based response using the local drug-interaction dataset.
5. Ensure the route is gated to STANDARD / PREMIUM / ENTERPRISE tiers only (same as other patient safety tools).
6. Session-based only — no persistent patient data written to DB. This is a hard constraint.

---

## Task H — Seed drug database for production

**File**: `backend/prisma/drug-database-seed.ts` (or similar)

1. Find the seed file. If it exists, run it against the production DB on Railway: `npx ts-node prisma/drug-database-seed.ts`.
2. If it does not exist, create a seed that inserts at minimum 200 common Tanzanian formulary drugs into the `Drug` (or equivalent) table — fields: generic name, brand names (array), category, standard adult dose, common interactions (array of drug names), pregnancy category, controlled (boolean).
3. Use `upsert` on generic name so re-running is idempotent.
4. Add `npm run seed:drugs` script to `backend/package.json`.

---

## Task I — Testing suite

**Frameworks**: Vitest (frontend unit) + Supertest (backend integration)

No tests exist. Add foundational coverage:

**Backend** (`backend/src/__tests__/`):
- `auth.test.ts` — register, login, refresh token, logout flows.
- `inventory.test.ts` — create product, update stock, FEFO batch dispensing order.
- `dispensing.test.ts` — complete sale, void sale, daily close.
- `wholesale.test.ts` — create order, pick items, deliver.
- Use an in-memory SQLite Prisma test database or a separate `TEST_DATABASE_URL`.
- Add `npm run test` script.

**Frontend** (`frontend/src/__tests__/`):
- `SubscriptionPage.test.tsx` — renders all six tiers with correct Tsh prices.
- `ForecastingPage.test.tsx` — preview banner is always visible.
- `DeferredFeaturePage.test.tsx` — "Back to platform" links to `/dashboard`.

---

## Notes for all tasks

- Follow existing Prisma migration pattern: `npx prisma migrate dev --name descriptive_name`.
- Every new route must use the `authenticate` middleware and check `req.pharmacy.subscriptionTier` for tier gates.
- Return `{ error: 'Forbidden' }` with status 403 for tier/role violations — never silently return empty data.
- Do not modify `src/` at repo root. Do not touch the `website/` Next.js site.
- Run `npm run build` in both `backend/` and `frontend/` after changes and confirm zero TypeScript errors before committing.
