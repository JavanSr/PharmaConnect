import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import type { Prisma, SyncConflictStatus } from '@prisma/client';

type ProductWriteInput = {
  name: string;
  genericName?: string;
  brandName?: string;
  sku?: string;
  barcode?: string;
  dosageForm?: string;
  strength?: string;
  unitOfMeasure?: string;
  drugClass?: string;
  description?: string;
  reorderLevel?: number;
  sellingPrice?: number;
  tmda?: string;
  tmdaRegistrationNumber?: string;
  coldChainRequired?: boolean;
  storageCondition?: string;
  retailStock?: boolean;
  wholesaleStock?: boolean;
  wholesaleSellingPrice?: number;
  manufacturer?: string;
  therapeuticCategory?: string;
  drugMasterId?: string;
};

type SupplierWriteInput = {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type CsvImportResult = {
  inserted: number;
  errors: Array<{ row: number; field: string; message: string }>;
};

type StockAdjustmentSuggestionPhoto = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

type SuggestionReviewStatus = 'APPROVED' | 'REJECTED' | 'PARTIAL';

function stockAdjustmentSuggestionInclude() {
  return {
    product: {
      select: {
        id: true,
        name: true,
        genericName: true,
      },
    },
    batch: {
      select: {
        id: true,
        batchNumber: true,
        expiryDate: true,
      },
    },
    creator: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    },
    reviewer: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    },
  };
}

function productInclude() {
  return {
    batches: {
      where: { quantityRemaining: { gt: 0 } },
      select: {
        id: true,
        batchNumber: true,
        expiryDate: true,
        quantityRemaining: true,
        receivedAt: true,
      },
      orderBy: [{ expiryDate: 'asc' as const }, { receivedAt: 'asc' as const }],
    },
  };
}

function toProductData(pharmacyId: string, data: ProductWriteInput): Prisma.ProductUncheckedCreateInput {
  return {
    pharmacyId,
    name: data.name.trim(),
    genericName: data.genericName?.trim() || undefined,
    brandName: data.brandName?.trim() || undefined,
    sku: data.sku?.trim() || undefined,
    barcode: data.barcode?.trim() || undefined,
    dosageForm: (data.dosageForm as any) || 'TABLET',
    strength: data.strength?.trim() || undefined,
    unitOfMeasure: data.unitOfMeasure?.trim() || 'unit',
    drugClass: (data.drugClass as any) || 'OTC',
    description: data.description?.trim() || undefined,
    reorderLevel: data.reorderLevel ?? 10,
    sellingPrice: data.sellingPrice,
    tmda: data.tmda?.trim() || undefined,
    tmdaRegistrationNumber: data.tmdaRegistrationNumber?.trim() || undefined,
    coldChainRequired: data.coldChainRequired ?? false,
    storageCondition: data.storageCondition?.trim() || 'AMBIENT',
    retailStock: data.retailStock ?? true,
    wholesaleStock: data.wholesaleStock ?? false,
    wholesaleSellingPrice: data.wholesaleSellingPrice,
    manufacturer: data.manufacturer?.trim() || undefined,
    therapeuticCategory: data.therapeuticCategory?.trim() || undefined,
    drugMasterId: data.drugMasterId || undefined,
  };
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value || value.trim() === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCsv(csv: string): Array<Record<string, string>> {
  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].split(',').map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const cells = row.split(',').map((cell) => cell.trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = cells[index] ?? '';
      return acc;
    }, {});
  });
}

