import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createSupplier, deactivateSupplier, listSuppliers, updateSupplier } from '../inventory/inventory.service';

export const WHOLESALE_RETURN_REASONS = ['DAMAGED', 'WRONG_ITEM', 'EXPIRED', 'OTHER'] as const;
export const SUPPLIER_ORDER_STATUSES = ['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'] as const;
export const DELIVERY_MANIFEST_STATUSES = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'PARTIAL'] as const;

type WholesaleReturnReason = (typeof WHOLESALE_RETURN_REASONS)[number];
type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number];
type DeliveryManifestStatus = (typeof DELIVERY_MANIFEST_STATUSES)[number];

type OrderLine = {
  productId: string;
  productName: string;
  genericName?: string | null;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  pickedQuantity?: number;
  verifiedQuantity?: number;
};

type ReturnLine = {
  productId: string;
  qty: number;
  unitPrice: number;
};

type SupplierOrderLine = {
  productId: string;
  quantity: number;
  unitPriceTzs: number;
  receivedQuantity?: number;
  note?: string | null;
};

type SupplierReceiptLine = {
  productId: string;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  purchasePriceTzs: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  buyer_pharmacy_id: string;
  seller_pharmacy_id: string;
  assigned_driver: string | null;
  status: string;
  items: Prisma.JsonValue;
  subtotal_amount: Prisma.Decimal | number | string;
  total_amount: Prisma.Decimal | number | string;
  created_at: Date;
  updated_at: Date;
};

type WholesaleReturnRow = {
  id: string;
  order_id: string;
  outlet_id: string;
  created_by: string;
  reason: WholesaleReturnReason;
  status: 'PENDING' | 'APPROVED' | 'CREDITED';
  lines: Prisma.JsonValue;
  credit_note_number: string | null;
  credit_amount_tzs: number;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
};

