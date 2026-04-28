import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import * as svc from './stock-order.service';

const editableRoles = new Set(['OWNER', 'PHARMACIST_IN_CHARGE', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'SUPER_ADMIN']);
const receiverRoles = new Set(['OWNER', 'PHARMACIST_IN_CHARGE', 'DATA_ENTRY_CLERK', 'SUPER_ADMIN']);
const submittedCancelRoles = new Set(['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN']);

const requireStockOrderRole = (roles: Set<string>) => (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.normalizedRole ?? req.user?.role;
  if (!role || !roles.has(role)) {
    res.status(403).json({ error: 'ROLE_INSUFFICIENT' });
    return;
  }
  next();
};

const futureIsoDate = z.string().min(1).refine((value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date > new Date();
}, 'Date must be in the future');

const optionalNullableDate = z.union([futureIsoDate, z.literal(''), z.null()]).optional();

const itemSchema = z.object({
  productId: z.string().trim().optional().transform((value) => value || undefined),
  productName: z.string().trim().min(1),
  genericName: z.string().trim().optional().transform((value) => value || undefined),
  strength: z.string().trim().optional().transform((value) => value || undefined),
  dosageForm: z.string().trim().optional().transform((value) => value || undefined),
  supplierId: z.string().trim().optional().transform((value) => value || undefined),
  quantityOrdered: z.coerce.number().int().min(1),
  expectedUnitCost: z.coerce.number().positive().optional(),
  notes: z.string().trim().optional().transform((value) => value || undefined),
});

const createOrderSchema = z.object({
  notes: z.string().trim().optional(),
  expectedBy: optionalNullableDate,
  items: z.array(itemSchema).min(1),
});

const updateOrderSchema = z.object({
  notes: z.string().trim().nullable().optional(),
  expectedBy: optionalNullableDate,
});

const updateItemSchema = z.object({
  quantityOrdered: z.coerce.number().int().min(1).optional(),
  supplierId: z.union([z.string().trim(), z.null()]).optional(),
  expectedUnitCost: z.coerce.number().positive().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

const receiptSchema = z.object({
  itemId: z.string().min(1),
  quantityReceived: z.coerce.number().int().min(1),
  batchNumber: z.string().trim().min(1),
  expiryDate: futureIsoDate,
  unitCost: z.coerce.number().positive(),
});

export const stockOrderRouter = Router();

stockOrderRouter.use(requirePermission('inventory.manage_stock'));
stockOrderRouter.use(requireStockOrderRole(editableRoles));

const pid = (req: AuthRequest) => req.user!.pharmacyId!;
const uid = (req: AuthRequest) => req.user!.userId;

stockOrderRouter.get('/suggestions', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.getLowStockSuggestions(pid(req)) });
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const filters = z.object({
      status: z.enum(['DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']).optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    }).parse(req.query);
    res.json(await svc.getStockOrders(pid(req), filters));
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);
    res.status(201).json({ data: await svc.createStockOrder(pid(req), uid(req), data) });
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.getStockOrder(pid(req), req.params.id) });
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = updateOrderSchema.parse(req.body);
    res.json({ data: await svc.updateStockOrder(pid(req), req.params.id, data) });
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.post('/:id/items', async (req: AuthRequest, res, next) => {
  try {
    const data = itemSchema.parse(req.body);
    res.status(201).json({ data: await svc.addItemToStockOrder(pid(req), req.params.id, data) });
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.patch('/:id/items/:itemId', async (req: AuthRequest, res, next) => {
  try {
    const data = updateItemSchema.parse(req.body);
    res.json({ data: await svc.updateStockOrderItem(pid(req), req.params.id, req.params.itemId, data) });
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.delete('/:id/items/:itemId', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.removeStockOrderItem(pid(req), req.params.id, req.params.itemId) });
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.post('/:id/submit', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.submitStockOrder(pid(req), req.params.id) });
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.post('/:id/receive', requireStockOrderRole(receiverRoles), async (req: AuthRequest, res, next) => {
  try {
    const { receipts } = z.object({ receipts: z.array(receiptSchema).min(1) }).parse(req.body);
    res.json({ data: await svc.receiveStockOrderItems(pid(req), req.params.id, uid(req), receipts) });
  } catch (e) {
    next(e);
  }
});

stockOrderRouter.post('/:id/cancel', async (req: AuthRequest, res, next) => {
  try {
    const order = await svc.getStockOrder(pid(req), req.params.id);
    const role = req.user?.normalizedRole ?? req.user?.role;
    if (order.status === 'SUBMITTED' && (!role || !submittedCancelRoles.has(role))) {
      res.status(403).json({ error: 'ROLE_INSUFFICIENT' });
      return;
    }
    res.json({ data: await svc.cancelStockOrder(pid(req), req.params.id) });
  } catch (e) {
    next(e);
  }
});
