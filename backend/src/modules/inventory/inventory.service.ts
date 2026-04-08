import { MovementType, PaymentMethod, Prisma, StorageCondition } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = Prisma.InputJsonValue;
import { parse } from 'csv-parse/sync';
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';

export const EXPIRY_REPORT_DAY_THRESHOLDS = [1, 7, 30, 60, 90] as const;
export type ExpiryReportDays = (typeof EXPIRY_REPORT_DAY_THRESHOLDS)[number];
export const DEFAULT_EXPIRY_REPORT_DAYS: ExpiryReportDays = 30;

export function isExpiryReportDays(value: number): value is ExpiryReportDays {
  return (EXPIRY_REPORT_DAY_THRESHOLDS as readonly number[]).includes(value);
}

interface ProductFilters {
  lowStock?: boolean;
  nearExpiry?: boolean;
  category?: string;
  search?: string;
}

interface Pagination {
  page: number;
  limit: number;
}

interface BatchFilters {
  expiryFrom?: Date;
  expiryTo?: Date;
}

interface MovementFilters {
  productId?: string;
  type?: MovementType;
  dateFrom?: Date;
  dateTo?: Date;
}

interface DrugMasterFilters {
  search?: string;
  storageCondition?: StorageCondition;
  essential?: boolean;
}

interface RecordMovementData {
  productId: string;
  batchId?: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  notes?: string;
  referenceNumber?: string;
  userId: string;
}

interface CheckoutItemData {
  productId: string;
  quantity: number;
  dose?: string;
  icdCode?: string;
  notes?: string;
  unitPrice?: number;
}

interface CheckoutData {
  items: CheckoutItemData[];
  paymentMethod?: PaymentMethod;
  paymentRef?: string;
  patientId?: string;
  userId: string;
}

interface SyncData {
  products?: Record<string, unknown>[];
  batches?: Record<string, unknown>[];
  movements?: Record<string, unknown>[];
}

const optionalProductFields = [
  'genericName',
  'brandName',
  'drugClass',
  'description',
  'sku',
  'barcode',
  'dosageForm',
  'strength',
  'unitOfMeasure',
  'packSize',
  'storageCondition',
  'isColdChain',
  'tmdaRegistrationNumber',
  'sellingPrice',
  'purchasePriceDefault',
  'reorderLevel',
  'minStock',
  'isActive',
] as const;

function productRuntimeFields(): Set<string> {
  const runtimeModel = (
    prisma as unknown as {
      _runtimeDataModel?: {
        models?: {
          Product?: {
            fields?: Array<{ name: string }>;
          };
        };
      };
    }
  )._runtimeDataModel;

  return new Set(runtimeModel?.models?.Product?.fields?.map((field) => field.name) ?? []);
}

function compactProductData(data: Record<string, unknown>) {
  const runtimeFields = productRuntimeFields();
  const productData: Record<string, unknown> = {
    name: data.name,
  };

  for (const field of optionalProductFields) {
    if (runtimeFields.has(field) && data[field] !== undefined) {
      productData[field] = data[field];
    }
  }

  return productData;
}

function compactProductRelationData(data: Record<string, unknown>) {
  const runtimeFields = productRuntimeFields();
  const productData: Record<string, unknown> = compactProductData(data);

  if (
    runtimeFields.has('drugMasterId') &&
    typeof data.drugMasterId === 'string' &&
    data.drugMasterId.trim()
  ) {
    productData.drugMaster = { connect: { id: data.drugMasterId } };
  }

  return productData;
}

export class InventoryService {
  async listDrugMaster(filters: DrugMasterFilters, pagination: Pagination) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where: Prisma.DrugMasterWhereInput = {
      isActive: true,
    };
    const search = filters.search?.trim();

