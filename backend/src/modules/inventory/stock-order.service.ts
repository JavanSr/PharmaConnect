import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';

type StockOrderItemInput = {
  productId?: string;
  productName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  supplierId?: string;
  quantityOrdered: number;
  expectedUnitCost?: number;
  notes?: string;
};

type StockOrderUpdateInput = {
  notes?: string | null;
  expectedBy?: string | null;
};

type StockOrderItemUpdateInput = {
  quantityOrdered?: number;
  supplierId?: string | null;
  expectedUnitCost?: number | null;
  notes?: string | null;
};

type ReceiptInput = {
  itemId: string;
  quantityReceived: number;
  batchNumber: string;
  expiryDate: string;
  unitCost: number;
  sellingPrice?: number;
};

// Minimal item include used in all responses (3 queries → Prisma batches products+suppliers IN)
function itemInclude() {
  return {
    product: {
      select: {
        id: true,
        name: true,
        genericName: true,
        brandName: true,
        strength: true,
        dosageForm: true,
        sellingPrice: true,
        reorderLevel: true,
      },
    },
    supplier: {
      select: { id: true, name: true, phone: true, email: true },
    },
  };
}

function cleanOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toItemCreateInput(item: StockOrderItemInput): Prisma.StockOrderItemUncheckedCreateWithoutStockOrderInput {
  return {
    productId: cleanOptionalText(item.productId),
    productName: item.productName.trim(),
    genericName: cleanOptionalText(item.genericName),
    strength: cleanOptionalText(item.strength),
    dosageForm: cleanOptionalText(item.dosageForm),
    supplierId: cleanOptionalText(item.supplierId),
    quantityOrdered: item.quantityOrdered,
    expectedUnitCost: item.expectedUnitCost,
    notes: cleanOptionalText(item.notes),
  };
}

function toExpectedBy(value?: string | null) {
  if (!value) {
    return null;
  }
  return new Date(value);
}

// ── Parallel validation helpers ───────────────────────────────────────────────
// Run all ownership checks concurrently using pool connections (NOT inside a tx)
// so they fire in parallel instead of sequentially.

