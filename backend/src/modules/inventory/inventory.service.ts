import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';

// ─── Products ────────────────────────────────────────────────────────────────

export async function listProducts(pharmacyId: string, params: {
  search?: string; page?: number; limit?: number; isActive?: boolean;
}) {
  const { search, page = 1, limit = 50, isActive = true } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    pharmacyId,
    isActive,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, skip, take: limit,
      orderBy: { name: 'asc' },
      include: {
        batches: {
          where: { quantityRemaining: { gt: 0 } },
          select: { quantityRemaining: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const enriched = products.map(p => ({
    ...p,
    currentStock: p.batches.reduce((sum, b) => sum + b.quantityRemaining, 0),
    batches: undefined,
  }));

  return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getProduct(id: string, pharmacyId: string) {
  const product = await prisma.product.findFirst({ where: { id, pharmacyId } });
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
  return product;
}

export async function createProduct(pharmacyId: string, data: Prisma.ProductUncheckedCreateInput) {
  return prisma.product.create({ data: { ...data, pharmacyId } });
}

export async function updateProduct(id: string, pharmacyId: string, data: Partial<Prisma.ProductUpdateInput>) {
  const product = await prisma.product.findFirst({ where: { id, pharmacyId } });
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
  return prisma.product.update({ where: { id }, data });
}

// ─── Batches ─────────────────────────────────────────────────────────────────

export async function listBatches(pharmacyId: string, params: {
  productId?: string; expiringDays?: number; page?: number; limit?: number;
}) {
  const { productId, expiringDays, page = 1, limit = 50 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.BatchWhereInput = {
    pharmacyId,
    quantityRemaining: { gt: 0 },
    ...(productId ? { productId } : {}),
    ...(expiringDays ? {
      expiryDate: { lte: new Date(Date.now() + expiringDays * 86400000) },
    } : {}),
  };

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where, skip, take: limit,
      orderBy: { expiryDate: 'asc' },
      include: { product: true, supplier: true },
    }),
    prisma.batch.count({ where }),
  ]);

  return { data: batches, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function receiveBatch(pharmacyId: string, userId: string, data: {
  productId: string;
  batchNumber: string;
  expiryDate: string;
  quantityRemaining: number;
  purchasePrice: number;
  supplierId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.create({
      data: {
        productId: data.productId,
        pharmacyId,
        batchNumber: data.batchNumber,
        expiryDate: new Date(data.expiryDate),
        quantityRemaining: data.quantityRemaining,
        purchasePrice: data.purchasePrice,
        supplierId: data.supplierId,
      },
    });

    await tx.stockMovement.create({
      data: {
        pharmacyId,
        productId: data.productId,
        batchId: batch.id,
        userId,
        type: 'RECEIVED',
        quantity: data.quantityRemaining,
      },
    });

    return batch;
  });
}

// ─── Stock movements ─────────────────────────────────────────────────────────

export async function listMovements(pharmacyId: string, params: {
  productId?: string; type?: string; dateFrom?: string; dateTo?: string;
  page?: number; limit?: number;
}) {
  const { productId, type, dateFrom, dateTo, page = 1, limit = 50 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.StockMovementWhereInput = {
    pharmacyId,
    ...(productId ? { productId } : {}),
    ...(type ? { type: type as any } : {}),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
      },
    } : {}),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, genericName: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { data: movements, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function adjustStock(pharmacyId: string, userId: string, data: {
  productId: string;
  batchId?: string;
  type: 'ADJUSTED' | 'DAMAGED' | 'EXPIRED_REMOVED' | 'RETURNED';
  quantity: number;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    if (data.batchId) {
      const batch = await tx.batch.findFirst({
        where: { id: data.batchId, pharmacyId },
      });
      if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

      const delta = data.type === 'RETURNED' ? data.quantity : -data.quantity;
      await tx.batch.update({
        where: { id: data.batchId },
        data: { quantityRemaining: { increment: delta } },
      });
    }

    return tx.stockMovement.create({
      data: {
        pharmacyId,
        productId: data.productId,
        batchId: data.batchId,
        userId,
        type: data.type,
        quantity: data.quantity,
        notes: data.notes,
      },
    });
  });
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function listSuppliers(pharmacyId: string) {
  return prisma.supplier.findMany({
    where: { pharmacyId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function stockOnHand(pharmacyId: string) {
  const products = await prisma.product.findMany({
    where: { pharmacyId, isActive: true },
    include: {
      batches: {
        where: { quantityRemaining: { gt: 0 } },
        select: { quantityRemaining: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return products.map(p => ({
    ...p,
    currentStock: p.batches.reduce((sum, b) => sum + b.quantityRemaining, 0),
    batches: undefined,
  }));
}

export async function expiryReport(pharmacyId: string, days = 30) {
  return prisma.batch.findMany({
    where: {
      pharmacyId,
      quantityRemaining: { gt: 0 },
      expiryDate: { lte: new Date(Date.now() + days * 86400000) },
    },
    include: { product: { select: { id: true, name: true, genericName: true } } },
    orderBy: { expiryDate: 'asc' },
  });
}

// ─── Drug master ──────────────────────────────────────────────────────────────

export async function searchDrugMaster(query: string, limit = 20) {
  return prisma.drugMaster.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { genericName: { contains: query, mode: 'insensitive' } },
        { msdCode: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { name: 'asc' },
  });
}