    if (search) {
      where.OR = [
        { genericName: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { tmdaRegistrationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filters.storageCondition) {
      where.storageCondition = filters.storageCondition;
    }

    if (filters.essential !== undefined) {
      where.isEssentialMedicine = filters.essential;
    }

    const [data, total] = await prisma.$transaction([
      prisma.drugMaster.findMany({
        where,
        orderBy: [{ isEssentialMedicine: 'desc' }, { genericName: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.drugMaster.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async searchDrugMaster(query: string) {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return [];

    return prisma.drugMaster.findMany({
      where: {
        isActive: true,
        OR: [
          { genericName: { contains: trimmedQuery, mode: 'insensitive' } },
          { brandName: { contains: trimmedQuery, mode: 'insensitive' } },
          { tmdaRegistrationNumber: { contains: trimmedQuery, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ isEssentialMedicine: 'desc' }, { genericName: 'asc' }],
      take: 20,
    });
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  async listProducts(
    pharmacyId: string,
    filters: ProductFilters,
    pagination: Pagination
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      pharmacyId,
      isActive: true,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { genericName: { contains: filters.search, mode: 'insensitive' } },
        { brandName: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        batches: {
          where: { pharmacyId },
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            quantityRemaining: true,
            purchasePrice: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    });

    const total = await prisma.product.count({ where });

    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let result = products.map((p) => {
      const currentStock = p.batches.reduce(
        (sum, b) => sum + b.quantityRemaining,
        0
      );
      const hasNearExpiry = p.batches.some(
        (b) => b.expiryDate <= thirtyDaysOut && b.quantityRemaining > 0
      );
      return { ...p, currentStock, hasNearExpiry };
    });

    if (filters.lowStock) {
      result = result.filter((p) => p.currentStock < p.reorderLevel);
    }
    if (filters.nearExpiry) {
      result = result.filter((p) => p.hasNearExpiry);
    }

    return {
      data: result,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createProduct(pharmacyId: string, data: Record<string, unknown>) {
    return prisma.product.create({
      data: {
        ...compactProductRelationData(data),
        pharmacy: { connect: { id: pharmacyId } },
      } as Prisma.ProductCreateInput,
    });
  }

  async updateProduct(
    id: string,
    pharmacyId: string,
    data: Record<string, unknown>
  ) {
    return prisma.product.update({
      where: { id, pharmacyId },
      data: compactProductRelationData(data) as Prisma.ProductUpdateInput,
    });
  }

  async getProductById(id: string, pharmacyId: string) {
    return prisma.product.findFirst({
      where: { id, pharmacyId },
      include: {
        batches: {
          where: { pharmacyId, quantityRemaining: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });
  }

  async getProductByBarcode(barcode: string, pharmacyId: string) {
    const product = await prisma.product.findFirst({
      where: { barcode, pharmacyId, isActive: true },
      include: {
        batches: {
          where: {
            pharmacyId,
            quantityRemaining: { gt: 0 },
          },
          orderBy: { expiryDate: 'asc' },
          take: 1,
        },
      },
    });
    return product;
  }

  async importProductsCsv(pharmacyId: string, csvBuffer: Buffer) {
    let records: Record<string, string>[];
    try {
      records = parse(csvBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch (err) {
      throw new Error(`CSV parse error: ${String(err)}`);
    }

    let imported = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        if (!row.name) throw new Error('name is required');
        const tmdaRegistrationNumber = row.tmdaRegistrationNumber?.trim() || null;
        let drugMasterId: string | null = null;

        if (tmdaRegistrationNumber) {
          const match = await prisma.drugMaster.findUnique({
            where: { tmdaRegistrationNumber },
            select: { id: true },
          });
          drugMasterId = match?.id ?? null;
        }

        await prisma.product.create({
          data: {
            name: row.name,
            genericName: row.genericName || null,
            brandName: row.brandName || null,
            sku: row.sku || null,
            barcode: row.barcode || null,
            dosageForm: row.dosageForm || null,
            strength: row.strength || null,
            unitOfMeasure: row.unitOfMeasure || 'units',
            packSize: row.packSize ? parseInt(row.packSize, 10) : 1,
            tmdaRegistrationNumber,
            drugMasterId,
            reorderLevel: row.reorderLevel ? parseInt(row.reorderLevel, 10) : 10,
            minStock: row.minStock ? parseInt(row.minStock, 10) : 5,
            pharmacyId,
          },
        });
        imported++;
      } catch (err) {
        errors.push({ row: i + 2, error: String(err) });
      }
    }

    return { imported, errors };
  }

  // ─── Batches ───────────────────────────────────────────────────────────────

  async listBatches(pharmacyId: string, filters: BatchFilters) {
    const where: Prisma.BatchWhereInput = { pharmacyId };

    if (filters.expiryFrom || filters.expiryTo) {
      where.expiryDate = {
        ...(filters.expiryFrom && { gte: filters.expiryFrom }),
        ...(filters.expiryTo && { lte: filters.expiryTo }),
      };
    }

    return prisma.batch.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, genericName: true, unitOfMeasure: true },
        },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async createBatch(
    pharmacyId: string,
    data: {
      productId: string;
      batchNumber: string;
      expiryDate: Date;
      quantityRemaining: number;
      purchasePrice: number;
      supplierId?: string;
      userId: string;
    }
  ) {
    const { userId, ...batchData } = data;

    // Get current balance for this product
    const lastMovement = await prisma.stockMovement.findFirst({
      where: { productId: data.productId, pharmacyId },
      orderBy: { createdAt: 'desc' },
    });
    const previousBalance = lastMovement ? lastMovement.newBalance : 0;
    const newBalance = previousBalance + data.quantityRemaining;

    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.batch.create({
        data: {
          ...batchData,
          pharmacyId,
        },
        include: {
          product: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: data.productId,
          batchId: newBatch.id,
          type: MovementType.RECEIVED,
          quantity: data.quantityRemaining,
          previousBalance,
          newBalance,
          referenceNumber: data.batchNumber,
          notes: `Batch ${data.batchNumber} received`,
          userId,
          pharmacyId,
        },
      });

      return newBatch;
    });

    return batch;
  }

  // ─── Stock Movements ───────────────────────────────────────────────────────

  async listMovements(
    pharmacyId: string,
    filters: MovementFilters,
    pagination: Pagination
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = { pharmacyId };

    if (filters.productId) where.productId = filters.productId;
    if (filters.type) where.type = filters.type;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom && { gte: filters.dateFrom }),
        ...(filters.dateTo && { lte: filters.dateTo }),
      };
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, genericName: true, unitOfMeasure: true } },
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
          batch: { select: { id: true, batchNumber: true, expiryDate: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async recordMovement(pharmacyId: string, data: RecordMovementData) {
    return prisma.$transaction(async (tx) => {
      const lastMovement = await tx.stockMovement.findFirst({
        where: { productId: data.productId, pharmacyId },
        orderBy: { createdAt: 'desc' },
      });
      const previousBalance = lastMovement ? lastMovement.newBalance : 0;

      let batchId = data.batchId;
      let newBalance = previousBalance;

      if (data.type === MovementType.DISPENSED) {
        const batch = batchId
          ? await tx.batch.findUnique({ where: { id: batchId } })
          : await tx.batch.findFirst({
              where: {
                productId: data.productId,
                product: { pharmacyId },
                quantityRemaining: { gt: 0 },
                expiryDate: { gt: new Date() },
              },
              orderBy: { expiryDate: 'asc' },
            });

        if (!batch || batch.quantityRemaining < data.quantity) {
          throw new Error(
            `Insufficient stock. Available: ${batch?.quantityRemaining ?? 0}, Requested: ${data.quantity}`
          );
        }

        batchId = batch.id;
        await tx.batch.update({
          where: { id: batch.id },
          data: { quantityRemaining: batch.quantityRemaining - data.quantity },
        });
        newBalance = previousBalance - data.quantity;
      } else if (
        data.type === MovementType.ADJUSTED ||
        data.type === MovementType.DAMAGED ||
        data.type === MovementType.EXPIRED_REMOVED
      ) {
        newBalance = previousBalance - data.quantity;
        if (batchId) {
          const batch = await tx.batch.findUnique({ where: { id: batchId } });
          if (batch) {
            await tx.batch.update({
              where: { id: batchId },
              data: { quantityRemaining: Math.max(0, batch.quantityRemaining - data.quantity) },
            });
          }
        }
      } else if (
        data.type === MovementType.RETURNED ||
        data.type === MovementType.DONATED ||
        data.type === MovementType.TRANSFERRED
      ) {
        newBalance = previousBalance - data.quantity;
        if (batchId) {
          const batch = await tx.batch.findUnique({ where: { id: batchId } });
          if (batch) {
            await tx.batch.update({
              where: { id: batchId },
              data: { quantityRemaining: Math.max(0, batch.quantityRemaining - data.quantity) },
            });
          }
        }
      } else if (data.type === MovementType.RECEIVED) {
        newBalance = previousBalance + data.quantity;
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          batchId: batchId || null,
          type: data.type,
          quantity: data.quantity,
          previousBalance,
          newBalance,
          reason: data.reason || null,
          notes: data.notes || null,
          referenceNumber: data.referenceNumber || null,
          userId: data.userId,
          pharmacyId,
        },
        include: {
          product: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          batch: { select: { id: true, batchNumber: true } },
        },
      });

      return movement;
    });
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  async checkoutCart(pharmacyId: string, data: CheckoutData) {
    if (!data.items.length) {
      throw new Error('At least one cart item is required');
    }

    const referenceNumber = `SALE-${Date.now().toString(36).toUpperCase()}`;
    const paymentMethod = data.paymentMethod ?? PaymentMethod.CASH;

    return prisma.$transaction(async (tx) => {
      const movements: Array<Record<string, unknown>> = [];
      let totalAmount = 0;

      for (const item of data.items) {
        if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error('Each cart item requires productId and a positive integer quantity');
        }

        const product = await tx.product.findFirst({
          where: { id: item.productId, pharmacyId, isActive: true },
          select: { id: true, name: true, genericName: true, sellingPrice: true },
        });
        if (!product) {
          throw new Error(`Product ${item.productId} was not found`);
        }

        const batch = await tx.batch.findFirst({
          where: {
            productId: item.productId,
            pharmacyId,
            quantityRemaining: { gte: item.quantity },
          },
          orderBy: { expiryDate: 'asc' },
        });
        if (!batch) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const lastMovement = await tx.stockMovement.findFirst({
          where: { productId: item.productId, pharmacyId },
          orderBy: { createdAt: 'desc' },
        });
        const previousBalance = lastMovement ? lastMovement.newBalance : batch.quantityRemaining;
        const newBalance = previousBalance - item.quantity;
        const unitPrice = product.sellingPrice ?? item.unitPrice ?? 0;
        const lineTotal = unitPrice * item.quantity;
        totalAmount += lineTotal;

        await tx.batch.update({
          where: { id: batch.id },
          data: { quantityRemaining: batch.quantityRemaining - item.quantity },
        });

        const notes = [
          `Checkout ${referenceNumber}`,
          `Payment: ${paymentMethod}`,
          data.paymentRef ? `Payment ref: ${data.paymentRef}` : null,
          data.patientId ? `Patient: ${data.patientId}` : null,
          `Unit price: ${unitPrice}`,
          `Line total: ${lineTotal}`,
          item.dose ? `Dose: ${item.dose}` : null,
          item.icdCode ? `ICD-10: ${item.icdCode}` : null,
          item.notes || null,
        ]
          .filter(Boolean)
          .join(' | ');

        const movement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            batchId: batch.id,
            type: MovementType.DISPENSED,
            quantity: item.quantity,
            previousBalance,
            newBalance,
            notes,
            referenceNumber,
            userId: data.userId,
            pharmacyId,
          },
          include: {
            product: { select: { id: true, name: true, genericName: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
            batch: { select: { id: true, batchNumber: true } },
          },
        });

        movements.push({ ...movement, unitPrice, lineTotal });
      }

      return {
        referenceNumber,
        paymentMethod,
        paymentRef: data.paymentRef ?? null,
        patientId: data.patientId ?? null,
        totalAmount,
        itemCount: data.items.length,
        movements,
        createdAt: new Date().toISOString(),
      };
    });
  }

  async getStockOnHand(pharmacyId: string) {
    const products = await prisma.product.findMany({
      where: { pharmacyId, isActive: true },
      include: {
        batches: {
          where: { pharmacyId },
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            quantityRemaining: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      ...p,
      currentStock: p.batches.reduce((sum, b) => sum + b.quantityRemaining, 0),
    }));
  }

  async getExpiryReport(
    pharmacyId: string,
    daysThreshold: number = DEFAULT_EXPIRY_REPORT_DAYS
  ) {
    if (!isExpiryReportDays(daysThreshold)) {
      throw new Error(
        `daysThreshold must be one of ${EXPIRY_REPORT_DAY_THRESHOLDS.join(', ')}`
      );
    }

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return prisma.batch.findMany({
      where: {
        pharmacyId,
        expiryDate: { lte: thresholdDate },
        quantityRemaining: { gt: 0 },
      },
      include: {
        product: { select: { id: true, name: true, genericName: true, unitOfMeasure: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getLowStockReport(pharmacyId: string) {
    const products = await this.getStockOnHand(pharmacyId);
    return products.filter((p) => p.currentStock < p.reorderLevel);
  }

  async getMovementsReport(
    pharmacyId: string,
    dateFrom: Date,
    dateTo: Date
  ) {
    return prisma.stockMovement.findMany({
      where: {
        pharmacyId,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      include: {
        product: { select: { id: true, name: true, genericName: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        batch: { select: { id: true, batchNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Offline Sync ──────────────────────────────────────────────────────────

  async syncOfflineData(pharmacyId: string, data: SyncData) {
    const results: {
      products?: { synced: number; conflicts: number };
      batches?: { synced: number; conflicts: number };
      movements?: { synced: number; conflicts: number };
    } = {};

    if (data.products && data.products.length > 0) {
      let synced = 0;
      let conflicts = 0;
      for (const p of data.products) {
        try {
          await prisma.product.upsert({
            where: { id: String(p.id || '') },
            update: {
              name: String(p.name),
              genericName: p.genericName ? String(p.genericName) : null,
              brandName: p.brandName ? String(p.brandName) : null,
              reorderLevel: p.reorderLevel ? Number(p.reorderLevel) : 10,
            },
            create: {
              name: String(p.name),
              genericName: p.genericName ? String(p.genericName) : null,
              brandName: p.brandName ? String(p.brandName) : null,
              pharmacyId,
            },
          });
          synced++;
        } catch (err) {
          conflicts++;
          await prisma.syncConflict.create({
            data: {
              table: 'Product',
              recordId: String(p.id || 'unknown'),
              localData: p as unknown as JsonValue,
              serverData: {} as JsonValue,
            },
          });
          logger.warn(`Sync conflict on product ${p.id}: ${String(err)}`);
        }
      }
      results.products = { synced, conflicts };
    }

    if (data.batches && data.batches.length > 0) {
      let synced = 0;
      let conflicts = 0;
      for (const b of data.batches) {
        try {
          await prisma.batch.upsert({
            where: { id: String(b.id || '') },
            update: {
              quantityRemaining: Number(b.quantityRemaining),
            },
            create: {
              batchNumber: String(b.batchNumber),
              expiryDate: new Date(String(b.expiryDate)),
              quantityRemaining: Number(b.quantityRemaining),
              purchasePrice: Number(b.purchasePrice),
              productId: String(b.productId),
              pharmacyId,
            },
          });
          synced++;
        } catch (err) {
          conflicts++;
          await prisma.syncConflict.create({
            data: {
              table: 'Batch',
              recordId: String(b.id || 'unknown'),
              localData: b as unknown as JsonValue,
              serverData: {} as JsonValue,
            },
          });
          logger.warn(`Sync conflict on batch ${b.id}: ${String(err)}`);
        }
      }
      results.batches = { synced, conflicts };
    }

    if (data.movements && data.movements.length > 0) {
      let synced = 0;
      let conflicts = 0;
      for (const m of data.movements) {
        try {
          const existing = await prisma.stockMovement.findUnique({
            where: { id: String(m.id || '') },
          });
          if (!existing) {
            const lastMv = await prisma.stockMovement.findFirst({
              where: { productId: String(m.productId), pharmacyId },
              orderBy: { createdAt: 'desc' },
            });
            const prevBal = lastMv ? lastMv.newBalance : 0;
            const qty = Number(m.quantity);
            const type = String(m.type) as MovementType;
            const isDeduction = (
              [
                MovementType.DISPENSED,
                MovementType.ADJUSTED,
                MovementType.DAMAGED,
                MovementType.EXPIRED_REMOVED,
                MovementType.RETURNED,
                MovementType.DONATED,
                MovementType.TRANSFERRED,
              ] as MovementType[]
            ).includes(type);
            const newBal = isDeduction ? prevBal - qty : prevBal + qty;

            await prisma.stockMovement.create({
              data: {
                id: String(m.id),
                productId: String(m.productId),
                batchId: m.batchId ? String(m.batchId) : null,
                type,
                quantity: qty,
                previousBalance: prevBal,
                newBalance: newBal,
                reason: m.reason ? String(m.reason) : null,
                notes: m.notes ? String(m.notes) : null,
                userId: String(m.userId),
                pharmacyId,
              },
            });
          }
          synced++;
        } catch (err) {
          conflicts++;
          await prisma.syncConflict.create({
            data: {
              table: 'StockMovement',
              recordId: String(m.id || 'unknown'),
              localData: m as unknown as JsonValue,
              serverData: {} as JsonValue,
            },
          });
          logger.warn(`Sync conflict on movement ${m.id}: ${String(err)}`);
        }
      }
      results.movements = { synced, conflicts };
    }

    return results;
  }
}

export default InventoryService;
