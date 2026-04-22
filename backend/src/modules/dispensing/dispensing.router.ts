import { Router } from 'express';
import { PaymentMethod, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { verifyPicPinForPharmacy } from '../../middleware/pic-pin';
import { prisma } from '../../lib/prisma';
import { resolveFefoBatch } from '../inventory/inventory.service';
import { sessionReview } from '../patient-safety/patient-safety.service';
import { ensurePaymentMethodConfig } from '../settings/payment-method-config';

const paymentMethods = Object.values(PaymentMethod) as [PaymentMethod, ...PaymentMethod[]];
const LEGACY_PAYMENT_METHOD_OPTIONS = [
  { code: PaymentMethod.CASH, label: 'Cash', phoneNumber: '', note: 'Always enabled for offline fallback.', requiresReference: false, source: 'legacy' },
  { code: PaymentMethod.MPESA, label: 'M-Pesa', phoneNumber: '', note: '', requiresReference: true, source: 'legacy' },
  { code: PaymentMethod.TIGOPESA, label: 'Tigo Pesa', phoneNumber: '', note: '', requiresReference: true, source: 'legacy' },
] as const;
const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  MPESA: 'M-Pesa',
  TIGOPESA: 'Tigo Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  HALOPESA: 'Halo Pesa',
  INSURANCE: 'Insurance',
};

type DispensingPaymentMethodOption = {
  code: PaymentMethod;
  label: string;
  phoneNumber: string;
  note: string;
  requiresReference: boolean;
  source: 'legacy' | 'config';
};

const lineItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  dose: z.string().trim().max(200).optional(),
  counsellingNotes: z.string().trim().max(500).optional(),
});

const safetyContextSchema = z.object({
  medicines: z.array(z.string()).optional(),
  pregnant: z.boolean().optional(),
  breastfeeding: z.boolean().optional(),
  ageYears: z.number().nonnegative().optional(),
  weightKg: z.number().positive().optional(),
  allergies: z.array(z.string()).optional(),
  diagnoses: z.array(z.string()).optional(),
  renalImpairment: z.boolean().optional(),
  hepaticImpairment: z.boolean().optional(),
});

const checkoutSchema = z.object({
  paymentMethod: z.enum(paymentMethods),
  paymentRef: z.string().trim().max(100).optional(),
  items: z.array(lineItemSchema).min(1),
  safetyContext: safetyContextSchema.optional(),
  discountAmount: z.number().nonnegative().optional(),
  discountReason: z.string().trim().min(3).max(255).optional(),
  override: z
    .object({
      reason: z.string().trim().min(5).max(255),
      pic_pin: z.string().trim().min(4).max(32),
      pic_user_id: z.string().optional(),
    })
    .optional(),
});

type DispensingEventRow = {
  id: string;
  reference_number: string;
  payment_method: string;
  payment_reference: string | null;
  subtotal_amount: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  status: string;
  vfd_status: string;
  created_at: Date;
};

type DispensingEventItem = {
  productId: string;
  productName: string;
  genericName: string | null;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  dose?: string;
  counsellingNotes?: string;
};

function getPharmacyId(req: AuthRequest) {
  return req.user!.pharmacyId!;
}

function getUserId(req: AuthRequest) {
  return req.user!.userId;
}

function toNumber(value: string | number | Prisma.Decimal | null | undefined): number {
  if (value == null) {
    return 0;
  }
  return Number(value);
}

function formatReceiptResponse(event: DispensingEventRow, lines: DispensingEventItem[]) {
  return {
    id: event.id,
    referenceNumber: event.reference_number,
    paymentMethod: event.payment_method,
    paymentRef: event.payment_reference,
    subtotalAmount: toNumber(event.subtotal_amount),
    discountAmount: toNumber(event.discount_amount),
    totalAmount: toNumber(event.total_amount),
    status: event.status,
    vfdStatus: event.vfd_status,
    createdAt: event.created_at,
    itemCount: lines.length,
    lines: lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      totalAmount: line.lineTotal,
      batchNumber: line.batchNumber,
      dose: line.dose,
      counsellingNotes: line.counsellingNotes,
    })),
  };
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return paymentMethods.includes(value as PaymentMethod);
}