type SupplierOrderRow = {
  id: string;
  outlet_id: string;
  supplier_id: string;
  supplier_name?: string;
  status: SupplierOrderStatus;
  lines: Prisma.JsonValue;
  expected_delivery_date: Date | null;
  notes: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

type DeliveryManifestRow = {
  id: string;
  outlet_id: string;
  delivery_staff_id: string;
  delivery_staff_name?: string;
  orders: Prisma.JsonValue;
  route: string;
  vehicle_reg: string | null;
  status: DeliveryManifestStatus;
  departed_at: Date | null;
  completed_at: Date | null;
  notes: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

type ClientPriceOverrideRow = {
  id: string;
  wholesale_outlet_id: string;
  client_outlet_id: string;
  product_id: string;
  override_price_tzs: number;
  valid_from: Date;
  valid_until: Date | null;
  created_at: Date;
};

function asNumber(value: Prisma.Decimal | string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function parseJsonArray<T>(value: Prisma.JsonValue): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function requireSellerWholesaleRole(role: string) {
  if (!['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'].includes(role)) {
    throw Object.assign(new Error('Forbidden'), { status: 403, code: 'FORBIDDEN' });
  }
}

function requireDeliveryScope(user: { userId: string; normalizedRole: string }, manifest: DeliveryManifestRow) {
  if (user.normalizedRole === 'DELIVERY_STAFF' && manifest.delivery_staff_id !== user.userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403, code: 'FORBIDDEN' });
  }
}

async function getSellerOrder(orderId: string, outletId: string) {
  const rows = await prisma.$queryRaw<OrderRow[]>(Prisma.sql`
    SELECT *
    FROM "orders"
    WHERE "id" = ${orderId}
      AND "seller_pharmacy_id" = ${outletId}
    LIMIT 1
  `);

  const order = rows[0];
  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  return order;
}

async function generateCreditNoteNumber() {
  const rows = await prisma.$queryRaw<Array<{ credit_note_number: string }>>(Prisma.sql`
    SELECT 'CN-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('credit_note_number_seq')::text, 5, '0') AS "credit_note_number"
  `);

  const creditNoteNumber = rows[0]?.credit_note_number;
  if (!creditNoteNumber) {
    throw new Error('Credit note number generation failed');
  }

  return creditNoteNumber;
}

async function restockReturnedLines(
  tx: Prisma.TransactionClient,
  input: {
    outletId: string;
    userId: string;
    lines: ReturnLine[];
    notePrefix: string;
  },
) {
  for (const line of input.lines) {
    const existingBatch = await tx.batch.findFirst({
      where: {
        pharmacyId: input.outletId,
        productId: line.productId,
      },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    });

    const batch = existingBatch ?? await tx.batch.create({
      data: {
        pharmacyId: input.outletId,
        productId: line.productId,
        batchNumber: `RET-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`,
        expiryDate: new Date(Date.now() + 365 * 86_400_000),
        quantityRemaining: 0,
        purchasePrice: line.unitPrice,
      },
    });

    await tx.batch.update({
      where: { id: batch.id },
      data: {
        quantityRemaining: { increment: line.qty },
      },
    });

    await tx.stockMovement.create({
      data: {
        pharmacyId: input.outletId,
        productId: line.productId,
        batchId: batch.id,
        userId: input.userId,
        type: 'RETURNED',
        quantity: line.qty,
        notes: `${input.notePrefix} | price=${line.unitPrice}`,
      },
    });
  }
}

function validateReturnLines(orderLines: OrderLine[], requestedLines: ReturnLine[]) {
  const orderLineMap = new Map(orderLines.map((line) => [line.productId, line]));

  return requestedLines.map((line) => {
    const orderLine = orderLineMap.get(line.productId);
    if (!orderLine) {
      throw Object.assign(new Error('RETURN_LINE_NOT_IN_ORDER'), { status: 422 });
    }

    if (line.qty <= 0 || line.qty > orderLine.quantity) {
      throw Object.assign(new Error('INVALID_RETURN_QUANTITY'), { status: 422 });
    }

    return {
      productId: line.productId,
      qty: line.qty,
      unitPrice: line.unitPrice,
    };
  });
}

function mapWholesaleReturn(row: WholesaleReturnRow) {
  return {
    id: row.id,
    orderId: row.order_id,
    outletId: row.outlet_id,
    createdBy: row.created_by,
    reason: row.reason,
    status: row.status,
    lines: parseJsonArray<ReturnLine>(row.lines),
    creditNoteNumber: row.credit_note_number,
    creditAmountTzs: row.credit_amount_tzs,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    resolvedAt: row.resolved_at?.toISOString() ?? null,
  };
}

function mapSupplierOrder(row: SupplierOrderRow) {
  return {
    id: row.id,
    outletId: row.outlet_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name ?? null,
    status: row.status,
    lines: parseJsonArray<SupplierOrderLine>(row.lines),
    expectedDeliveryDate: row.expected_delivery_date?.toISOString() ?? null,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapManifest(row: DeliveryManifestRow, orders: Array<{ id: string; orderNumber: string; status: string; items: OrderLine[] }> = []) {
  return {
    id: row.id,
    outletId: row.outlet_id,
    deliveryStaffId: row.delivery_staff_id,
    deliveryStaffName: row.delivery_staff_name ?? null,
    orders: parseJsonArray<string>(row.orders),
    route: row.route,
    vehicleReg: row.vehicle_reg,
    status: row.status,
    departedAt: row.departed_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    orderDetails: orders,
  };
}

export async function resolveActiveClientPriceOverrideMap(
  wholesaleOutletId: string,
  clientOutletId: string,
  productIds: string[],
) {
  if (!productIds.length) {
    return new Map<string, number>();
  }

  const rows = await prisma.$queryRaw<ClientPriceOverrideRow[]>(Prisma.sql`
    SELECT *
    FROM "client_price_overrides"
    WHERE "wholesale_outlet_id" = ${wholesaleOutletId}
      AND "client_outlet_id" = ${clientOutletId}
      AND "product_id" IN (${Prisma.join(productIds)})
      AND "valid_from" <= NOW()
      AND ("valid_until" IS NULL OR "valid_until" >= NOW())
    ORDER BY "valid_from" DESC, "created_at" DESC
  `);

  const overrides = new Map<string, number>();
  for (const row of rows) {
    if (!overrides.has(row.product_id)) {
      overrides.set(row.product_id, row.override_price_tzs);
    }
  }

  return overrides;
}

export async function listClientEffectivePrices(wholesaleOutletId: string, clientOutletId: string) {
  const [buyer, overrides] = await Promise.all([
    prisma.pharmacy.findUnique({
      where: { id: clientOutletId },
      select: { subscriptionTier: true },
    }),
    resolveActiveClientPriceOverrideMap(wholesaleOutletId, clientOutletId, []),
  ]);

  const rows = await prisma.$queryRaw<Array<{
    product_id: string;
    product_name: string;
    generic_name: string | null;
    catalogue_price: Prisma.Decimal | string | number;
    tier_prices: Prisma.JsonValue;
  }>>(Prisma.sql`
    SELECT
      p."id" AS "product_id",
      p."name" AS "product_name",
      p."genericName" AS "generic_name",
      wcp."price" AS "catalogue_price",
      wcp."tier_prices" AS "tier_prices"
    FROM "wholesale_catalogue_pricing" wcp
    INNER JOIN "wholesale_catalogues" wc ON wc."id" = wcp."catalogue_id"
    INNER JOIN "products" p ON p."id" = wcp."product_id"
    WHERE wc."pharmacy_id" = ${wholesaleOutletId}
      AND wc."is_active" = true
      AND wcp."is_active" = true
    ORDER BY p."name" ASC
  `);

  const overrideMap = rows.length
    ? await resolveActiveClientPriceOverrideMap(wholesaleOutletId, clientOutletId, rows.map((row) => row.product_id))
    : overrides;
  const buyerTier = buyer?.subscriptionTier ?? null;

  return rows.map((row) => {
    const tierPrices = typeof row.tier_prices === 'object' && row.tier_prices && !Array.isArray(row.tier_prices)
      ? row.tier_prices as Record<string, number>
      : {};
    const cataloguePrice = asNumber(row.catalogue_price);
    const tierPrice = buyerTier && typeof tierPrices[buyerTier] === 'number'
      ? Number(tierPrices[buyerTier])
      : cataloguePrice;
    const overridePrice = overrideMap.get(row.product_id) ?? null;

    return {
      productId: row.product_id,
      productName: row.product_name,
      genericName: row.generic_name,
      cataloguePriceTzs: cataloguePrice,
      tierPriceTzs: tierPrice,
      effectivePriceTzs: overridePrice ?? tierPrice,
      overridePriceTzs: overridePrice,
      hasOverride: overridePrice != null,
    };
  });
}

export async function upsertClientPriceOverride(input: {
  wholesaleOutletId: string;
  clientOutletId: string;
  productId: string;
  overridePriceTzs: number;
  validFrom?: Date;
  validUntil?: Date | null;
  createdBy: string;
}) {
  const product = await prisma.product.findFirst({
    where: {
      id: input.productId,
      pharmacyId: input.wholesaleOutletId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "client_price_overrides" (
      "id",
      "wholesale_outlet_id",
      "client_outlet_id",
      "product_id",
      "override_price_tzs",
      "valid_from",
      "valid_until",
      "created_by",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${randomUUID()},
      ${input.wholesaleOutletId},
      ${input.clientOutletId},
      ${input.productId},
      ${Math.round(input.overridePriceTzs)},
      ${input.validFrom ?? new Date()},
      ${input.validUntil ?? null},
      ${input.createdBy},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("wholesale_outlet_id", "client_outlet_id", "product_id")
    DO UPDATE SET
      "override_price_tzs" = EXCLUDED."override_price_tzs",
      "valid_from" = EXCLUDED."valid_from",
      "valid_until" = EXCLUDED."valid_until",
      "created_by" = EXCLUDED."created_by",
      "updated_at" = CURRENT_TIMESTAMP
  `);

  return listClientEffectivePrices(input.wholesaleOutletId, input.clientOutletId);
}

export async function deleteClientPriceOverride(wholesaleOutletId: string, clientOutletId: string, productId: string) {
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "client_price_overrides"
    WHERE "wholesale_outlet_id" = ${wholesaleOutletId}
      AND "client_outlet_id" = ${clientOutletId}
      AND "product_id" = ${productId}
  `);
}

export async function createWholesaleReturn(input: {
  outletId: string;
  createdBy: string;
  orderId: string;
  reason: WholesaleReturnReason;
  lines: ReturnLine[];
}) {
  const order = await getSellerOrder(input.orderId, input.outletId);
  const validatedLines = validateReturnLines(parseJsonArray<OrderLine>(order.items), input.lines);
  const creditAmountTzs = validatedLines.reduce((sum, line) => sum + Math.round(line.qty * line.unitPrice), 0);

  const rows = await prisma.$queryRaw<WholesaleReturnRow[]>(Prisma.sql`
    INSERT INTO "wholesale_returns" (
      "id",
      "order_id",
      "outlet_id",
      "created_by",
      "reason",
      "status",
      "lines",
      "credit_amount_tzs",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${randomUUID()},
      ${order.id},
      ${input.outletId},
      ${input.createdBy},
      ${input.reason},
      'PENDING',
      ${JSON.stringify(validatedLines)}::jsonb,
      ${creditAmountTzs},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    RETURNING *
  `);

  return mapWholesaleReturn(rows[0]);
}

export async function approveWholesaleReturn(input: {
  outletId: string;
  returnId: string;
  approvedBy: string;
}) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<WholesaleReturnRow[]>(Prisma.sql`
      SELECT *
      FROM "wholesale_returns"
      WHERE "id" = ${input.returnId}
        AND "outlet_id" = ${input.outletId}
      LIMIT 1
    `);

    const record = rows[0];
    if (!record) {
      throw Object.assign(new Error('Wholesale return not found'), { status: 404 });
    }
    if (record.status !== 'PENDING') {
      throw Object.assign(new Error('Wholesale return has already been approved'), { status: 409 });
    }

    const creditNoteNumber = await generateCreditNoteNumber();
    const lines = parseJsonArray<ReturnLine>(record.lines);
    await restockReturnedLines(tx, {
      outletId: input.outletId,
      userId: input.approvedBy,
      lines,
      notePrefix: `Approved wholesale return ${record.id}`,
    });

    const updated = await tx.$queryRaw<WholesaleReturnRow[]>(Prisma.sql`
      UPDATE "wholesale_returns"
      SET
        "status" = 'APPROVED',
        "credit_note_number" = ${creditNoteNumber},
        "resolved_at" = CURRENT_TIMESTAMP,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${record.id}
      RETURNING *
    `);

    return mapWholesaleReturn(updated[0]);
  });
}

export async function listWholesaleReturns(outletId: string, params: { page?: number; limit?: number }) {
  const page = Math.max(params.page ?? 1, 1);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const offset = (page - 1) * limit;

  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<WholesaleReturnRow[]>(Prisma.sql`
      SELECT *
      FROM "wholesale_returns"
      WHERE "outlet_id" = ${outletId}
      ORDER BY "created_at" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "total"
      FROM "wholesale_returns"
      WHERE "outlet_id" = ${outletId}
    `),
  ]);

  const total = Number(counts[0]?.total ?? 0);
  return {
    data: rows.map(mapWholesaleReturn),
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export async function getWholesaleReturn(outletId: string, returnId: string) {
  const rows = await prisma.$queryRaw<WholesaleReturnRow[]>(Prisma.sql`
    SELECT *
    FROM "wholesale_returns"
    WHERE "id" = ${returnId}
      AND "outlet_id" = ${outletId}
    LIMIT 1
  `);

  const record = rows[0];
  if (!record) {
    throw Object.assign(new Error('Wholesale return not found'), { status: 404 });
  }

  return mapWholesaleReturn(record);
}

export async function listWholesaleSuppliers(outletId: string) {
  return listSuppliers(outletId);
}

export async function createWholesaleSupplier(outletId: string, data: {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  return createSupplier(outletId, data);
}

export async function updateWholesaleSupplier(outletId: string, supplierId: string, data: {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  return updateSupplier(outletId, supplierId, data);
}

export async function deleteWholesaleSupplier(outletId: string, supplierId: string) {
  return deactivateSupplier(outletId, supplierId);
}

export async function createSupplierOrder(input: {
  outletId: string;
  supplierId: string;
  status?: SupplierOrderStatus;
  lines: SupplierOrderLine[];
  expectedDeliveryDate?: Date | null;
  notes?: string | null;
  createdBy: string;
}) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: input.supplierId,
      pharmacyId: input.outletId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!supplier) {
    throw Object.assign(new Error('Supplier not found'), { status: 404 });
  }

  const productIds = input.lines.map((line) => line.productId);
  const products = await prisma.product.findMany({
    where: {
      pharmacyId: input.outletId,
      id: { in: productIds },
    },
    select: { id: true },
  });

  if (products.length !== productIds.length) {
    throw Object.assign(new Error('One or more products could not be found for this outlet'), { status: 422 });
  }

  const normalizedLines = input.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    unitPriceTzs: Math.round(line.unitPriceTzs),
    receivedQuantity: line.receivedQuantity ?? 0,
    note: line.note?.trim() || null,
  }));

  const rows = await prisma.$queryRaw<SupplierOrderRow[]>(Prisma.sql`
    INSERT INTO "supplier_orders" (
      "id",
      "outlet_id",
      "supplier_id",
      "status",
      "lines",
      "expected_delivery_date",
      "notes",
      "created_by",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${randomUUID()},
      ${input.outletId},
      ${input.supplierId},
      ${(input.status ?? 'DRAFT') as SupplierOrderStatus},
      ${JSON.stringify(normalizedLines)}::jsonb,
      ${input.expectedDeliveryDate ?? null},
      ${input.notes?.trim() || null},
      ${input.createdBy},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    RETURNING *
  `);

  return mapSupplierOrder(rows[0]);
}

