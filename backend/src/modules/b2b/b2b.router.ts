import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { applyWholesaleCounterStaffOrderFilter, requirePermission } from '../../middleware/permissions';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { prisma } from '../../lib/prisma';
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
import {
  WHOLESALE_RETURN_REASONS,
  SUPPLIER_ORDER_STATUSES,
  approveWholesaleReturn,
  completeDeliveryManifest,
  createDeliveryManifest,
  createSupplierOrder,
  createWholesaleReturn,
  createWholesaleSupplier,
  deleteClientPriceOverride,
  deleteWholesaleSupplier,
  departDeliveryManifest,
  getDeliveryManifest,
  getSupplierOrder,
  getWholesaleReturn,
  listClientEffectivePrices,
  listDeliveryManifests,
  listSupplierOrders,
  listWholesaleReturns,
  listWholesaleSuppliers,
  updateSupplierOrderStatus,
  updateWholesaleSupplier,
  upsertClientPriceOverride,
} from './b2b.extensions.service';

export const b2bRouter = Router();
b2bRouter.use(authenticate);
b2bRouter.use(enforceTrialRestrictions);

function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}
const uid = (req: AuthRequest) => req.user!.userId;
const orderStatusSchema = z.enum(ORDER_STATUSES);
const wholesaleReturnReasonSchema = z.enum(WHOLESALE_RETURN_REASONS);
const supplierOrderStatusSchema = z.enum(SUPPLIER_ORDER_STATUSES);

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

const sellerOnlyRoles = ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'] as const;

