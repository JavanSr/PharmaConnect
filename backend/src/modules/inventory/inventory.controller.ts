import { Request, Response } from 'express';
import { MovementType, PaymentMethod, StorageCondition } from '@prisma/client';
import InventoryService, {
  DEFAULT_EXPIRY_REPORT_DAYS,
  EXPIRY_REPORT_DAY_THRESHOLDS,
  isExpiryReportDays,
} from './inventory.service';
import { logger } from '../../lib/logger';

const service = new InventoryService();

export const listDrugMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '25'), 10) || 25, 1), 100);
    const storageCondition = req.query.storageCondition
      ? String(req.query.storageCondition).toUpperCase()
      : undefined;

    if (
      storageCondition &&
      !Object.values(StorageCondition).includes(storageCondition as StorageCondition)
    ) {
      res.status(400).json({ success: false, error: 'Invalid storageCondition' });
      return;
    }

    const result = await service.listDrugMaster({
      search: req.query.q ? String(req.query.q) : undefined,
      storageCondition: storageCondition as StorageCondition | undefined,
      essential: req.query.essential === undefined
        ? undefined
        : String(req.query.essential).toLowerCase() === 'true',
    }, { page, limit });

    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('listDrugMaster error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch drug catalogue' });
  }
};

export const searchDrugMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q || '');
    const results = await service.searchDrugMaster(q);
    res.json({ success: true, data: results });
  } catch (err) {
    logger.error('searchDrugMaster error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// ─── Products ──────────────────────────────────────────────────────────────

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);

    const filters = {
      lowStock: req.query.lowStock === 'true',
      nearExpiry: req.query.nearExpiry === 'true',
      category: req.query.category ? String(req.query.category) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    };

    const result = await service.listProducts(pharmacyId, filters, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('listProducts error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const product = await service.createProduct(pharmacyId, req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    logger.error('createProduct error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { id } = req.params;
    const product = await service.getProductById(id, pharmacyId);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (err) {
    logger.error('getProduct error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { id } = req.params;
    const product = await service.updateProduct(id, pharmacyId, req.body);
    res.json({ success: true, data: product });
  } catch (err) {
    logger.error('updateProduct error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const scanBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { barcode } = req.params;
    const product = await service.getProductByBarcode(barcode, pharmacyId);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found for this barcode' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (err) {
    logger.error('scanBarcode error:', err);
    res.status(500).json({ success: false, error: 'Barcode lookup failed' });
  }
};

export const importProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No CSV file uploaded' });
      return;
    }
    const result = await service.importProductsCsv(pharmacyId, req.file.buffer);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error('importProducts error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

// ─── Batches ───────────────────────────────────────────────────────────────

export const listBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const filters = {
      expiryFrom: req.query.expiryFrom ? new Date(String(req.query.expiryFrom)) : undefined,
      expiryTo: req.query.expiryTo ? new Date(String(req.query.expiryTo)) : undefined,
    };
    const batches = await service.listBatches(pharmacyId, filters);
    res.json({ success: true, data: batches });
  } catch (err) {
    logger.error('listBatches error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch batches' });
  }
};

export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const userId = req.user!.id;
    const {
      productId,
      batchNumber,
      expiryDate,
      quantityReceived,
      purchasePrice,
      supplierId,
    } = req.body;
    const quantityRemaining = req.body.quantityRemaining ?? quantityReceived;

    if (!productId || !batchNumber || !expiryDate || quantityRemaining === undefined || purchasePrice === undefined) {
      res.status(400).json({
        success: false,
        error: 'productId, batchNumber, expiryDate, quantityRemaining, and purchasePrice are required',
      });
      return;
    }

    const batch = await service.createBatch(pharmacyId, {
      productId,
      batchNumber,
      expiryDate: new Date(expiryDate),
      quantityRemaining: parseInt(quantityRemaining, 10),
      purchasePrice: parseFloat(purchasePrice),
      supplierId: supplierId || undefined,
      userId,
    });

    res.status(201).json({ success: true, data: batch });
  } catch (err) {
    logger.error('createBatch error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

// ─── Movements ─────────────────────────────────────────────────────────────

export const listMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);

    const filters = {
      productId: req.query.productId ? String(req.query.productId) : undefined,
      type: req.query.type ? (String(req.query.type) as MovementType) : undefined,
      dateFrom: req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined,
      dateTo: req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined,
    };

    const result = await service.listMovements(pharmacyId, filters, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('listMovements error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch movements' });
  }
};