async function validateDraftOrder(
  pharmacyId: string,
  orderId: string,
  opts?: { productId?: string | null; supplierId?: string | null },
) {
  const cleanProductId = cleanOptionalText(opts?.productId);
  const cleanSupplierId = cleanOptionalText(opts?.supplierId);

  const [order, product, supplier] = await Promise.all([
    prisma.stockOrder.findFirst({
      where: { id: orderId, pharmacyId },
      select: { id: true, status: true },
    }),
    cleanProductId
      ? prisma.product.findFirst({ where: { id: cleanProductId, pharmacyId, isActive: true }, select: { id: true } })
      : Promise.resolve(null),
    cleanSupplierId
      ? prisma.supplier.findFirst({ where: { id: cleanSupplierId, pharmacyId, isActive: true }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (!order) {
    throw Object.assign(new Error('Stock order not found'), { status: 404 });
  }
  if (order.status !== 'DRAFT') {
    throw Object.assign(new Error('Only draft orders can be edited'), { status: 400 });
  }
  if (cleanProductId && !product) {
    throw Object.assign(new Error('Product not found for this pharmacy'), { status: 404 });
  }
  if (cleanSupplierId && !supplier) {
    throw Object.assign(new Error('Supplier not found for this pharmacy'), { status: 404 });
  }

  return order;
}

async function validateItemRef(
  pharmacyId: string,
  productId?: string | null,
  supplierId?: string | null,
) {
  const cleanProductId = cleanOptionalText(productId);
  const cleanSupplierId = cleanOptionalText(supplierId);

  const [product, supplier] = await Promise.all([
    cleanProductId
      ? prisma.product.findFirst({ where: { id: cleanProductId, pharmacyId, isActive: true }, select: { id: true } })
      : Promise.resolve(null),
    cleanSupplierId
      ? prisma.supplier.findFirst({ where: { id: cleanSupplierId, pharmacyId, isActive: true }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (cleanProductId && !product) {
    throw Object.assign(new Error('Product not found for this pharmacy'), { status: 404 });
  }
  if (cleanSupplierId && !supplier) {
    throw Object.assign(new Error('Supplier not found for this pharmacy'), { status: 404 });
  }
}

// ── Lean response helpers ─────────────────────────────────────────────────────
// Mutations only need items back (frontend reads order.items from mutations).
// Run order header + items fetches in parallel → 2 effective round-trips.

async function orderMutationResponse(orderId: string) {
  const [order, items] = await Promise.all([
    prisma.stockOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        id: true,
        pharmacyId: true,
        orderNumber: true,
        status: true,
        notes: true,
        expectedBy: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    }),
    prisma.stockOrderItem.findMany({
      where: { stockOrderId: orderId },
      orderBy: { createdAt: 'asc' },
      include: itemInclude(),
    }),
  ]);

  return { ...order, items };
}

// ── Order number (must stay inside tx for uniqueness) ─────────────────────────
async function nextOrderNumber(tx: Prisma.TransactionClient, pharmacyId: string) {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const latest = await tx.stockOrder.findFirst({
    where: { pharmacyId, orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  const latestSequence = latest ? Number(latest.orderNumber.slice(prefix.length)) : 0;
  return `${prefix}${String((Number.isFinite(latestSequence) ? latestSequence : 0) + 1).padStart(4, '0')}`;
}

// ── Public service functions ──────────────────────────────────────────────────

export async function getLowStockSuggestions(pharmacyId: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    genericName: string | null;
    strength: string | null;
    dosageForm: string | null;
    reorderLevel: number;
    currentStock: number;
    lastSupplierId: string | null;
    lastSupplierName: string | null;
    lastSupplierPhone: string | null;
    lastSupplierEmail: string | null;
  }>>`
    SELECT
      p."id",
      p."name",
      p."genericName",
      p."strength",
      p."dosageForm",
      p."reorderLevel",
      p."last_supplier_id" AS "lastSupplierId",
      s."name" AS "lastSupplierName",
      s."phone" AS "lastSupplierPhone",
      s."email" AS "lastSupplierEmail",
      COALESCE(SUM(b."quantityRemaining"), 0)::int AS "currentStock"
    FROM "products" p
    LEFT JOIN "batches" b
      ON b."productId" = p."id"
      AND b."pharmacyId" = p."pharmacyId"
      AND b."quantityRemaining" > 0
    LEFT JOIN "suppliers" s
      ON s."id" = p."last_supplier_id"
    WHERE p."pharmacyId" = ${pharmacyId}
      AND p."isActive" = true
      AND p."reorderLevel" > 0
    GROUP BY
      p."id",
      p."name",
      p."genericName",
      p."strength",
      p."dosageForm",
      p."reorderLevel",
      p."last_supplier_id",
      s."id",
      s."name",
      s."phone",
      s."email"
    HAVING COALESCE(SUM(b."quantityRemaining"), 0) <= p."reorderLevel"
    ORDER BY
      (COALESCE(SUM(b."quantityRemaining"), 0)::numeric / NULLIF(p."reorderLevel", 0)) ASC,
      p."name" ASC
  `;

  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    genericName: product.genericName,
    strength: product.strength,
    dosageForm: product.dosageForm,
    reorderLevel: product.reorderLevel,
    currentStock: product.currentStock,
    lastSupplierId: product.lastSupplierId,
    lastSupplier: product.lastSupplierId
      ? {
          id: product.lastSupplierId,
          name: product.lastSupplierName,
          phone: product.lastSupplierPhone,
          email: product.lastSupplierEmail,
        }
      : null,
    suggestedOrderQuantity: Math.max(product.reorderLevel * 2 - product.currentStock, 1),
    criticalityRatio: product.currentStock / product.reorderLevel,
  }));
}

export async function createStockOrder(
  pharmacyId: string,
  userId: string,
  data: { notes?: string; expectedBy?: string | null; items: StockOrderItemInput[] },
) {
  // Validate all item references concurrently (outside tx — pool connections, parallel)
  if (data.items.length > 0) {
    await Promise.all(data.items.map((item) => validateItemRef(pharmacyId, item.productId, item.supplierId)));
  }

  // Short transaction: generate order number + create order + batch-create items
  const orderId = await withPrismaRetry(() =>
    prisma.$transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx, pharmacyId);
      const order = await tx.stockOrder.create({
        data: {
          pharmacyId,
          orderNumber,
          notes: cleanOptionalText(data.notes),
          expectedBy: toExpectedBy(data.expectedBy),
          createdBy: userId,
        },
        select: { id: true },
      });

      if (data.items.length > 0) {
        await tx.stockOrderItem.createMany({
          data: data.items.map((item) => ({ ...toItemCreateInput(item), stockOrderId: order.id })),
        });
      }

      return order.id;
    }),
  );

  // Fetch full response outside tx (order + items in parallel)
  return orderMutationResponse(orderId);
}

export async function getStockOrders(
  pharmacyId: string,
  filters: { status?: string; page?: number; limit?: number },
) {
  const page = Math.max(filters.page ?? 1, 1);
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;
  const where: Prisma.StockOrderWhereInput = {
    pharmacyId,
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [orders, total] = await prisma.$transaction([
    prisma.stockOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true } },
        items: { include: { supplier: { select: { id: true, name: true } } } },
      },
    }),
    prisma.stockOrder.count({ where }),
  ]);

  return {
    data: orders.map((order) => {
      const supplierNames = Array.from(
        new Set(order.items.map((item) => item.supplier?.name).filter((name): name is string => Boolean(name))),
      );
      const visibleNames = supplierNames.slice(0, 3);
      const hiddenCount = Math.max(supplierNames.length - visibleNames.length, 0);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        notes: order.notes,
        expectedBy: order.expectedBy,
        submittedAt: order.submittedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        itemCount: order._count.items,
        supplierSummary:
          supplierNames.length === 0
            ? 'No supplier assigned'
            : `${visibleNames.join(', ')}${hiddenCount > 0 ? ` + ${hiddenCount} more` : ''}`,
      };
    }),
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export async function getStockOrder(pharmacyId: string, orderId: string) {
  // Run order header and items in parallel — two independent fetches
  // vs. previous fullOrderInclude() which serialised 6 Prisma sub-queries
  const [order, items] = await Promise.all([
    prisma.stockOrder.findFirst({
      where: { id: orderId, pharmacyId },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        pharmacy: {
          select: { id: true, name: true, address: true, licenceNumber: true },
        },
      },
    }),
    prisma.stockOrderItem.findMany({
      where: { stockOrderId: orderId },
      orderBy: { createdAt: 'asc' },
      include: itemInclude(),
    }),
  ]);

  if (!order) {
    throw Object.assign(new Error('Stock order not found'), { status: 404 });
  }

  return { ...order, items };
}

