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
};

function fullOrderInclude() {
  return {
    createdByUser: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
    pharmacy: {
      select: { id: true, name: true, address: true, licenceNumber: true },
    },
    items: {
      orderBy: { createdAt: 'asc' as const },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            genericName: true,
            brandName: true,
            strength: true,
            dosageForm: true,
            reorderLevel: true,
          },
        },
        supplier: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
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

async function assertProductBelongsToPharmacy(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  productId?: string | null,
) {
  if (!productId) {
    return;
  }

  const product = await tx.product.findFirst({
    where: { id: productId, pharmacyId, isActive: true },
    select: { id: true },
  });
  if (!product) {
    throw Object.assign(new Error('Product not found for this pharmacy'), { status: 404 });
  }
}

async function assertSupplierBelongsToPharmacy(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  supplierId?: string | null,
) {
  if (!supplierId) {
    return;
  }

  const supplier = await tx.supplier.findFirst({
    where: { id: supplierId, pharmacyId, isActive: true },
    select: { id: true },
  });
  if (!supplier) {
    throw Object.assign(new Error('Supplier not found for this pharmacy'), { status: 404 });
  }
}

async function assertItemReferences(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  item: Pick<StockOrderItemInput, 'productId' | 'supplierId'>,
) {
  await assertProductBelongsToPharmacy(tx, pharmacyId, item.productId);
  await assertSupplierBelongsToPharmacy(tx, pharmacyId, item.supplierId);
}

async function getDraftOrder(tx: Prisma.TransactionClient, pharmacyId: string, orderId: string) {
  const order = await tx.stockOrder.findFirst({
    where: { id: orderId, pharmacyId },
    select: { id: true, status: true },
  });

  if (!order) {
    throw Object.assign(new Error('Stock order not found'), { status: 404 });
  }
  if (order.status !== 'DRAFT') {
    throw Object.assign(new Error('Only draft orders can be edited'), { status: 400 });
  }

  return order;
}

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

export async function getLowStockSuggestions(pharmacyId: string) {
  const products = await prisma.product.findMany({
    where: { pharmacyId, isActive: true, reorderLevel: { gt: 0 } },
    select: {
      id: true,
      name: true,
      genericName: true,
      strength: true,
      dosageForm: true,
      reorderLevel: true,
      lastSupplierId: true,
      lastSupplier: { select: { id: true, name: true, phone: true, email: true } },
      batches: { select: { quantityRemaining: true }, where: { quantityRemaining: { gt: 0 } } },
    },
  });

  return products
    .map((product) => {
      const currentStock = product.batches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);
      return {
        id: product.id,
        name: product.name,
        genericName: product.genericName,
        strength: product.strength,
        dosageForm: product.dosageForm,
        reorderLevel: product.reorderLevel,
        currentStock,
        lastSupplierId: product.lastSupplierId,
        lastSupplier: product.lastSupplier,
        suggestedOrderQuantity: Math.max(product.reorderLevel * 2 - currentStock, 1),
        criticalityRatio: currentStock / product.reorderLevel,
      };
    })
    .filter((product) => product.currentStock <= product.reorderLevel)
    .sort((a, b) => a.criticalityRatio - b.criticalityRatio || a.name.localeCompare(b.name));
}

export async function createStockOrder(
  pharmacyId: string,
  userId: string,
  data: { notes?: string; expectedBy?: string | null; items: StockOrderItemInput[] },
) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      await assertItemReferences(tx, pharmacyId, item);
    }

    const orderNumber = await nextOrderNumber(tx, pharmacyId);
    return tx.stockOrder.create({
      data: {
        pharmacyId,
        orderNumber,
        notes: cleanOptionalText(data.notes),
        expectedBy: toExpectedBy(data.expectedBy),
        createdBy: userId,
        items: { create: data.items.map(toItemCreateInput) },
      },
      include: fullOrderInclude(),
    });
  }));
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
  const order = await prisma.stockOrder.findFirst({
    where: { id: orderId, pharmacyId },
    include: fullOrderInclude(),
  });
  if (!order) {
    throw Object.assign(new Error('Stock order not found'), { status: 404 });
  }
  return order;
}

export async function updateStockOrder(pharmacyId: string, orderId: string, data: StockOrderUpdateInput) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    await getDraftOrder(tx, pharmacyId, orderId);
    return tx.stockOrder.update({
      where: { id: orderId },
      data: {
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        ...(data.expectedBy !== undefined ? { expectedBy: toExpectedBy(data.expectedBy) } : {}),
      },
      include: fullOrderInclude(),
    });
  }));
}

export async function addItemToStockOrder(pharmacyId: string, orderId: string, data: StockOrderItemInput) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    await getDraftOrder(tx, pharmacyId, orderId);
    await assertItemReferences(tx, pharmacyId, data);
    await tx.stockOrderItem.create({
      data: {
        ...toItemCreateInput(data),
        stockOrderId: orderId,
      },
    });
    return tx.stockOrder.findUniqueOrThrow({ where: { id: orderId }, include: fullOrderInclude() });
  }));
}