export const recordMovement = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const userId = req.user!.id;
    const { productId, batchId, type, quantity, reason, notes, referenceNumber } = req.body;

    if (!productId || !type || quantity === undefined) {
      res.status(400).json({
        success: false,
        error: 'productId, type, and quantity are required',
      });
      return;
    }

    // TOR §Module 2: adjustments require reason + minimum 10-character note
    const adjustmentTypes = ['ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED', 'DONATED', 'TRANSFERRED'];
    if (adjustmentTypes.includes(type)) {
      if (!reason || String(reason).trim().length < 1) {
        res.status(400).json({ success: false, error: 'A reason is required for stock adjustments.' });
        return;
      }
      if (!notes || String(notes).trim().length < 10) {
        res.status(400).json({ success: false, error: 'Adjustment notes must be at least 10 characters.' });
        return;
      }
    }

    const movement = await service.recordMovement(pharmacyId, {
      productId,
      batchId: batchId || undefined,
      type: type as MovementType,
      quantity: parseInt(quantity, 10),
      reason: reason || undefined,
      notes: notes || undefined,
      referenceNumber: referenceNumber || undefined,
      userId,
    });

    res.status(201).json({ success: true, data: movement });
  } catch (err) {
    logger.error('recordMovement error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

// ─── Reports ───────────────────────────────────────────────────────────────

export const checkoutCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const userId = req.user!.id;
    const { items, paymentMethod, paymentRef, patientId } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'At least one cart item is required' });
      return;
    }

    if (
      paymentMethod &&
      !Object.values(PaymentMethod).includes(String(paymentMethod) as PaymentMethod)
    ) {
      res.status(400).json({ success: false, error: 'Invalid payment method' });
      return;
    }

    const checkout = await service.checkoutCart(pharmacyId, {
      items: items.map((item) => ({
        productId: String(item.productId || ''),
        quantity: parseInt(String(item.quantity), 10),
        dose: item.dose ? String(item.dose) : undefined,
        icdCode: item.icdCode ? String(item.icdCode) : undefined,
        notes: item.notes ? String(item.notes) : undefined,
        unitPrice: item.unitPrice === undefined ? undefined : Number(item.unitPrice),
      })),
      paymentMethod: paymentMethod ? (String(paymentMethod) as PaymentMethod) : undefined,
      paymentRef: paymentRef ? String(paymentRef) : undefined,
      patientId: patientId ? String(patientId) : undefined,
      userId,
    });

    res.status(201).json({ success: true, data: checkout });
  } catch (err) {
    logger.error('checkoutCart error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const getStockOnHand = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const data = await service.getStockOnHand(pharmacyId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('getStockOnHand error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate stock report' });
  }
};

export const getExpiryReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const daysThreshold = req.query.days
      ? Number(String(req.query.days))
      : DEFAULT_EXPIRY_REPORT_DAYS;

    if (!isExpiryReportDays(daysThreshold)) {
      res.status(400).json({
        success: false,
        error: `days must be one of ${EXPIRY_REPORT_DAY_THRESHOLDS.join(', ')}`,
      });
      return;
    }

    const data = await service.getExpiryReport(pharmacyId, daysThreshold);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('getExpiryReport error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate expiry report' });
  }
};

export const getLowStockReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const data = await service.getLowStockReport(pharmacyId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('getLowStockReport error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate low-stock report' });
  }
};

export const getMovementsReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    if (!req.query.dateFrom || !req.query.dateTo) {
      res.status(400).json({ success: false, error: 'dateFrom and dateTo are required' });
      return;
    }
    const data = await service.getMovementsReport(
      pharmacyId,
      new Date(String(req.query.dateFrom)),
      new Date(String(req.query.dateTo))
    );
    res.json({ success: true, data });
  } catch (err) {
    logger.error('getMovementsReport error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate movements report' });
  }
};

// ─── Sync ──────────────────────────────────────────────────────────────────

export const syncOfflineData = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { products, batches, movements } = req.body;
    const result = await service.syncOfflineData(pharmacyId, { products, batches, movements });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('syncOfflineData error:', err);
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
};