b2bRouter.get('/pharmacies/search', async (req: AuthRequest, res, next) => {
  try {
    const { q } = z.object({ q: z.string().min(2).max(100) }).parse(req.query);
    const pharmacies = await prisma.pharmacy.findMany({
      where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: 20,
      select: { id: true, name: true, region: true, pharmacyType: true, subscriptionTier: true },
    });
    res.json({ data: pharmacies });
  } catch (error) {
    next(error);
  }
});

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
        tierPrices: z.record(z.enum(['ADDO', 'ESSENTIAL', 'ADDO_PLUS', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE']), z.coerce.number().nonnegative()).optional(),
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

b2bRouter.post('/orders/manual', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      buyerPharmacyId: z.string().min(1),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      })).min(1),
    }).parse(req.body);

    res.status(201).json({
      data: await createOrder({
        buyerPharmacyId: payload.buyerPharmacyId,
        sellerPharmacyId: pid(req),
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

b2bRouter.get('/returns', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
    }).parse(req.query);

    res.json({ data: await listWholesaleReturns(pid(req), query) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.post('/returns', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      orderId: z.string(),
      reason: wholesaleReturnReasonSchema,
      lines: z.array(z.object({
        productId: z.string(),
        qty: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().nonnegative(),
      })).min(1),
    }).parse(req.body);

    res.status(201).json({
      data: await createWholesaleReturn({
        outletId: pid(req),
        createdBy: uid(req),
        orderId: payload.orderId,
        reason: payload.reason,
        lines: payload.lines,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/returns/:id', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await getWholesaleReturn(pid(req), req.params.id) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.patch('/returns/:id/approve', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    res.json({
      data: await approveWholesaleReturn({
        outletId: pid(req),
        returnId: req.params.id,
        approvedBy: uid(req),
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/suppliers', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await listWholesaleSuppliers(pid(req)) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.post('/suppliers', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      name: z.string().min(1),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      address: z.string().optional(),
    }).parse(req.body);

    res.status(201).json({ data: await createWholesaleSupplier(pid(req), payload) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.patch('/suppliers/:id', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      name: z.string().min(1),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      address: z.string().optional(),
    }).parse(req.body);

    res.json({ data: await updateWholesaleSupplier(pid(req), req.params.id, payload) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.delete('/suppliers/:id', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await deleteWholesaleSupplier(pid(req), req.params.id) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.post('/purchase-orders', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      supplierId: z.string(),
      status: supplierOrderStatusSchema.optional(),
      expectedDeliveryDate: z.coerce.date().optional().nullable(),
      notes: z.string().optional().nullable(),
      lines: z.array(z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive(),
        unitPriceTzs: z.coerce.number().nonnegative(),
        note: z.string().optional().nullable(),
      })).min(1),
    }).parse(req.body);

    res.status(201).json({
      data: await createSupplierOrder({
        outletId: pid(req),
        supplierId: payload.supplierId,
        status: payload.status,
        lines: payload.lines,
        expectedDeliveryDate: payload.expectedDeliveryDate ?? null,
        notes: payload.notes ?? null,
        createdBy: uid(req),
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/purchase-orders', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await listSupplierOrders(pid(req)) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/purchase-orders/:id', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await getSupplierOrder(pid(req), req.params.id) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.patch('/purchase-orders/:id/status', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      nextStatus: supplierOrderStatusSchema,
      receivedLines: z.array(z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive(),
        batchNumber: z.string().min(1),
        expiryDate: z.string().min(1),
        purchasePriceTzs: z.coerce.number().positive(),
      })).optional(),
    }).parse(req.body);

    res.json({
      data: await updateSupplierOrderStatus({
        outletId: pid(req),
        supplierOrderId: req.params.id,
        nextStatus: payload.nextStatus,
        userId: uid(req),
        receivedLines: payload.receivedLines,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.post('/manifests', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      deliveryStaffId: z.string(),
      orderIds: z.array(z.string()).min(1),
      route: z.string().min(1),
      vehicleReg: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(req.body);

    res.status(201).json({
      data: await createDeliveryManifest({
        outletId: pid(req),
        deliveryStaffId: payload.deliveryStaffId,
        orderIds: payload.orderIds,
        route: payload.route,
        vehicleReg: payload.vehicleReg ?? null,
        notes: payload.notes ?? null,
        createdBy: uid(req),
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/manifests', requireRole('OWNER', 'WHOLESALE_MANAGER', 'DELIVERY_STAFF', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    res.json({
      data: await listDeliveryManifests({
        outletId: pid(req),
        userId: uid(req),
        normalizedRole: req.user!.normalizedRole,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/manifests/:id', requireRole('OWNER', 'WHOLESALE_MANAGER', 'DELIVERY_STAFF', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    res.json({
      data: await getDeliveryManifest({
        outletId: pid(req),
        manifestId: req.params.id,
        userId: uid(req),
        normalizedRole: req.user!.normalizedRole,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.patch('/manifests/:id/depart', requireRole('OWNER', 'WHOLESALE_MANAGER', 'DELIVERY_STAFF', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    res.json({
      data: await departDeliveryManifest({
        outletId: pid(req),
        manifestId: req.params.id,
        userId: uid(req),
        normalizedRole: req.user!.normalizedRole,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.patch('/manifests/:id/complete', requireRole('OWNER', 'WHOLESALE_MANAGER', 'DELIVERY_STAFF', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      deliveredOrderIds: z.array(z.string()).default([]),
      partialLines: z.array(z.record(z.unknown())).optional(),
    }).parse(req.body);

    res.json({
      data: await completeDeliveryManifest({
        outletId: pid(req),
        manifestId: req.params.id,
        userId: uid(req),
        normalizedRole: req.user!.normalizedRole,
        deliveredOrderIds: payload.deliveredOrderIds,
        partialLines: payload.partialLines as any,
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.get('/clients/:clientPharmacyId/prices', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await listClientEffectivePrices(pid(req), req.params.clientPharmacyId) });
  } catch (error) {
    next(error);
  }
});

b2bRouter.post('/clients/:clientPharmacyId/prices', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      productId: z.string(),
      overridePriceTzs: z.coerce.number().int().nonnegative(),
      validFrom: z.coerce.date().optional(),
      validUntil: z.coerce.date().optional().nullable(),
    }).parse(req.body);

    res.status(201).json({
      data: await upsertClientPriceOverride({
        wholesaleOutletId: pid(req),
        clientOutletId: req.params.clientPharmacyId,
        productId: payload.productId,
        overridePriceTzs: payload.overridePriceTzs,
        validFrom: payload.validFrom,
        validUntil: payload.validUntil ?? null,
        createdBy: uid(req),
      }),
    });
  } catch (error) {
    next(error);
  }
});

b2bRouter.delete('/clients/:clientPharmacyId/prices/:productId', requireRole(...sellerOnlyRoles), async (req: AuthRequest, res, next) => {
  try {
    await deleteClientPriceOverride(pid(req), req.params.clientPharmacyId, req.params.productId);
    res.json({ data: { deleted: true } });
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
