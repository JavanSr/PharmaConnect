import { Router } from 'express';
import type { NextFunction, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import type { AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { requireTier } from '../../middleware/tier';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { prisma } from '../../lib/prisma';
import * as svc from './inventory.service';
import { emitToPharmacy } from '../realtime/realtime.service';

const productSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  brandName: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  dosageForm: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'INHALER', 'SUPPOSITORY', 'POWDER', 'SOLUTION', 'OTHER']).optional(),
  strength: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  drugClass: z.enum(['OTC', 'PRESCRIPTION', 'CONTROLLED', 'NARCOTIC']).optional(),
  description: z.string().optional(),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  tmda: z.string().optional(),
  tmdaRegistrationNumber: z.string().optional(),
  coldChainRequired: z.boolean().optional(),
  storageCondition: z.string().optional(),
  retailStock: z.boolean().optional(),
  wholesaleStock: z.boolean().optional(),
  wholesaleSellingPrice: z.coerce.number().min(0).optional(),
  manufacturer: z.string().optional(),
  therapeuticCategory: z.string().optional(),
  drugMasterId: z.string().optional(),
  lastSupplierId: z.string().optional(),
});

const supplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}
const uid = (req: AuthRequest) => req.user!.userId;
const canReviewStockAdjustmentSuggestions = (req: AuthRequest) =>
  ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(req.user?.normalizedRole ?? '');
const DISPENSER_SUPPLIER_WRITE_KEY = 'inventory.dispenser_supplier_write';