function normalizeDispensingPaymentMethods(value: Prisma.JsonValue | null | undefined): DispensingPaymentMethodOption[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as Prisma.JsonObject).methods)) {
    return [...LEGACY_PAYMENT_METHOD_OPTIONS];
  }

  const methods = (value as Prisma.JsonObject).methods as Prisma.JsonArray;
  const seen = new Set<PaymentMethod>([PaymentMethod.CASH]);
  const normalized: DispensingPaymentMethodOption[] = [
    {
      code: PaymentMethod.CASH,
      label: 'Cash',
      phoneNumber: '',
      note: 'Always enabled for offline fallback.',
      requiresReference: false,
      source: 'config',
    },
  ];

  for (const entry of methods) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const record = entry as Prisma.JsonObject;
    const code = typeof record.code === 'string' ? record.code.trim().toUpperCase() : '';
    if (!code || code === PaymentMethod.CASH || !isPaymentMethod(code) || seen.has(code)) {
      continue;
    }

    const active = record.active !== false;
    if (!active) {
      continue;
    }

    normalized.push({
      code,
      label: typeof record.label === 'string' && record.label.trim() ? record.label.trim() : paymentMethodLabels[code],
      phoneNumber: typeof record.phoneNumber === 'string' ? record.phoneNumber.trim() : '',
      note: typeof record.note === 'string' ? record.note.trim() : '',
      requiresReference: code !== PaymentMethod.CASH,
      source: 'config',
    });
    seen.add(code);
  }

  return normalized;
}

export const dispensingRouter = Router();
dispensingRouter.use(authenticate);
dispensingRouter.use(enforceTrialRestrictions);