export async function listProducts(
  pharmacyId: string,
  params: { search?: string; barcode?: string; sku?: string; page?: number; limit?: number; isActive?: boolean },
) {
  const { search, barcode, sku, page = 1, limit = 50, isActive = true } = params;
  const skip = (page - 1) * limit;

  if ((barcode || sku) && !search) {
    const products = await withPrismaRetry(() => prisma.product.findMany({
      where: {
        pharmacyId,
        isActive,
        ...(barcode ? { barcode } : {}),
        ...(sku ? { sku } : {}),
      },
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        pharmacyId: true,
        name: true,
        genericName: true,
        brandName: true,
        sku: true,
        barcode: true,
        dosageForm: true,
        strength: true,
        unitOfMeasure: true,
        drugClass: true,
        description: true,
        reorderLevel: true,
        sellingPrice: true,
        tmda: true,
        tmdaRegistrationNumber: true,
        coldChainRequired: true,
        storageCondition: true,
        retailStock: true,
        wholesaleStock: true,
        wholesaleSellingPrice: true,
        manufacturer: true,
        therapeuticCategory: true,
        isActive: true,
        createdAt: true,
      },
    }));

    return {
      data: products,
      total: products.length,
      page: 1,
      limit,
      totalPages: products.length > 0 ? 1 : 0,
    };
  }

  const where: Prisma.ProductWhereInput = {
    pharmacyId,
    isActive,
    ...(barcode ? { barcode } : {}),
    ...(sku ? { sku } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { genericName: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [products, total] = await withPrismaRetry(() => Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: productInclude(),
    }),
    prisma.product.count({ where }),
  ]));

  const enriched = products.map((product) => ({
    ...product,
    currentStock: product.batches.reduce((sum, batch) => sum + batch.quantityRemaining, 0),
    nextExpiringBatch: product.batches[0] ?? null,
  }));

  return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getProduct(id: string, pharmacyId: string) {
  const product = await prisma.product.findFirst({
    where: { id, pharmacyId },
    include: productInclude(),
  });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  return {
    ...product,
    currentStock: product.batches.reduce((sum, batch) => sum + batch.quantityRemaining, 0),
  };
}

export async function createProduct(pharmacyId: string, data: ProductWriteInput) {
  return prisma.product.create({ data: toProductData(pharmacyId, data) });
}

export async function updateProduct(id: string, pharmacyId: string, data: Partial<ProductWriteInput>) {
  const product = await prisma.product.findFirst({ where: { id, pharmacyId } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  return prisma.product.update({
    where: { id },
    data: toProductData(pharmacyId, {
      name: data.name ?? product.name,
      genericName: data.genericName ?? product.genericName ?? undefined,
      brandName: data.brandName ?? product.brandName ?? undefined,
      sku: data.sku ?? product.sku ?? undefined,
      barcode: data.barcode ?? product.barcode ?? undefined,
      dosageForm: data.dosageForm ?? product.dosageForm,
      strength: data.strength ?? product.strength ?? undefined,
      unitOfMeasure: data.unitOfMeasure ?? product.unitOfMeasure,
      drugClass: data.drugClass ?? product.drugClass,
      description: data.description ?? product.description ?? undefined,
      reorderLevel: data.reorderLevel ?? product.reorderLevel,
      sellingPrice: data.sellingPrice ?? (product.sellingPrice != null ? Number(product.sellingPrice) : undefined),
      tmda: data.tmda ?? product.tmda ?? undefined,
      tmdaRegistrationNumber: data.tmdaRegistrationNumber ?? product.tmdaRegistrationNumber ?? undefined,
      coldChainRequired: data.coldChainRequired ?? product.coldChainRequired,
      storageCondition: data.storageCondition ?? product.storageCondition,
      retailStock: data.retailStock ?? product.retailStock,
      wholesaleStock: data.wholesaleStock ?? product.wholesaleStock,
      wholesaleSellingPrice:
        data.wholesaleSellingPrice ??
        (product.wholesaleSellingPrice != null ? Number(product.wholesaleSellingPrice) : undefined),
      manufacturer: data.manufacturer ?? product.manufacturer ?? undefined,
      therapeuticCategory: data.therapeuticCategory ?? product.therapeuticCategory ?? undefined,
      drugMasterId: data.drugMasterId ?? product.drugMasterId ?? undefined,
    }),
  });
}

export async function fefoQuery(pharmacyId: string, productId: string, quantityRequired = 1) {
  const batches = await prisma.batch.findMany({
    where: {
      pharmacyId,
      productId,
      quantityRemaining: { gt: 0 },
    },
    orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          genericName: true,
        },
      },
    },
  });

  return batches.map((batch, index) => ({
    ...batch,
    fefoRank: index + 1,
    satisfiesQuantity: batch.quantityRemaining >= quantityRequired,
  }));
}