async function requireDispenserSupplierWrite(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user?.normalizedRole !== 'DISPENSER') {
      next();
      return;
    }

    const setting = await prisma.pharmacySetting.findUnique({
      where: {
        pharmacyId_key: {
          pharmacyId: pid(req),
          key: DISPENSER_SUPPLIER_WRITE_KEY,
        },
      },
      select: { value: true },
    });

    const value = setting?.value;
    const enabled = value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).enabled !== false
      : true;

    if (!enabled) {
      res.status(403).json({
        error: 'SUPPLIER_WRITE_DISABLED',
        message: 'Owner has disabled supplier changes for dispensers.',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

inventoryRouter.get('/products', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const params = z
      .object({
        search: z.string().optional(),
        barcode: z.string().optional(),
        sku: z.string().optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
        storageCondition: z.string().optional(),
        sortBy: z.string().optional(),
        lowStock: z.coerce.boolean().optional(),
      })
      .parse(req.query);
    res.json(await svc.listProducts(pid(req), params));
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/products/unverified', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const { limit } = z
      .object({
        limit: z.coerce.number().optional(),
      })
      .parse(req.query);
    res.json({ data: await svc.listUnverifiedProducts(pid(req), limit) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/products/suggestions', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const params = z
      .object({
        search: z.string().optional(),
        barcode: z.string().optional(),
        sku: z.string().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(req.query);
    res.json(await svc.suggestProducts(pid(req), params));
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/products/offline-cache', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const params = z
      .object({
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(req.query);
    res.json(await svc.listProductsForOfflineCache(pid(req), params));
  } catch (e) {
    next(e);
  }
});

// Lightweight 5-second polling endpoint — only stock levels and nearest expiry,
// no product metadata. Used by dispensing and inventory pages for live sync.
inventoryRouter.get('/products/stock-snapshot', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const pharmacyId = pid(req);
    const rows = await prisma.batch.groupBy({
      by: ['productId'],
      where: { pharmacyId, quantityRemaining: { gt: 0 } },
      _sum: { quantityRemaining: true },
      _min: { expiryDate: true },
    });
    res.json({
      data: rows.map((r) => ({
        id: r.productId,
        currentStock: r._sum.quantityRemaining ?? 0,
        nextExpiryDate: r._min.expiryDate ?? null,
      })),
    });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/products/:id', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.getProduct(req.params.id, pid(req)) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post('/barcode-lookup', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const { barcode } = z
      .object({
        barcode: z.string().trim().min(1),
      })
      .parse(req.body);

    res.json({
      data: await svc.lookupBarcodeForReceiving(pid(req), uid(req), barcode),
    });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post('/barcode-mappings', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z
      .object({
        barcode: z.string().trim().min(1),
        productId: z.string().min(1),
        source: z.literal('USER_MAP').default('USER_MAP'),
        // sharedToNetwork: only OWNER and PIC may share; other roles silently coerced to false
        sharedToNetwork: z.boolean().optional().default(false),
      })
      .parse(req.body);

    const role = req.user?.role;
    const canShare = role === 'OWNER' || role === 'PHARMACIST_IN_CHARGE';

    res.status(201).json({
      data: await svc.saveProductBarcodeMapping(pid(req), uid(req), {
        ...payload,
        sharedToNetwork: canShare ? payload.sharedToNetwork : false,
      }),
    });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/products/:id/fefo', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const { quantity = 1 } = z.object({ quantity: z.coerce.number().int().positive().optional() }).parse(req.query);
    res.json({ data: await svc.fefoQuery(pid(req), req.params.id, quantity) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.use(enforceTrialRestrictions);

inventoryRouter.post('/products', requirePermission('inventory.manage_products'), async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    res.status(201).json({ data: await svc.createProduct(pid(req), data) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.put('/products/:id', requirePermission('inventory.manage_products'), async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    res.json({ data: await svc.updateProduct(req.params.id, pid(req), data) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post('/products/import/csv', requirePermission('inventory.manage_products'), async (req: AuthRequest, res, next) => {
  try {
    const { csv } = z.object({ csv: z.string().min(1) }).parse(req.body);
    const result = await svc.importProductsFromCsv(pid(req), csv);
    if (result.errors.length > 0) {
      res.status(422).json({ error: 'CSV_IMPORT_VALIDATION_FAILED', details: result });
      return;
    }
    res.status(201).json({ data: result });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/batches', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const params = z
      .object({
        productId: z.string().optional(),
        expiringDays: z.coerce.number().optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(req.query);
    res.json(await svc.listBatches(pid(req), params));
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post('/batches', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        productId: z.string(),
        batchNumber: z.string().min(1),
        expiryDate: z.string(),
        quantityRemaining: z.coerce.number().int().positive(),
        purchasePrice: z.coerce.number().positive(),
        sellingPrice: z.coerce.number().positive().optional(),
        supplierId: z.string().trim().optional().transform((value) => value || undefined),
        localTimestamp: z.string().datetime().optional(),
      })
      .parse(req.body);
    const batch = await svc.receiveBatch(pid(req), uid(req), data);
    emitToPharmacy(pid(req), 'STOCK_UPDATED');
    res.status(201).json({ data: batch });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/movements', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    const params = z
      .object({
        productId: z.string().optional(),
        type: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(req.query);
    res.json(await svc.listMovements(pid(req), params));
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post('/movements/adjust', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    res.status(409).json({
      error: 'APPROVAL_WORKFLOW_REQUIRED',
      message: 'Direct stock adjustment is disabled. Submit an adjustment suggestion and apply stock changes from owner approval.',
    });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post(
  '/adjustment-suggestions',
  requirePermission('inventory.manage_stock'),
  upload.single('photo'),
  async (req: AuthRequest, res, next) => {
    try {
      const data = z
        .object({
          productId: z.string().min(1),
          batchId: z.string().optional(),
          quantityDelta: z.coerce.number().int().refine((value) => value !== 0, 'Quantity delta must not be zero'),
          reason: z.enum(['COUNT_VARIANCE', 'DAMAGED', 'EXPIRED', 'RETURN_TO_SUPPLIER', 'FOUND_STOCK', 'OTHER']),
          note: z.string().trim().max(500).optional(),
        })
        .parse(req.body);

      if (data.reason === 'OTHER' && !data.note?.trim()) {
        res.status(400).json({ error: 'NOTE_REQUIRED_FOR_OTHER_REASON' });
        return;
      }

      const allowedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (req.file && !allowedPhotoTypes.has(req.file.mimetype)) {
        res.status(400).json({ error: 'INVALID_PHOTO_TYPE', message: 'Photo must be JPG, PNG, or WEBP' });
        return;
      }

      res.status(201).json({
        data: await svc.createStockAdjustmentSuggestion(pid(req), uid(req), {
          ...data,
          batchId: data.batchId || undefined,
          note: data.note?.trim() || undefined,
          photo: req.file
            ? {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                buffer: req.file.buffer,
              }
            : undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  },
);

inventoryRouter.get('/adjustment-suggestions', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    if (!canReviewStockAdjustmentSuggestions(req)) {
      res.status(403).json({
        error: 'ROLE_INSUFFICIENT',
        message: 'Only owner-level users can review stock adjustment suggestions',
      });
      return;
    }

    const params = z
      .object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PARTIAL']).optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
      })
      .parse(req.query);

    res.json({
      data: await svc.listStockAdjustmentSuggestions(pid(req), params),
    });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.patch('/adjustment-suggestions/:id/review', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    if (!canReviewStockAdjustmentSuggestions(req)) {
      res.status(403).json({
        error: 'ROLE_INSUFFICIENT',
        message: 'Only owner-level users can review stock adjustment suggestions',
      });
      return;
    }

    const data = z
      .object({
        status: z.enum(['APPROVED', 'REJECTED', 'PARTIAL']),
        approvedQuantityDelta: z.coerce.number().int().optional(),
        reviewNote: z.string().trim().max(500).optional(),
      })
      .parse(req.body);

    const result = await svc.reviewStockAdjustmentSuggestion(pid(req), uid(req), req.params.id, {
      ...data,
      reviewNote: data.reviewNote?.trim() || undefined,
    });
    if (data.status === 'APPROVED' || data.status === 'PARTIAL') {
      emitToPharmacy(pid(req), 'STOCK_UPDATED');
    }
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/suppliers', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.listSuppliers(pid(req)) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post('/suppliers', requirePermission('inventory.manage_stock'), requireDispenserSupplierWrite, async (req: AuthRequest, res, next) => {
  try {
    const data = supplierSchema.parse(req.body);
    res.status(201).json({ data: await svc.createSupplier(pid(req), data) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.put('/suppliers/:id', requirePermission('inventory.manage_stock'), requireDispenserSupplierWrite, async (req: AuthRequest, res, next) => {
  try {
    const data = supplierSchema.parse(req.body);
    res.json({ data: await svc.updateSupplier(pid(req), req.params.id, data) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.delete('/suppliers/:id', requirePermission('inventory.manage_stock'), requireDispenserSupplierWrite, async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.deactivateSupplier(pid(req), req.params.id) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/reports/stock-on-hand', requirePermission('inventory.view_reports'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.stockOnHand(pid(req)) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/reports/dashboard-summary', requirePermission('inventory.view_reports'), async (req: AuthRequest, res, next) => {
  try {
    const params = z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).parse(req.query);
    res.json({ data: await svc.dashboardSummary(pid(req), params) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/reports/expiry', requirePermission('inventory.view_reports'), async (req: AuthRequest, res, next) => {
  try {
    const { days } = z.object({ days: z.coerce.number().optional() }).parse(req.query);
    res.json({ data: await svc.expiryReport(pid(req), days) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/reports/low-stock', requirePermission('inventory.view_reports'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.lowStockReport(pid(req)) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/conflicts', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['OPEN', 'RESOLVED']).optional() }).parse(req.query);
    res.json({ data: await svc.listSyncConflicts(pid(req), status) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post('/conflicts', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z
      .object({
        entityType: z.string().min(1),
        entityId: z.string().min(1),
        conflictType: z.string().min(1),
        localPayload: z.record(z.any()).optional(),
        serverPayload: z.record(z.any()).optional(),
      })
      .parse(req.body);
    res.status(201).json({ data: await svc.createSyncConflict(pid(req), payload) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.patch('/conflicts/:id/resolve', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.resolveSyncConflict(pid(req), req.params.id, uid(req)) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/enterprise/multi-outlet', requireTier('ENTERPRISE'), requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    res.json({
      data: await svc.listEnterpriseOutlets(
        pid(req),
        uid(req),
        req.user?.normalizedRole === 'SUPER_ADMIN',
      ),
    });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post('/enterprise/transfers', requireTier('ENTERPRISE'), requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      destinationPharmacyId: z.string().uuid(),
      productId: z.string().uuid(),
      batchId: z.string().uuid().optional(),
      destinationProductId: z.string().uuid().optional(),
      quantity: z.coerce.number().int().positive(),
      notes: z.string().trim().max(500).optional(),
    }).parse(req.body);

    res.status(201).json({
      data: await svc.transferStockBetweenOutlets(
        pid(req),
        uid(req),
        req.user?.normalizedRole === 'SUPER_ADMIN',
        payload,
      ),
    });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/units-of-measure', async (_req, res, next) => {
  try {
    const units = await prisma.unitOfMeasure.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, symbol: true, normalizedName: true, description: true },
    });
    res.json({ data: units });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/drug-master', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const { q, limit, page, storageCondition, essential } = z.object({
      q: z.string().optional(),
      limit: z.coerce.number().optional(),
      page: z.coerce.number().optional(),
      storageCondition: z.string().optional(),
      essential: z.coerce.boolean().optional(),
    }).parse(req.query);
    res.json(await svc.searchDrugMaster({
      query: q,
      limit,
      page,
      storageCondition,
      essentialOnly: req.user?.pharmacy?.pharmacyType === 'ADDO' || req.user?.pharmacy?.subscriptionTier === 'ADDO' || essential,
    }));
  } catch (e) {
    next(e);
  }
});