export async function listSupplierOrders(outletId: string) {
  const rows = await prisma.$queryRaw<SupplierOrderRow[]>(Prisma.sql`
    SELECT so.*, s."name" AS "supplier_name"
    FROM "supplier_orders" so
    INNER JOIN "suppliers" s ON s."id" = so."supplier_id"
    WHERE so."outlet_id" = ${outletId}
    ORDER BY so."created_at" DESC
  `);

  return rows.map(mapSupplierOrder);
}

export async function getSupplierOrder(outletId: string, supplierOrderId: string) {
  const rows = await prisma.$queryRaw<SupplierOrderRow[]>(Prisma.sql`
    SELECT so.*, s."name" AS "supplier_name"
    FROM "supplier_orders" so
    INNER JOIN "suppliers" s ON s."id" = so."supplier_id"
    WHERE so."id" = ${supplierOrderId}
      AND so."outlet_id" = ${outletId}
    LIMIT 1
  `);

  const order = rows[0];
  if (!order) {
    throw Object.assign(new Error('Supplier order not found'), { status: 404 });
  }

  return mapSupplierOrder(order);
}

export async function updateSupplierOrderStatus(input: {
  outletId: string;
  supplierOrderId: string;
  nextStatus: SupplierOrderStatus;
  userId: string;
  receivedLines?: SupplierReceiptLine[];
}) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<SupplierOrderRow[]>(Prisma.sql`
      SELECT *
      FROM "supplier_orders"
      WHERE "id" = ${input.supplierOrderId}
        AND "outlet_id" = ${input.outletId}
      LIMIT 1
    `);

    const order = rows[0];
    if (!order) {
      throw Object.assign(new Error('Supplier order not found'), { status: 404 });
    }

    let updatedLines = parseJsonArray<SupplierOrderLine>(order.lines);

    if (input.nextStatus === 'RECEIVED' || input.nextStatus === 'PARTIAL') {
      if (!input.receivedLines?.length) {
        throw Object.assign(new Error('Received lines are required when receiving supplier stock'), { status: 400 });
      }

      const lineMap = new Map(updatedLines.map((line) => [line.productId, { ...line }]));
      for (const line of input.receivedLines) {
        const existing = lineMap.get(line.productId);
        if (!existing) {
          throw Object.assign(new Error('SUPPLIER_ORDER_LINE_NOT_FOUND'), { status: 422 });
        }

        if (line.quantity <= 0) {
          throw Object.assign(new Error('INVALID_RECEIVED_QUANTITY'), { status: 422 });
        }

        const nextReceivedQuantity = (existing.receivedQuantity ?? 0) + line.quantity;
        if (nextReceivedQuantity > existing.quantity) {
          throw Object.assign(new Error('RECEIVED_QUANTITY_EXCEEDS_ORDERED'), { status: 422 });
        }

        const batch = await tx.batch.create({
          data: {
            pharmacyId: input.outletId,
            productId: line.productId,
            batchNumber: line.batchNumber,
            expiryDate: new Date(line.expiryDate),
            quantityRemaining: line.quantity,
            purchasePrice: line.purchasePriceTzs,
            supplierId: order.supplier_id,
          },
        });

        await tx.stockMovement.create({
          data: {
            pharmacyId: input.outletId,
            productId: line.productId,
            batchId: batch.id,
            userId: input.userId,
            type: 'RECEIVED',
            quantity: line.quantity,
            notes: `Supplier order ${order.id}`,
          },
        });

        lineMap.set(line.productId, {
          ...existing,
          receivedQuantity: nextReceivedQuantity,
        });
      }

      updatedLines = Array.from(lineMap.values());
    }

    const updatedRows = await tx.$queryRaw<SupplierOrderRow[]>(Prisma.sql`
      UPDATE "supplier_orders"
      SET
        "status" = ${input.nextStatus},
        "lines" = ${JSON.stringify(updatedLines)}::jsonb,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${order.id}
      RETURNING *
    `);

    return mapSupplierOrder(updatedRows[0]);
  });
}