export async function resolveFefoBatch(pharmacyId: string, productId: string, quantityRequired = 1) {
  const batches = await fefoQuery(pharmacyId, productId, quantityRequired);
  const batch = batches.find((entry) => entry.satisfiesQuantity);

  if (!batch) {
    throw Object.assign(new Error('No FEFO batch has enough stock for this request'), { status: 409 });
  }

  return batch;
}

export async function listBatches(
  pharmacyId: string,
  params: { productId?: string; expiringDays?: number; page?: number; limit?: number },
) {
  const { productId, expiringDays, page = 1, limit = 50 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.BatchWhereInput = {
    pharmacyId,
    quantityRemaining: { gt: 0 },
    ...(productId ? { productId } : {}),
    ...(expiringDays
      ? {
          expiryDate: { lte: new Date(Date.now() + expiringDays * 86400000) },
        }
      : {}),
  };

  const [batches, total] = await withPrismaRetry(() => Promise.all([
    prisma.batch.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
      include: { product: true, supplier: true },
    }),
    prisma.batch.count({ where }),
  ]));

  return { data: batches, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function receiveBatch(
  pharmacyId: string,
  userId: string,
  data: {
    productId: string;
    batchNumber: string;
    expiryDate: string;
    quantityRemaining: number;
    purchasePrice: number;
    supplierId?: string;
  },
) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
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
        notes: 'Stock intake',
      },
    });

    return batch;
  }));
}

