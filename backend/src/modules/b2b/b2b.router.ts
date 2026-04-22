import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { applyWholesaleCounterStaffOrderFilter, requirePermission } from '../../middleware/permissions';
import { enforceTrialRestrictions } from '../../middleware/trial';
import {
  ORDER_STATUSES,
  confirmDelivery,
  createOrder,
  getOrder,
  getDemandInsights,
  listCreditLimits,
  listOrders,
  listReceivablesAging,
  listVatInvoices,
  listWholesaleCatalogue,
  pickOrderItems,
  scheduleDelivery,
  updateOrderStatus,
  upsertCreditLimit,
  upsertWholesaleCatalogue,
  verifyOrderItems,
} from './b2b.service';

export const b2bRouter = Router();
b2bRouter.use(authenticate);
b2bRouter.use(enforceTrialRestrictions);

const pid = (req: AuthRequest) => req.user!.pharmacyId!;
const uid = (req: AuthRequest) => req.user!.userId;
const orderStatusSchema = z.enum(ORDER_STATUSES);

function canTransition(role: string, nextStatus: z.infer<typeof orderStatusSchema>) {
  const normalized = role;
  if (normalized === 'SUPER_ADMIN') {
    return true;
  }

  if (nextStatus === 'SUBMITTED') {
    return ['OWNER', 'PHARMACIST_IN_CHARGE'].includes(normalized);
  }

  if (nextStatus === 'CONFIRMED' || nextStatus === 'CANCELLED') {
    return ['OWNER', 'WHOLESALE_MANAGER'].includes(normalized);
  }

  if (nextStatus === 'PACKED' || nextStatus === 'DISPATCHED') {
    return ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF'].includes(normalized);
  }

  if (nextStatus === 'DELIVERED') {
    return ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF'].includes(normalized);
  }

  if (nextStatus === 'COMPLETED' || nextStatus === 'DISPUTED') {
    return ['OWNER', 'PHARMACIST_IN_CHARGE'].includes(normalized);
  }

  return false;
}

b2bRouter.get('/catalogue', async (req: AuthRequest, res, next) => {
  try {
    const { sellerPharmacyId } = z.object({ sellerPharmacyId: z.string().optional() }).parse(req.query);
    res.json({ data: await listWholesaleCatalogue(sellerPharmacyId, pid(req)) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.post('/catalogues', requirePermission('wholesale.manage_catalogue'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      items: z.array(z.object({
        productId: z.string(),
        price: z.coerce.number().positive(),
        tierPrices: z.record(z.enum(['ADDO', 'ADDO_PLUS', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE']), z.coerce.number().nonnegative()).optional(),
        minOrderQuantity: z.coerce.number().int().positive().optional(),
        maxOrderQuantity: z.coerce.number().int().positive().nullable().optional(),
      })).min(1),
    }).parse(req.body);

    res.status(201).json({ data: await upsertWholesaleCatalogue({ sellerPharmacyId: pid(req), ...payload }) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.post('/orders', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      sellerPharmacyId: z.string(),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive(),
      })).min(1),
    }).parse(req.body);

    res.status(201).json({
      data: await createOrder({
        buyerPharmacyId: pid(req),
        sellerPharmacyId: payload.sellerPharmacyId,
        notes: payload.notes,
        items: payload.items,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/orders', applyWholesaleCounterStaffOrderFilter, async (req: AuthRequest, res, next) => {
  try {
    res.json({
      data: await listOrders({
        pharmacyId: pid(req),
        role: req.user!.normalizedRole,
        assignedPickerUserId: req.orderScope?.assignedPickerUserId,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/orders/my-queue', requireRole('WHOLESALE_COUNTER_STAFF', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    res.json({
      data: await listOrders({
        pharmacyId: pid(req),
        role: req.user!.normalizedRole,
        assignedPickerUserId: uid(req),
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/orders/:id', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await getOrder(req.params.id, pid(req)) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.patch('/orders/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      nextStatus: orderStatusSchema,
      assignedPicker: z.string().nullable().optional(),
      assignedDriver: z.string().nullable().optional(),
    }).parse(req.body);

    if (!canTransition(req.user!.normalizedRole, payload.nextStatus)) {
      res.status(403).json({ error: 'ROLE_INSUFFICIENT' });
      return;
    }

    res.json({
      data: await updateOrderStatus({
        orderId: req.params.id,
        pharmacyId: pid(req),
        nextStatus: payload.nextStatus,
        assignedPicker: payload.assignedPicker,
        assignedDriver: payload.assignedDriver,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.patch('/orders/:id/delivery-schedule', requireRole('OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      scheduledDeliveryAt: z.coerce.date(),
      deliveryWindowLabel: z.string().min(1).max(120).optional().nullable(),
      deliveryNote: z.string().max(500).optional().nullable(),
    }).parse(req.body);

    res.json({
      data: await scheduleDelivery({
        orderId: req.params.id,
        pharmacyId: pid(req),
        scheduledDeliveryAt: payload.scheduledDeliveryAt,
        deliveryWindowLabel: payload.deliveryWindowLabel,
        deliveryNote: payload.deliveryNote,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.patch('/orders/:id/pick-items', requireRole('WHOLESALE_COUNTER_STAFF', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      picks: z.array(z.object({
        productId: z.string(),
        pickedQuantity: z.coerce.number().int().nonnegative(),
      })).min(1),
    }).parse(req.body);

    res.json({
      data: await pickOrderItems({
        orderId: req.params.id,
        pharmacyId: pid(req),
        pickerUserId: uid(req),
        picks: payload.picks,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.post('/orders/:id/verify-items', requireRole('WHOLESALE_COUNTER_STAFF', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      scanned_barcodes: z.array(z.string()).min(1),
    }).parse(req.body);

    res.json({
      data: await verifyOrderItems({
        orderId: req.params.id,
        pharmacyId: pid(req),
        scannedBarcodes: payload.scanned_barcodes,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.patch('/orders/:id/confirm-delivery', requireRole('WHOLESALE_COUNTER_STAFF', 'WHOLESALE_MANAGER', 'DELIVERY_STAFF', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await confirmDelivery({ orderId: req.params.id, pharmacyId: pid(req) }) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/credit-limits', requirePermission('wholesale.set_credit_limits'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await listCreditLimits(pid(req)) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.put('/credit-limits/:clientPharmacyId', requirePermission('wholesale.set_credit_limits'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      creditLimit: z.coerce.number().nonnegative(),
      outstandingBalance: z.coerce.number().nonnegative().optional(),
      paymentTermsDays: z.coerce.number().int().positive().optional(),
      blockNewOrders: z.boolean().optional(),
      blockReason: z.string().max(500).optional().nullable(),
    }).parse(req.body);

    res.json({
      data: await upsertCreditLimit({
        sellerPharmacyId: pid(req),
        clientPharmacyId: req.params.clientPharmacyId,
        ...payload,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/invoices', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await listVatInvoices(pid(req)) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/receivables-aging', requirePermission('wholesale.view_financial_reports'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await listReceivablesAging(pid(req)) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/demand-insights', requirePermission('wholesale.view_dashboard'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await getDemandInsights(pid(req)) });
  } catch (error) {
    next(error);
  }
});