dispensingRouter.get('/payment-methods', requirePermission('dispensing.access'), async (req: AuthRequest, res, next) => {
  try {
    const setting = await ensurePaymentMethodConfig(getPharmacyId(req), getUserId(req));

    const methods = setting
      ? normalizeDispensingPaymentMethods(setting.value)
      : [...LEGACY_PAYMENT_METHOD_OPTIONS];

    res.json({
      data: {
        methods,
        source: setting ? 'config' : 'legacy',
        updatedAt: setting?.updatedAt ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

dispensingRouter.post('/checkout', requirePermission('dispensing.access'), async (req: AuthRequest, res, next) => {
  try {
    const payload = checkoutSchema.parse(req.body);
    const pharmacyId = getPharmacyId(req);
    const currentUserId = getUserId(req);
    const discountAmount = payload.discountAmount ?? 0;
    const discountReason = payload.discountReason?.trim() || null;

    if ((discountAmount > 0 || discountReason) && !req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (discountAmount > 0 || discountReason) {
      const canDiscount = ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(req.user!.normalizedRole);
      if (!canDiscount) {
        res.status(403).json({ error: 'ROLE_INSUFFICIENT', permission: 'dispensing.apply_discount' });
        return;
      }
      if (!(discountAmount > 0 && discountReason)) {
        res.status(400).json({ error: 'DISCOUNT_REASON_REQUIRED' });
        return;
      }
    }

    const safetyContext = payload.safetyContext
      ? {
          ...payload.safetyContext,
          productIds: payload.items.map((item) => item.productId),
        }
      : undefined;

    let review:
      | Awaited<ReturnType<typeof sessionReview>>
      | null = null;

    if (safetyContext) {
      review = await sessionReview(safetyContext);
      if (review.requiresPicPin) {
        if (!payload.override?.reason || !payload.override.pic_pin) {
          res.status(403).json({ error: 'PIC_OVERRIDE_REQUIRED', review });
          return;
        }
      }
    }

    const referenceNumber = `RX-${Date.now().toString(36).toUpperCase()}`;
    const pharmacySnapshot = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { vfdEnabled: true },
    });
    const products = await prisma.product.findMany({
      where: {
        pharmacyId,
        id: { in: payload.items.map((item) => item.productId) },
      },
      select: {
        id: true,
        name: true,
        genericName: true,
      },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    const lines: DispensingEventItem[] = [];
    let subtotalAmount = 0;

    for (const item of payload.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const batch = await resolveFefoBatch(pharmacyId, item.productId, item.quantity);
      const unitPrice = Number(item.unitPrice);
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
      subtotalAmount += lineTotal;
      lines.push({
        productId: item.productId,
        productName: product.name,
        genericName: product.genericName,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        dose: item.dose,
        counsellingNotes: item.counsellingNotes,
      });
    }

    const totalAmount = Number((subtotalAmount - discountAmount).toFixed(2));
    if (totalAmount < 0) {
      res.status(400).json({ error: 'Discount cannot exceed subtotal' });
      return;
    }

    let verifiedPicUser: Awaited<ReturnType<typeof verifyPicPinForPharmacy>> = null;
    if (review?.requiresPicPin && payload.override) {
      verifiedPicUser = await verifyPicPinForPharmacy({
        pharmacyId,
        picPin: payload.override.pic_pin,
        picUserId: payload.override.pic_user_id,
      });

      if (!verifiedPicUser) {
        res.status(403).json({ error: 'PIC_PIN_INVALID' });
        return;
      }
    }

    const checkoutResult = await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const batchUpdate = await tx.batch.updateMany({
          where: {
            id: line.batchId,
            quantityRemaining: { gte: line.quantity },
          },
          data: { quantityRemaining: { decrement: line.quantity } },
        });

        if (batchUpdate.count === 0) {
          throw Object.assign(new Error('Insufficient batch stock for FEFO allocation'), { status: 409 });
        }

        await tx.stockMovement.create({
          data: {
            pharmacyId,
            productId: line.productId,
            batchId: line.batchId,
            userId: currentUserId,
            type: 'DISPENSED',
            quantity: line.quantity,
            notes: `Dispensed via ${referenceNumber}`,
          },
        });
      }

      const inserted = await tx.$queryRaw<DispensingEventRow[]>(Prisma.sql`
        INSERT INTO "dispensing_events" (
          "pharmacy_id",
          "dispensed_by",
          "cashier_id",
          "reference_number",
          "payment_method",
          "payment_reference",
          "subtotal_amount",
          "discount_amount",
          "discount_reason",
          "total_amount",
          "items",
          "status",
          "vfd_status"
        )
        VALUES (
          ${pharmacyId},
          ${currentUserId},
          ${req.user!.normalizedRole === 'CASHIER' ? currentUserId : null},
          ${referenceNumber},
          ${payload.paymentMethod}::"PaymentMethod",
          ${payload.paymentRef || null},
          ${subtotalAmount},
          ${discountAmount},
          ${discountReason},
          ${totalAmount},
          ${JSON.stringify(lines)}::jsonb,
          'COMPLETED',
          ${pharmacySnapshot?.vfdEnabled ? 'PENDING' : 'NOT_ENABLED'}
        )
        RETURNING
          "id",
          "reference_number",
          "payment_method",
          "payment_reference",
          "subtotal_amount",
          "discount_amount",
          "total_amount",
          "status",
          "vfd_status",
          "created_at"
      `);

      const event = inserted[0];

      return {
        event,
        lines,
      };
    });

    if (review?.requiresPicPin && payload.override) {
      const criticalInteraction = review.interactions.find((item) => item.requiresPicPin);
      const criticalContraindication = review.contraindications.find((item) => item.requiresPicPin);

      await prisma.overrideLog.create({
        data: {
          pharmacyId,
          userId: currentUserId,
          picUserId: verifiedPicUser!.userId,
          alertType: criticalContraindication ? 'CONTRAINDICATION' : 'INTERACTION',
          reason: payload.override.reason,
          interactionId: criticalInteraction?.id,
          contraindicationId: criticalContraindication?.id,
          payload: {
            referenceNumber,
            dispensingEventId: checkoutResult.event.id,
            review,
          } as Prisma.JsonObject,
        },
      });
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "audit_log" ("pharmacy_id", "table_name", "record_id", "action", "acted_by", "new_data")
      VALUES (
        ${pharmacyId},
        'dispensing_events',
        ${checkoutResult.event.id},
        'INSERT',
        ${currentUserId},
        ${JSON.stringify({ referenceNumber, totalAmount, lines: checkoutResult.lines })}::jsonb
      )
    `);

    res.status(201).json({
      data: {
        ...formatReceiptResponse(checkoutResult.event, checkoutResult.lines),
        safetyReview: review,
      },
    });
  } catch (error) {
    next(error);
  }
});

dispensingRouter.patch('/:id/void', requirePermission('dispensing.void_sale'), async (req: AuthRequest, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().trim().min(5).max(255) }).parse(req.body);
    const pharmacyId = getPharmacyId(req);
    const currentUserId = getUserId(req);

    const rows = await prisma.$queryRaw<Array<{ id: string; status: string; items: Prisma.JsonValue }>>(Prisma.sql`
      SELECT "id", "status", "items"
      FROM "dispensing_events"
      WHERE "id" = ${req.params.id} AND "pharmacy_id" = ${pharmacyId}
      LIMIT 1
    `);

    const event = rows[0];
    if (!event) {
      res.status(404).json({ error: 'Dispensing event not found' });
      return;
    }
    if (event.status === 'VOIDED') {
      res.status(409).json({ error: 'DISPENSING_ALREADY_VOIDED' });
      return;
    }

    const items = Array.isArray(event.items) ? (event.items as DispensingEventItem[]) : [];

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: { quantityRemaining: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            pharmacyId,
            productId: item.productId,
            batchId: item.batchId,
            userId: currentUserId,
            type: 'RETURNED',
            quantity: item.quantity,
            notes: `Void reversal for ${req.params.id}: ${reason}`,
          },
        });
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "dispensing_events"
        SET
          "status" = 'VOIDED',
          "void_reason" = ${reason},
          "voided_at" = CURRENT_TIMESTAMP,
          "voided_by" = ${currentUserId},
          "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = ${req.params.id}
      `);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "audit_log" ("pharmacy_id", "table_name", "record_id", "action", "acted_by", "new_data")
        VALUES (
          ${pharmacyId},
          'dispensing_events',
          ${req.params.id},
          'UPDATE',
          ${currentUserId},
          ${JSON.stringify({ status: 'VOIDED', reason })}::jsonb
        )
      `);
    });

    res.json({ data: { id: req.params.id, status: 'VOIDED' } });
  } catch (error) {
    next(error);
  }
});

dispensingRouter.put('/events/:id', requirePermission('dispensing.void_sale'), async (req, res) => {
  const protectedKeys = ['items', 'totalAmount', 'total_amount', 'dispensedBy', 'dispensed_by', 'createdAt', 'created_at'];
  if (protectedKeys.some((key) => key in (req.body ?? {}))) {
    res.status(403).json({ error: 'CORE_FIELDS_IMMUTABLE' });
    return;
  }

  res.status(400).json({ error: 'NO_EDITABLE_FIELDS' });
});

dispensingRouter.post(
  '/daily-close',
  requireRole('PHARMACIST_IN_CHARGE', 'OWNER', 'SUPER_ADMIN'),
  async (req: AuthRequest, res, next) => {
    try {
      const { actualCashCounted, notes } = z.object({
        actualCashCounted: z.number().nonnegative(),
        notes: z.string().trim().max(255).optional(),
      }).parse(req.body);
      const normalizedNotes = notes?.trim() || null;

      const pharmacyId = getPharmacyId(req);
      const currentUserId = getUserId(req);
      const rows = await prisma.$queryRaw<Array<{ expected_cash: string | number }>>(Prisma.sql`
        SELECT COALESCE(SUM("total_amount"), 0)::text AS "expected_cash"
        FROM "dispensing_events"
        WHERE
          "pharmacy_id" = ${pharmacyId}
          AND "payment_method" = 'CASH'
          AND "status" = 'COMPLETED'
          AND DATE("created_at" AT TIME ZONE 'Africa/Nairobi') = DATE(NOW() AT TIME ZONE 'Africa/Nairobi')
      `);

      const expectedCash = Number(rows[0]?.expected_cash ?? 0);
      const discrepancy = Number((actualCashCounted - expectedCash).toFixed(2));
      if (Math.abs(discrepancy) > 5000 && !normalizedNotes) {
        res.status(400).json({ error: 'VARIANCE_NOTE_REQUIRED' });
        return;
      }

      const result = await prisma.$queryRaw<
        Array<{
          id: string;
          closing_date: Date;
          expected_cash: string | number;
          actual_cash_counted: string | number;
          discrepancy: string | number;
        }>
      >(Prisma.sql`
        INSERT INTO "daily_closings" (
          "pharmacy_id",
          "closed_by",
          "signed_off_by",
          "closing_date",
          "expected_cash",
          "actual_cash_counted",
          "discrepancy",
          "notes"
        )
        VALUES (
          ${pharmacyId},
          ${currentUserId},
          ${currentUserId},
          DATE(NOW() AT TIME ZONE 'Africa/Nairobi'),
          ${expectedCash},
          ${actualCashCounted},
          ${discrepancy},
          ${normalizedNotes}
        )
        ON CONFLICT ("pharmacy_id", "closing_date")
        DO UPDATE SET
          "closed_by" = EXCLUDED."closed_by",
          "signed_off_by" = EXCLUDED."signed_off_by",
          "expected_cash" = EXCLUDED."expected_cash",
          "actual_cash_counted" = EXCLUDED."actual_cash_counted",
          "discrepancy" = EXCLUDED."discrepancy",
          "notes" = EXCLUDED."notes"
        RETURNING "id", "closing_date", "expected_cash", "actual_cash_counted", "discrepancy"
      `);

      res.status(201).json({
        data: {
          id: result[0].id,
          closingDate: result[0].closing_date,
          expectedCash,
          actualCashCounted: Number(result[0].actual_cash_counted),
          discrepancy: Number(result[0].discrepancy),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

dispensingRouter.get(
  '/controlled-register',
  requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'LOCUM', 'SUPER_ADMIN'),
  async (req: AuthRequest, res, next) => {
    try {
      const pharmacyId = getPharmacyId(req);
      const rows = await prisma.$queryRaw<Array<{
        event_id: string;
        reference_number: string;
        product_id: string;
        product_name: string;
        drug_class: string;
        quantity: number;
        batch_number: string | null;
        payment_method: string;
        created_at: Date;
        dispensed_by_name: string;
      }>>(Prisma.sql`
        SELECT
          de."id" AS event_id,
          de."reference_number",
          item."productId" AS product_id,
          p."name" AS product_name,
          p."drugClass"::text AS drug_class,
          item."quantity"::int AS quantity,
          item."batchNumber" AS batch_number,
          de."payment_method"::text AS payment_method,
          de."created_at",
          (u."firstName" || ' ' || u."lastName") AS dispensed_by_name
        FROM "dispensing_events" de
        INNER JOIN "users" u ON u."id" = de."dispensed_by"
        CROSS JOIN LATERAL jsonb_to_recordset(de."items") AS item(
          "productId" text,
          "quantity" int,
          "batchNumber" text
        )
        INNER JOIN "products" p ON p."id" = item."productId"
        WHERE
          de."pharmacy_id" = ${pharmacyId}
          AND de."status" = 'COMPLETED'
          AND p."drugClass" IN ('CONTROLLED', 'NARCOTIC')
        ORDER BY de."created_at" DESC
        LIMIT 200
      `);

      res.json({
        data: rows.map((row) => ({
          eventId: row.event_id,
          referenceNumber: row.reference_number,
          productId: row.product_id,
          productName: row.product_name,
          drugClass: row.drug_class,
          quantity: row.quantity,
          batchNumber: row.batch_number,
          paymentMethod: row.payment_method,
          dispensedByName: row.dispensed_by_name,
          createdAt: row.created_at.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);