export async function createDeliveryManifest(input: {
  outletId: string;
  deliveryStaffId: string;
  orderIds: string[];
  route: string;
  vehicleReg?: string | null;
  notes?: string | null;
  createdBy: string;
}) {
  const [deliveryStaff, orders] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: input.deliveryStaffId,
        isActive: true,
      },
      select: {
        id: true,
        role: true,
      },
    }),
    prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "orders"
      WHERE "seller_pharmacy_id" = ${input.outletId}
        AND "id" IN (${Prisma.join(input.orderIds)})
    `),
  ]);

  if (!deliveryStaff || deliveryStaff.role !== 'DELIVERY_STAFF') {
    throw Object.assign(new Error('Delivery staff member not found'), { status: 404 });
  }

  if (orders.length !== input.orderIds.length) {
    throw Object.assign(new Error('One or more orders could not be found for this outlet'), { status: 422 });
  }

  const rows = await prisma.$queryRaw<DeliveryManifestRow[]>(Prisma.sql`
    INSERT INTO "delivery_manifests" (
      "id",
      "outlet_id",
      "delivery_staff_id",
      "orders",
      "route",
      "vehicle_reg",
      "status",
      "notes",
      "created_by",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${randomUUID()},
      ${input.outletId},
      ${input.deliveryStaffId},
      ${JSON.stringify(input.orderIds)}::jsonb,
      ${input.route.trim()},
      ${input.vehicleReg?.trim() || null},
      'PENDING',
      ${input.notes?.trim() || null},
      ${input.createdBy},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    RETURNING *
  `);

  return mapManifest(rows[0]);
}

export async function listDeliveryManifests(input: { outletId: string; userId: string; normalizedRole: string }) {
  const rows = await prisma.$queryRaw<DeliveryManifestRow[]>(Prisma.sql`
    SELECT
      dm.*,
      TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')) AS "delivery_staff_name"
    FROM "delivery_manifests" dm
    INNER JOIN "users" u ON u."id" = dm."delivery_staff_id"
    WHERE dm."outlet_id" = ${input.outletId}
      ${
        input.normalizedRole === 'DELIVERY_STAFF'
          ? Prisma.sql`AND dm."delivery_staff_id" = ${input.userId}`
          : Prisma.empty
      }
    ORDER BY dm."created_at" DESC
  `);

  return rows.map((row) => mapManifest(row));
}

export async function getDeliveryManifest(input: { outletId: string; manifestId: string; userId: string; normalizedRole: string }) {
  const rows = await prisma.$queryRaw<DeliveryManifestRow[]>(Prisma.sql`
    SELECT
      dm.*,
      TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')) AS "delivery_staff_name"
    FROM "delivery_manifests" dm
    INNER JOIN "users" u ON u."id" = dm."delivery_staff_id"
    WHERE dm."id" = ${input.manifestId}
      AND dm."outlet_id" = ${input.outletId}
    LIMIT 1
  `);

  const manifest = rows[0];
  if (!manifest) {
    throw Object.assign(new Error('Delivery manifest not found'), { status: 404 });
  }

  requireDeliveryScope(input, manifest);

  const orderIds = parseJsonArray<string>(manifest.orders);
  const orderRows = orderIds.length
    ? await prisma.$queryRaw<OrderRow[]>(Prisma.sql`
      SELECT *
      FROM "orders"
      WHERE "seller_pharmacy_id" = ${input.outletId}
        AND "id" IN (${Prisma.join(orderIds)})
      ORDER BY "created_at" DESC
    `)
    : [];

  return mapManifest(
    manifest,
    orderRows.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      items: parseJsonArray<OrderLine>(row.items),
    })),
  );
}

export async function departDeliveryManifest(input: { outletId: string; manifestId: string; userId: string; normalizedRole: string }) {
  const manifest = await getDeliveryManifest(input);

  const updatedRows = await prisma.$queryRaw<DeliveryManifestRow[]>(Prisma.sql`
    UPDATE "delivery_manifests"
    SET
      "status" = 'IN_TRANSIT',
      "departed_at" = COALESCE("departed_at", CURRENT_TIMESTAMP),
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${manifest.id}
    RETURNING *
  `);

  return mapManifest(updatedRows[0]);
}

export async function completeDeliveryManifest(input: {
  outletId: string;
  manifestId: string;
  userId: string;
  normalizedRole: string;
  deliveredOrderIds: string[];
  partialLines?: Prisma.JsonValue;
}) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<DeliveryManifestRow[]>(Prisma.sql`
      SELECT *
      FROM "delivery_manifests"
      WHERE "id" = ${input.manifestId}
        AND "outlet_id" = ${input.outletId}
      LIMIT 1
    `);

    const manifest = rows[0];
    if (!manifest) {
      throw Object.assign(new Error('Delivery manifest not found'), { status: 404 });
    }

    requireDeliveryScope(input, manifest);

    const manifestOrderIds = parseJsonArray<string>(manifest.orders);
    const allDeliveredOrderIds = input.deliveredOrderIds.every((orderId) => manifestOrderIds.includes(orderId));
    if (!allDeliveredOrderIds) {
      throw Object.assign(new Error('One or more delivered orders are not part of this manifest'), { status: 422 });
    }

    if (input.deliveredOrderIds.length) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "orders"
        SET
          "status" = 'DELIVERED',
          "delivered_at" = COALESCE("delivered_at", CURRENT_TIMESTAMP),
          "assigned_driver" = COALESCE("assigned_driver", ${manifest.delivery_staff_id}),
          "updated_at" = CURRENT_TIMESTAMP
        WHERE "seller_pharmacy_id" = ${input.outletId}
          AND "id" IN (${Prisma.join(input.deliveredOrderIds)})
      `);
    }

    const partial = Array.isArray(input.partialLines) && input.partialLines.length > 0;
    const notes = partial
      ? [manifest.notes, `partialLines=${JSON.stringify(input.partialLines)}`].filter(Boolean).join('\n')
      : manifest.notes;

    const updatedRows = await tx.$queryRaw<DeliveryManifestRow[]>(Prisma.sql`
      UPDATE "delivery_manifests"
      SET
        "status" = ${partial || input.deliveredOrderIds.length < manifestOrderIds.length ? 'PARTIAL' : 'DELIVERED'},
        "completed_at" = CURRENT_TIMESTAMP,
        "notes" = ${notes ?? null},
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${manifest.id}
      RETURNING *
    `);

    return mapManifest(updatedRows[0]);
  });
}

export { requireSellerWholesaleRole };
