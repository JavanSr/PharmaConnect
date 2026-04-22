import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import type { AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { requireTier } from '../../middleware/tier';
import { enforceTrialRestrictions } from '../../middleware/trial';
import * as svc from './inventory.service';

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

const pid = (req: AuthRequest) => req.user!.pharmacyId!;
const uid = (req: AuthRequest) => req.user!.userId;
const canReviewStockAdjustmentSuggestions = (req: AuthRequest) =>
  ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(req.user?.normalizedRole ?? '');

inventoryRouter.get('/products', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const params = z
      .object({
        search: z.string().optional(),
        barcode: z.string().optional(),
        sku: z.string().optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(req.query);
    res.json(await svc.listProducts(pid(req), params));
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
      })
      .parse(req.body);

    res.status(201).json({
      data: await svc.saveProductBarcodeMapping(pid(req), uid(req), payload),
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
        supplierId: z.string().optional(),
      })
      .parse(req.body);
    res.status(201).json({ data: await svc.receiveBatch(pid(req), uid(req), data) });
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

    res.json({
      data: await svc.reviewStockAdjustmentSuggestion(pid(req), uid(req), req.params.id, {
        ...data,
        reviewNote: data.reviewNote?.trim() || undefined,
      }),
    });
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

inventoryRouter.post('/suppliers', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    const data = supplierSchema.parse(req.body);
    res.status(201).json({ data: await svc.createSupplier(pid(req), data) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.put('/suppliers/:id', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
  try {
    const data = supplierSchema.parse(req.body);
    res.json({ data: await svc.updateSupplier(pid(req), req.params.id, data) });
  } catch (e) {
    next(e);
  }
});

inventoryRouter.delete('/suppliers/:id', requirePermission('inventory.manage_stock'), async (req: AuthRequest, res, next) => {
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

inventoryRouter.get('/enterprise/multi-outlet', requireTier('ENTERPRISE'), async (_req: AuthRequest, res) => {
  res.json({ data: { enabled: true } });
});

inventoryRouter.post('/enterprise/transfers', requireTier('ENTERPRISE'), async (_req: AuthRequest, res) => {
  res.status(501).json({ error: 'NOT_IMPLEMENTED_YET', message: 'Inter-branch transfer workflow will be completed in a later Task 3 pass.' });
});

inventoryRouter.get('/drug-master', requirePermission('inventory.view_products'), async (req: AuthRequest, res, next) => {
  try {
    const { q, limit } = z.object({ q: z.string().optional(), limit: z.coerce.number().optional() }).parse(req.query);
    res.json({ data: await svc.searchDrugMaster(q || '', limit) });
  } catch (e) {
    next(e);
  }
});