export async function listMovements(
  pharmacyId: string,
  params: {
    productId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
) {
  const { productId, type, dateFrom, dateTo, page = 1, limit = 50 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.StockMovementWhereInput = {
    pharmacyId,
    ...(productId ? { productId } : {}),
    ...(type ? { type: type as any } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
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

export async function adjustStock(
  pharmacyId: string,
  userId: string,
  data: {
    productId: string;
    batchId?: string;
    type: 'ADJUSTED' | 'DAMAGED' | 'EXPIRED_REMOVED' | 'RETURNED';
    quantity: number;
    notes?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    let targetBatchId = data.batchId;

    if (!targetBatchId) {
      const fefoBatch = await resolveFefoBatch(pharmacyId, data.productId, data.quantity);
      targetBatchId = fefoBatch.id;
    }

    const batch = await tx.batch.findFirst({
      where: { id: targetBatchId, pharmacyId },
    });
    if (!batch) {
      throw Object.assign(new Error('Batch not found'), { status: 404 });
    }

    const delta = data.type === 'RETURNED' ? data.quantity : -data.quantity;
    await tx.batch.update({
      where: { id: batch.id },
      data: { quantityRemaining: { increment: delta } },
    });

    return tx.stockMovement.create({
      data: {
        pharmacyId,
        productId: data.productId,
        batchId: batch.id,
        userId,
        type: data.type,
        quantity: data.quantity,
        notes: data.notes,
      },
    });
  });
}

function toApprovedSuggestionMovementType(reason: string, quantityDelta: number): 'ADJUSTED' | 'DAMAGED' | 'EXPIRED_REMOVED' | 'RETURNED' {
  if (quantityDelta > 0) {
    return 'ADJUSTED';
  }

  switch (reason) {
    case 'DAMAGED':
      return 'DAMAGED';
    case 'EXPIRED':
      return 'EXPIRED_REMOVED';
    case 'RETURN_TO_SUPPLIER':
      return 'RETURNED';
    default:
      return 'ADJUSTED';
  }
}

async function resolveSuggestionBatch(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  suggestion: {
    batchId: string | null;
    productId: string;
  },
  approvedQuantityDelta: number,
) {
  if (suggestion.batchId) {
    const batch = await tx.batch.findFirst({
      where: {
        id: suggestion.batchId,
        pharmacyId,
        productId: suggestion.productId,
      },
    });

    if (!batch) {
      throw Object.assign(new Error('Batch not found'), { status: 404 });
    }

    return batch;
  }

  if (approvedQuantityDelta < 0) {
    const batch = await tx.batch.findFirst({
      where: {
        pharmacyId,
        productId: suggestion.productId,
        quantityRemaining: { gte: Math.abs(approvedQuantityDelta) },
      },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    });

    if (!batch) {
      throw Object.assign(new Error('No FEFO batch has enough stock for this approval'), { status: 409 });
    }

    return batch;
  }

  const batch = await tx.batch.findFirst({
    where: {
      pharmacyId,
      productId: suggestion.productId,
    },
    orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
  });

  if (!batch) {
    throw Object.assign(new Error('Batch is required before approving a positive stock correction'), { status: 409 });
  }

  return batch;
}

function buildApprovedSuggestionNotes(
  suggestion: {
    id: string;
    reason: string;
    note: string | null;
  },
  reviewNote: string | undefined,
) {
  return [
    `Approved from suggestion ${suggestion.id}`,
    `reason=${suggestion.reason}`,
    suggestion.note?.trim() || null,
    reviewNote?.trim() || null,
  ]
    .filter(Boolean)
    .join(' | ');
}

async function storeStockAdjustmentSuggestionPhoto(photo: StockAdjustmentSuggestionPhoto) {
  const uploadsRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
  const suggestionDir = path.join(uploadsRoot, 'stock-adjustment-suggestions');
  await mkdir(suggestionDir, { recursive: true });

  const extension = path.extname(photo.originalname || '').toLowerCase();
  const safeExtension = extension && extension.length <= 10 ? extension : '.jpg';
  const filename = `${randomUUID()}${safeExtension}`;
  const absolutePath = path.join(suggestionDir, filename);
  await writeFile(absolutePath, photo.buffer);

  return path.join('uploads', 'stock-adjustment-suggestions', filename).replace(/\\/g, '/');
}

export async function createStockAdjustmentSuggestion(
  pharmacyId: string,
  userId: string,
  data: {
    productId: string;
    batchId?: string;
    quantityDelta: number;
    reason: string;
    note?: string;
    photo?: StockAdjustmentSuggestionPhoto;
  },
) {
  const product = await prisma.product.findFirst({
    where: {
      id: data.productId,
      pharmacyId,
    },
    select: {
      id: true,
      name: true,
      genericName: true,
    },
  });

  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  if (data.batchId) {
    const batch = await prisma.batch.findFirst({
      where: {
        id: data.batchId,
        pharmacyId,
        productId: data.productId,
      },
      select: { id: true },
    });

    if (!batch) {
      throw Object.assign(new Error('Batch not found'), { status: 404 });
    }
  }

  const photoPath = data.photo ? await storeStockAdjustmentSuggestionPhoto(data.photo) : undefined;

  return prisma.stockAdjustmentSuggestion.create({
    data: {
      pharmacyId,
      productId: data.productId,
      batchId: data.batchId,
      quantityDelta: data.quantityDelta,
      reason: data.reason,
      note: data.note,
      photoPath,
      createdBy: userId,
    },
    include: stockAdjustmentSuggestionInclude(),
  });
}

export async function listStockAdjustmentSuggestions(
  pharmacyId: string,
  params: { status?: string; limit?: number } = {},
) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);

  return prisma.stockAdjustmentSuggestion.findMany({
    where: {
      pharmacyId,
      ...(params.status ? { status: params.status } : {}),
    },
    include: stockAdjustmentSuggestionInclude(),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  });
}

export async function reviewStockAdjustmentSuggestion(
  pharmacyId: string,
  reviewerUserId: string,
  suggestionId: string,
  data: {
    status: SuggestionReviewStatus;
    approvedQuantityDelta?: number;
    reviewNote?: string;
  },
) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    const suggestion = await tx.stockAdjustmentSuggestion.findFirst({
      where: {
        id: suggestionId,
        pharmacyId,
      },
    });

    if (!suggestion) {
      throw Object.assign(new Error('Stock adjustment suggestion not found'), { status: 404 });
    }

    if (suggestion.status !== 'PENDING') {
      throw Object.assign(new Error('Stock adjustment suggestion has already been reviewed'), { status: 409 });
    }

    let approvedQuantityDelta: number | null = null;
    if (data.status === 'APPROVED') {
      approvedQuantityDelta = data.approvedQuantityDelta ?? suggestion.quantityDelta;
    }

    if (data.status === 'PARTIAL') {
      approvedQuantityDelta = data.approvedQuantityDelta ?? null;
      if (!approvedQuantityDelta || approvedQuantityDelta === 0) {
        throw Object.assign(new Error('Approved quantity delta is required for partial review'), { status: 400 });
      }

      const requestedDirection = Math.sign(suggestion.quantityDelta);
      if (Math.sign(approvedQuantityDelta) !== requestedDirection) {
        throw Object.assign(new Error('Approved quantity delta must keep the same direction as the request'), { status: 400 });
      }

      if (Math.abs(approvedQuantityDelta) >= Math.abs(suggestion.quantityDelta)) {
        throw Object.assign(new Error('Partial quantity delta must be smaller than the requested quantity delta'), { status: 400 });
      }
    }

    if (data.status === 'APPROVED' && approvedQuantityDelta !== null && Math.sign(approvedQuantityDelta) !== Math.sign(suggestion.quantityDelta)) {
      throw Object.assign(new Error('Approved quantity delta must keep the same direction as the request'), { status: 400 });
    }

    if (approvedQuantityDelta !== null) {
      const batch = await resolveSuggestionBatch(tx, pharmacyId, suggestion, approvedQuantityDelta);
      const nextQuantity = batch.quantityRemaining + approvedQuantityDelta;

      if (nextQuantity < 0) {
        throw Object.assign(new Error('Approved quantity delta exceeds batch stock'), { status: 409 });
      }

      await tx.batch.update({
        where: { id: batch.id },
        data: { quantityRemaining: { increment: approvedQuantityDelta } },
      });

      await tx.stockMovement.create({
        data: {
          pharmacyId,
          productId: suggestion.productId,
          batchId: batch.id,
          userId: reviewerUserId,
          type: toApprovedSuggestionMovementType(suggestion.reason, approvedQuantityDelta),
          quantity: Math.abs(approvedQuantityDelta),
          notes: buildApprovedSuggestionNotes(suggestion, data.reviewNote),
        },
      });
    }

    await tx.stockAdjustmentSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: data.status,
        approvedQuantityDelta,
        reviewNote: data.reviewNote?.trim() || null,
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    return tx.stockAdjustmentSuggestion.findUniqueOrThrow({
      where: { id: suggestion.id },
      include: stockAdjustmentSuggestionInclude(),
    });
  }));
}