export async function updateStockOrder(pharmacyId: string, orderId: string, data: StockOrderUpdateInput) {
  // Validate status outside tx
  await validateDraftOrder(pharmacyId, orderId);

  // Minimal write
  await withPrismaRetry(() =>
    prisma.stockOrder.update({
      where: { id: orderId },
      data: {
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        ...(data.expectedBy !== undefined ? { expectedBy: toExpectedBy(data.expectedBy) } : {}),
      },
      select: { id: true },
    }),
  );

  return orderMutationResponse(orderId);
}

export async function addItemToStockOrder(pharmacyId: string, orderId: string, data: StockOrderItemInput) {
  // Validate concurrently (getDraftOrder + product check + supplier check in parallel)
  await validateDraftOrder(pharmacyId, orderId, { productId: data.productId, supplierId: data.supplierId });

  // Minimal single-row insert (no validation, no re-fetch inside)
  await withPrismaRetry(() =>
    prisma.stockOrderItem.create({
      data: { ...toItemCreateInput(data), stockOrderId: orderId },
      select: { id: true },
    }),
  );

  // Fetch lean response (order header + items in parallel)
  return orderMutationResponse(orderId);
}

export async function updateStockOrderItem(
  pharmacyId: string,
  orderId: string,
  itemId: string,
  data: StockOrderItemUpdateInput,
) {
  // Validate order status + supplier ownership concurrently
  await validateDraftOrder(pharmacyId, orderId, { supplierId: data.supplierId });

  // Find then update (2 sequential queries but short — no tx needed)
  const item = await prisma.stockOrderItem.findFirst({ where: { id: itemId, stockOrderId: orderId } });
  if (!item) {
    throw Object.assign(new Error('Stock order item not found'), { status: 404 });
  }

  await withPrismaRetry(() =>
    prisma.stockOrderItem.update({
      where: { id: itemId },
      data: {
        ...(data.quantityOrdered !== undefined ? { quantityOrdered: data.quantityOrdered } : {}),
        ...(data.supplierId !== undefined ? { supplierId: data.supplierId || null } : {}),
        ...(data.expectedUnitCost !== undefined ? { expectedUnitCost: data.expectedUnitCost } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
      },
      select: { id: true },
    }),
  );

  return orderMutationResponse(orderId);
}

export async function removeStockOrderItem(pharmacyId: string, orderId: string, itemId: string) {
  // Validate order status outside tx
  await validateDraftOrder(pharmacyId, orderId);

  // Count check + delete atomically (prevents removing the last item)
  await withPrismaRetry(() =>
    prisma.$transaction(async (tx) => {
      const item = await tx.stockOrderItem.findFirst({ where: { id: itemId, stockOrderId: orderId } });
      if (!item) {
        throw Object.assign(new Error('Stock order item not found'), { status: 404 });
      }

      const remaining = await tx.stockOrderItem.count({ where: { stockOrderId: orderId, id: { not: itemId } } });
      if (remaining === 0) {
        throw Object.assign(new Error('An order must have at least one item.'), { status: 400 });
      }

      await tx.stockOrderItem.delete({ where: { id: itemId } });
    }),
  );

  return orderMutationResponse(orderId);
}

export async function submitStockOrder(pharmacyId: string, orderId: string) {
  // Run order check and item count in parallel (both are reads, no side-effects)
  const [order, itemCount] = await Promise.all([
    prisma.stockOrder.findFirst({
      where: { id: orderId, pharmacyId },
      select: { id: true, status: true },
    }),
    prisma.stockOrderItem.count({ where: { stockOrderId: orderId } }),
  ]);

  if (!order) {
    throw Object.assign(new Error('Stock order not found'), { status: 404 });
  }
  if (order.status !== 'DRAFT') {
    throw Object.assign(new Error('Only draft orders can be submitted'), { status: 400 });
  }
  if (itemCount === 0) {
    throw Object.assign(new Error('An order must have at least one item.'), { status: 400 });
  }

  await withPrismaRetry(() =>
    prisma.stockOrder.update({
      where: { id: orderId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
      select: { id: true },
    }),
  );

  const response = await orderMutationResponse(orderId);

  // Log supplier email notification skipped (no email integration yet)
  const supplierEmails = Array.from(
    new Set(response.items.map((item) => (item as any).supplier?.email).filter((email): email is string => Boolean(email))),
  );
  if (supplierEmails.length > 0) {
    console.info(`[stock-orders] Email notifications not configured; skipped ${supplierEmails.length} supplier email(s).`);
  }

  return response;
}

export async function receiveStockOrderItems(
  pharmacyId: string,
  orderId: string,
  userId: string,
  receipts: ReceiptInput[],
) {
  await withPrismaRetry(() => prisma.$transaction(async (tx) => {
    const order = await tx.stockOrder.findFirst({
      where: { id: orderId, pharmacyId, status: { in: ['SUBMITTED', 'PARTIALLY_RECEIVED'] } },
      include: { items: true },
    });
    if (!order) {
      throw Object.assign(new Error('Stock order is not open for receiving'), { status: 400 });
    }

    // Validate all receipts first and track cumulative quantities across receipts for the same item
    const cumulativeMap = new Map<string, number>();
    const validated = receipts.map((receipt) => {
      const item = order.items.find((entry) => entry.id === receipt.itemId);
      if (!item) throw Object.assign(new Error('Stock order item not found'), { status: 404 });
      if (!item.productId) throw Object.assign(new Error('Cannot receive an item until it is linked to a product'), { status: 400 });
      const alreadyReceived = cumulativeMap.get(item.id) ?? item.quantityReceived;
      const remaining = item.quantityOrdered - alreadyReceived;
      if (receipt.quantityReceived > remaining) throw Object.assign(new Error('Received quantity exceeds outstanding quantity'), { status: 400 });
      const cumulativeReceived = alreadyReceived + receipt.quantityReceived;
      cumulativeMap.set(item.id, cumulativeReceived);
      return { receipt, item, cumulativeReceived };
    });

    // Create all batches in parallel
    const createdBatches = await Promise.all(
      validated.map(({ receipt, item }) =>
        tx.batch.create({
          data: {
            productId: item.productId!,
            pharmacyId,
            batchNumber: receipt.batchNumber.trim(),
            expiryDate: new Date(receipt.expiryDate),
            quantityRemaining: receipt.quantityReceived,
            purchasePrice: receipt.unitCost,
            supplierId: item.supplierId,
          },
        }),
      ),
    );

    // Create all stock movements in one round-trip
    await tx.stockMovement.createMany({
      data: validated.map(({ receipt, item }, i) => ({
        pharmacyId,
        productId: item.productId!,
        batchId: createdBatches[i].id,
        userId,
        type: 'RECEIVED' as const,
        quantity: receipt.quantityReceived,
        notes: `Received via ${order.orderNumber}`,
      })),
    });

    // Update order items and products in parallel
    await Promise.all([
      ...validated.map(({ item, cumulativeReceived }) =>
        tx.stockOrderItem.update({
          where: { id: item.id },
          data: {
            quantityReceived: cumulativeReceived,
            status: cumulativeReceived >= item.quantityOrdered ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
          },
        }),
      ),
      ...validated
        .filter(({ receipt, item }) => Boolean(item.supplierId) || Boolean(receipt.sellingPrice))
        .map(({ receipt, item }) =>
          tx.product.update({
            where: { id: item.productId! },
            data: {
              ...(item.supplierId ? { lastSupplierId: item.supplierId } : {}),
              ...(receipt.sellingPrice ? { sellingPrice: receipt.sellingPrice } : {}),
            },
          }),
        ),
    ]);

    const freshItems = await tx.stockOrderItem.findMany({ where: { stockOrderId: orderId } });
    const nextStatus = freshItems.every((item) => item.status === 'RECEIVED' || item.status === 'CANCELLED')
      ? 'RECEIVED'
      : freshItems.some((item) => item.status === 'RECEIVED' || item.status === 'PARTIALLY_RECEIVED')
        ? 'PARTIALLY_RECEIVED'
        : order.status;

    await tx.stockOrder.update({
      where: { id: orderId },
      data: { status: nextStatus },
      select: { id: true },
    });
  }));

  // Fetch full order outside tx (parallel order + items)
  return getStockOrder(pharmacyId, orderId);
}

export async function cancelStockOrder(pharmacyId: string, orderId: string) {
  const order = await prisma.stockOrder.findFirst({ where: { id: orderId, pharmacyId } });
  if (!order) {
    throw Object.assign(new Error('Stock order not found'), { status: 404 });
  }
  if (!['DRAFT', 'SUBMITTED'].includes(order.status)) {
    throw Object.assign(new Error('Only draft or submitted orders can be cancelled'), { status: 400 });
  }

  await prisma.stockOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' },
    select: { id: true },
  });

  return orderMutationResponse(orderId);
}