export async function updateStockOrderItem(
  pharmacyId: string,
  orderId: string,
  itemId: string,
  data: StockOrderItemUpdateInput,
) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    await getDraftOrder(tx, pharmacyId, orderId);
    await assertSupplierBelongsToPharmacy(tx, pharmacyId, data.supplierId);
    const item = await tx.stockOrderItem.findFirst({ where: { id: itemId, stockOrderId: orderId } });
    if (!item) {
      throw Object.assign(new Error('Stock order item not found'), { status: 404 });
    }

    await tx.stockOrderItem.update({
      where: { id: itemId },
      data: {
        ...(data.quantityOrdered !== undefined ? { quantityOrdered: data.quantityOrdered } : {}),
        ...(data.supplierId !== undefined ? { supplierId: data.supplierId || null } : {}),
        ...(data.expectedUnitCost !== undefined ? { expectedUnitCost: data.expectedUnitCost } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
      },
    });
    return tx.stockOrder.findUniqueOrThrow({ where: { id: orderId }, include: fullOrderInclude() });
  }));
}

export async function removeStockOrderItem(pharmacyId: string, orderId: string, itemId: string) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    await getDraftOrder(tx, pharmacyId, orderId);
    const remaining = await tx.stockOrderItem.count({ where: { stockOrderId: orderId, id: { not: itemId } } });
    if (remaining === 0) {
      throw Object.assign(new Error('An order must have at least one item.'), { status: 400 });
    }
    await tx.stockOrderItem.delete({ where: { id: itemId } });
    return tx.stockOrder.findUniqueOrThrow({ where: { id: orderId }, include: fullOrderInclude() });
  }));
}

export async function submitStockOrder(pharmacyId: string, orderId: string) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    await getDraftOrder(tx, pharmacyId, orderId);
    const itemCount = await tx.stockOrderItem.count({ where: { stockOrderId: orderId } });
    if (itemCount === 0) {
      throw Object.assign(new Error('An order must have at least one item.'), { status: 400 });
    }

    const updated = await tx.stockOrder.update({
      where: { id: orderId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
      include: fullOrderInclude(),
    });

    const supplierEmails = Array.from(
      new Set(updated.items.map((item) => item.supplier?.email).filter((email): email is string => Boolean(email))),
    );
    if (supplierEmails.length > 0) {
      console.info(`[stock-orders] Email notifications not configured; skipped ${supplierEmails.length} supplier email(s).`);
    }

    return updated;
  }));
}

export async function receiveStockOrderItems(
  pharmacyId: string,
  orderId: string,
  userId: string,
  receipts: ReceiptInput[],
) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    const order = await tx.stockOrder.findFirst({
      where: { id: orderId, pharmacyId, status: { in: ['SUBMITTED', 'PARTIALLY_RECEIVED'] } },
      include: { items: true },
    });
    if (!order) {
      throw Object.assign(new Error('Stock order is not open for receiving'), { status: 400 });
    }

    for (const receipt of receipts) {
      const item = order.items.find((entry) => entry.id === receipt.itemId);
      if (!item) {
        throw Object.assign(new Error('Stock order item not found'), { status: 404 });
      }
      if (!item.productId) {
        throw Object.assign(new Error('Cannot receive an item until it is linked to a product'), { status: 400 });
      }
      const remaining = item.quantityOrdered - item.quantityReceived;
      if (receipt.quantityReceived > remaining) {
        throw Object.assign(new Error('Received quantity exceeds outstanding quantity'), { status: 400 });
      }

      const batch = await tx.batch.create({
        data: {
          productId: item.productId,
          pharmacyId,
          batchNumber: receipt.batchNumber.trim(),
          expiryDate: new Date(receipt.expiryDate),
          quantityRemaining: receipt.quantityReceived,
          purchasePrice: receipt.unitCost,
          supplierId: item.supplierId,
        },
      });

      await tx.stockMovement.create({
        data: {
          pharmacyId,
          productId: item.productId,
          batchId: batch.id,
          userId,
          type: 'RECEIVED',
          quantity: receipt.quantityReceived,
          notes: `Received via ${order.orderNumber}`,
        },
      });

      const cumulativeReceived = item.quantityReceived + receipt.quantityReceived;
      await tx.stockOrderItem.update({
        where: { id: item.id },
        data: {
          quantityReceived: cumulativeReceived,
          status: cumulativeReceived >= item.quantityOrdered ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
        },
      });

      item.quantityReceived = cumulativeReceived;
      item.status = cumulativeReceived >= item.quantityOrdered ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      if (item.supplierId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { lastSupplierId: item.supplierId },
        });
      }
    }

    const freshItems = await tx.stockOrderItem.findMany({ where: { stockOrderId: orderId } });
    const nextStatus = freshItems.every((item) => item.status === 'RECEIVED' || item.status === 'CANCELLED')
      ? 'RECEIVED'
      : freshItems.some((item) => item.status === 'RECEIVED' || item.status === 'PARTIALLY_RECEIVED')
        ? 'PARTIALLY_RECEIVED'
        : order.status;

    return tx.stockOrder.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: fullOrderInclude(),
    });
  }));
}

export async function cancelStockOrder(pharmacyId: string, orderId: string) {
  const order = await prisma.stockOrder.findFirst({ where: { id: orderId, pharmacyId } });
  if (!order) {
    throw Object.assign(new Error('Stock order not found'), { status: 404 });
  }
  if (!['DRAFT', 'SUBMITTED'].includes(order.status)) {
    throw Object.assign(new Error('Only draft or submitted orders can be cancelled'), { status: 400 });
  }

  return prisma.stockOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' },
    include: fullOrderInclude(),
  });
}