export async function listSuppliers(pharmacyId: string) {
  return prisma.supplier.findMany({
    where: { pharmacyId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createSupplier(pharmacyId: string, data: SupplierWriteInput) {
  return prisma.supplier.create({
    data: {
      pharmacyId,
      name: data.name.trim(),
      contactName: data.contactName?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      address: data.address?.trim() || undefined,
    },
  });
}

export async function updateSupplier(pharmacyId: string, supplierId: string, data: SupplierWriteInput) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, pharmacyId },
  });
  if (!supplier) {
    throw Object.assign(new Error('Supplier not found'), { status: 404 });
  }

  return prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: data.name.trim(),
      contactName: data.contactName?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
    },
  });
}

export async function deactivateSupplier(pharmacyId: string, supplierId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, pharmacyId },
  });
  if (!supplier) {
    throw Object.assign(new Error('Supplier not found'), { status: 404 });
  }

  return prisma.supplier.update({
    where: { id: supplierId },
    data: { isActive: false },
  });
}

export async function stockOnHand(pharmacyId: string) {
  const products = await prisma.product.findMany({
    where: { pharmacyId, isActive: true },
    include: productInclude(),
    orderBy: { name: 'asc' },
  });

  return products.map((product) => {
    const currentStock = product.batches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);
    return {
      ...product,
      currentStock,
      nextExpiringBatch: product.batches[0] ?? null,
    };
  });
}

export async function expiryReport(pharmacyId: string, days = 30) {
  return prisma.batch.findMany({
    where: {
      pharmacyId,
      quantityRemaining: { gt: 0 },
      expiryDate: { lte: new Date(Date.now() + days * 86400000) },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          genericName: true,
          coldChainRequired: true,
        },
      },
    },
    orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
  });
}

export async function lowStockReport(pharmacyId: string) {
  const products = await stockOnHand(pharmacyId);
  return products
    .filter((product) => (product.currentStock ?? 0) <= product.reorderLevel)
    .map((product) => ({
      ...product,
      shortage: Math.max(product.reorderLevel - (product.currentStock ?? 0), 0),
    }))
    .sort((a, b) => (a.currentStock ?? 0) - (b.currentStock ?? 0));
}

