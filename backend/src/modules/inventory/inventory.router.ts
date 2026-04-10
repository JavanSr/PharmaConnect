import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';
import * as svc from './inventory.service.js';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

const pid = (req: AuthRequest) => req.user!.pharmacyId!;
const uid = (req: AuthRequest) => req.user!.userId;

// ── Products ─────────────────────────────────────────────────────────────────
inventoryRouter.get('/products', async (req: AuthRequest, res, next) => {
  try {
    const params = z.object({
      search: z.string().optional(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }).parse(req.query);
    res.json(await svc.listProducts(pid(req), params));
  } catch (e) { next(e); }
});

inventoryRouter.get('/products/:id', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.getProduct(req.params.id, pid(req)) });
  } catch (e) { next(e); }
});

inventoryRouter.post('/products', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      genericName: z.string().optional(),
      brandName: z.string().optional(),
      barcode: z.string().optional(),
      dosageForm: z.string().optional(),
      strength: z.string().optional(),
      unitOfMeasure: z.string().optional(),
      drugClass: z.string().optional(),
      description: z.string().optional(),
      reorderLevel: z.coerce.number().optional(),
      sellingPrice: z.coerce.number().optional(),
      tmda: z.string().optional(),
      drugMasterId: z.string().optional(),
    });
    const data = schema.parse(req.body);
    res.status(201).json({ data: await svc.createProduct(pid(req), data as any) });
  } catch (e) { next(e); }
});

inventoryRouter.put('/products/:id', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.updateProduct(req.params.id, pid(req), req.body) });
  } catch (e) { next(e); }
});

// ── Batches ──────────────────────────────────────────────────────────────────
inventoryRouter.get('/batches', async (req: AuthRequest, res, next) => {
  try {
    const params = z.object({
      productId: z.string().optional(),
      expiringDays: z.coerce.number().optional(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }).parse(req.query);
    res.json(await svc.listBatches(pid(req), params));
  } catch (e) { next(e); }
});

inventoryRouter.post('/batches', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      productId: z.string(),
      batchNumber: z.string().min(1),
      expiryDate: z.string(),
      quantityRemaining: z.coerce.number().int().positive(),
      purchasePrice: z.coerce.number().positive(),
      supplierId: z.string().optional(),
    });
    const data = schema.parse(req.body);
    res.status(201).json({ data: await svc.receiveBatch(pid(req), uid(req), data) });
  } catch (e) { next(e); }
});

// ── Movements ────────────────────────────────────────────────────────────────
inventoryRouter.get('/movements', async (req: AuthRequest, res, next) => {
  try {
    const params = z.object({
      productId: z.string().optional(),
      type: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }).parse(req.query);
    res.json(await svc.listMovements(pid(req), params));
  } catch (e) { next(e); }
});

inventoryRouter.post('/movements/adjust', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      productId: z.string(),
      batchId: z.string().optional(),
      type: z.enum(['ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED', 'RETURNED']),
      quantity: z.coerce.number().int().positive(),
      notes: z.string().optional(),
    });
    const data = schema.parse(req.body);
    res.status(201).json({ data: await svc.adjustStock(pid(req), uid(req), data) });
  } catch (e) { next(e); }
});

// ── Suppliers ────────────────────────────────────────────────────────────────
inventoryRouter.get('/suppliers', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.listSuppliers(pid(req)) });
  } catch (e) { next(e); }
});

// ── Reports ──────────────────────────────────────────────────────────────────
inventoryRouter.get('/reports/stock-on-hand', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.stockOnHand(pid(req)) });
  } catch (e) { next(e); }
});

inventoryRouter.get('/reports/expiry', async (req: AuthRequest, res, next) => {
  try {
    const { days } = z.object({ days: z.coerce.number().optional() }).parse(req.query);
    res.json({ data: await svc.expiryReport(pid(req), days) });
  } catch (e) { next(e); }
});

// ── Drug master ───────────────────────────────────────────────────────────────
inventoryRouter.get('/drug-master', async (req: AuthRequest, res, next) => {
  try {
    const { q, limit } = z.object({
      q: z.string().optional(),
      limit: z.coerce.number().optional(),
    }).parse(req.query);
    res.json({ data: await svc.searchDrugMaster(q || '', limit) });
  } catch (e) { next(e); }
});