export async function listSyncConflicts(pharmacyId: string, status?: SyncConflictStatus) {
  return prisma.syncConflict.findMany({
    where: {
      pharmacyId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createSyncConflict(
  pharmacyId: string,
  payload: {
    entityType: string;
    entityId: string;
    conflictType: string;
    localPayload?: Prisma.InputJsonValue;
    serverPayload?: Prisma.InputJsonValue;
  },
) {
  return prisma.syncConflict.create({
    data: {
      pharmacyId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      conflictType: payload.conflictType,
      localPayload: payload.localPayload ?? {},
      serverPayload: payload.serverPayload ?? {},
    },
  });
}

export async function resolveSyncConflict(pharmacyId: string, conflictId: string, userId: string) {
  const conflict = await prisma.syncConflict.findFirst({
    where: { id: conflictId, pharmacyId },
  });
  if (!conflict) {
    throw Object.assign(new Error('Conflict not found'), { status: 404 });
  }

  return prisma.syncConflict.update({
    where: { id: conflictId },
    data: {
      status: 'RESOLVED',
      resolvedBy: userId,
      resolvedAt: new Date(),
    },
  });
}

export async function importProductsFromCsv(pharmacyId: string, csv: string): Promise<CsvImportResult> {
  const rows = parseCsv(csv);
  const errors: CsvImportResult['errors'] = [];

  if (rows.length === 0) {
    return {
      inserted: 0,
      errors: [{ row: 0, field: 'csv', message: 'CSV must contain a header row and at least one data row' }],
    };
  }

  const normalizedRows = rows.map((row, index) => {
    const name = row.name?.trim();
    if (!name) {
      errors.push({ row: index + 2, field: 'name', message: 'Name is required' });
    }

    const reorderLevel = parseNumber(row.reorderLevel);
    if (row.reorderLevel && reorderLevel === undefined) {
      errors.push({ row: index + 2, field: 'reorderLevel', message: 'Reorder level must be numeric' });
    }

    const sellingPrice = parseNumber(row.sellingPrice);
    if (row.sellingPrice && sellingPrice === undefined) {
      errors.push({ row: index + 2, field: 'sellingPrice', message: 'Selling price must be numeric' });
    }

    const wholesaleSellingPrice = parseNumber(row.wholesaleSellingPrice);
    if (row.wholesaleSellingPrice && wholesaleSellingPrice === undefined) {
      errors.push({ row: index + 2, field: 'wholesaleSellingPrice', message: 'Wholesale selling price must be numeric' });
    }

    return {
      name: name ?? '',
      genericName: row.genericName,
      brandName: row.brandName,
      sku: row.sku,
      barcode: row.barcode,
      dosageForm: row.dosageForm,
      strength: row.strength,
      unitOfMeasure: row.unitOfMeasure,
      drugClass: row.drugClass,
      description: row.description,
      reorderLevel,
      sellingPrice,
      tmda: row.tmda,
      tmdaRegistrationNumber: row.tmdaRegistrationNumber,
      coldChainRequired: parseBoolean(row.coldChainRequired, false),
      storageCondition: row.storageCondition || 'AMBIENT',
      retailStock: parseBoolean(row.retailStock, true),
      wholesaleStock: parseBoolean(row.wholesaleStock, false),
      wholesaleSellingPrice,
      manufacturer: row.manufacturer,
      therapeuticCategory: row.therapeuticCategory,
    };
  });

  if (errors.length > 0) {
    return { inserted: 0, errors };
  }

  await prisma.$transaction(
    normalizedRows.map((row) =>
      prisma.product.create({
        data: toProductData(pharmacyId, row),
      }),
    ),
  );

  return { inserted: normalizedRows.length, errors: [] };
}

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

export async function alertAlreadySentToday(
  pharmacyId: string,
  referenceId: string,
  channel: 'SMS' | 'EMAIL' | 'IN_APP' | 'WHATSAPP',
) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  return prisma.alertLog.findFirst({
    where: {
      pharmacyId,
      referenceId,
      channel,
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });
}
