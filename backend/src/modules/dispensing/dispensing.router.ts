import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Router, type NextFunction, type Response } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { hasPermission, requirePermission } from '../../middleware/permissions';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { picPinLimiter, verifyPicPinForPharmacy } from '../../middleware/pic-pin';
import { prisma } from '../../lib/prisma';
import { resolveFefoBatch } from '../inventory/inventory.service';
import { sessionReview } from '../patient-safety/patient-safety.service';
import { ensurePaymentMethodConfig } from '../settings/payment-method-config';
import { trackFeatureTelemetry } from '../telemetry/feature-telemetry.service';

const paymentMethods = ['CASH', 'MPESA', 'TIGOPESA', 'AIRTEL_MONEY', 'HALOPESA', 'INSURANCE'] as const;
type PaymentMethod = (typeof paymentMethods)[number];
const LEGACY_PAYMENT_METHOD_OPTIONS = [
  { code: 'CASH', label: 'Cash', phoneNumber: '', note: 'Always enabled for offline fallback.', requiresReference: false, source: 'legacy' },
  { code: 'MPESA', label: 'M-Pesa', phoneNumber: '', note: '', requiresReference: true, source: 'legacy' },
  { code: 'TIGOPESA', label: 'Tigo Pesa', phoneNumber: '', note: '', requiresReference: true, source: 'legacy' },
] as const;
const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  MPESA: 'M-Pesa',
  TIGOPESA: 'Tigo Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  HALOPESA: 'Halo Pesa',
  INSURANCE: 'Insurance',
};

function requestHasPicPin(req: AuthRequest) {
  if (typeof req.body?.checkout === 'string') {
    try {
      return Boolean(JSON.parse(req.body.checkout)?.override?.pic_pin);
    } catch {
      return false;
    }
  }

  return Boolean(req.body?.override?.pic_pin);
}

function dispensingPicPinLimiter(req: AuthRequest, res: Response, next: NextFunction) {
  if (!requestHasPicPin(req)) {
    next();
    return;
  }

  picPinLimiter(req, res, next);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (Number(process.env.MAX_FILE_SIZE_MB ?? '5') || 5) * 1024 * 1024,
  },
});

type DispensingPaymentMethodOption = {
  code: PaymentMethod;
  label: string;
  phoneNumber: string;
  note: string;
  requiresReference: boolean;
  source: 'legacy' | 'config';
};

type PrescriptionPhotoUpload = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
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
  prescription_photo_path: string | null;
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

type DispensingEventLookupRow = {
  id: string;
  reference_number: string;
  payment_method: string;
  payment_reference: string | null;
  prescription_photo_path: string | null;
  subtotal_amount: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  status: string;
  vfd_status: string;
  created_at: Date;
  updated_at: Date;
  void_reason: string | null;
  voided_at: Date | null;
  items: Prisma.JsonValue;
};

function getPharmacyId(req: AuthRequest): string {
  const pid = req.user?.pharmacyId;
  if (!pid) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return pid;
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
    prescriptionPhotoPath: event.prescription_photo_path,
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

async function storePrescriptionPhoto(photo: PrescriptionPhotoUpload) {
  const uploadsRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
  const prescriptionDir = path.join(uploadsRoot, 'prescriptions');
  await mkdir(prescriptionDir, { recursive: true });

  const extension = path.extname(photo.originalname || '').toLowerCase();
  const safeExtension = extension && extension.length <= 10 ? extension : '.jpg';
  const filename = `${randomUUID()}${safeExtension}`;
  const absolutePath = path.join(prescriptionDir, filename);
  await writeFile(absolutePath, photo.buffer);

  return path.join('uploads', 'prescriptions', filename).replace(/\\/g, '/');
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return paymentMethods.includes(value as PaymentMethod);
}

function parseCheckoutPayload(req: AuthRequest) {
  if (typeof req.body?.checkout === 'string') {
    return checkoutSchema.parse(JSON.parse(req.body.checkout));
  }

  return checkoutSchema.parse(req.body);
}

async function reverseDispensingEvent(input: {
  pharmacyId: string;
  eventId: string;
  currentUserId: string;
  reason: string;
  source: 'VOID' | 'RETURN';
}) {
  const rows = await prisma.$queryRaw<DispensingEventLookupRow[]>(Prisma.sql`
    SELECT
      "id",
      "reference_number",
      "payment_method",
      "payment_reference",
      "prescription_photo_path",
      "subtotal_amount",
      "discount_amount",
      "total_amount",
      "status",
      "vfd_status",
      "created_at",
      "updated_at",
      "void_reason",
      "voided_at",
      "items"
    FROM "dispensing_events"
    WHERE "id" = ${input.eventId} AND "pharmacy_id" = ${input.pharmacyId}
    LIMIT 1
  `);

  const event = rows[0];
  if (!event) {
    throw Object.assign(new Error('Dispensing event not found'), { status: 404, code: 'DISPENSING_NOT_FOUND' });
  }
  if (event.status === 'VOIDED') {
    throw Object.assign(new Error('Dispensing event already voided'), { status: 409, code: 'DISPENSING_ALREADY_VOIDED' });
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
          pharmacyId: input.pharmacyId,
          productId: item.productId,
          batchId: item.batchId,
          userId: input.currentUserId,
          type: 'RETURNED',
          quantity: item.quantity,
          notes: `${input.source === 'RETURN' ? 'Return flow' : 'Void'} reversal for ${input.eventId}: ${input.reason}`,
        },
      });
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE "dispensing_events"
      SET
        "status" = 'VOIDED',
        "void_reason" = ${input.reason},
        "voided_at" = CURRENT_TIMESTAMP,
        "voided_by" = ${input.currentUserId},
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${input.eventId}
    `);

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "audit_log" ("pharmacy_id", "table_name", "record_id", "action", "acted_by", "new_data")
      VALUES (
        ${input.pharmacyId},
        'dispensing_events',
        ${input.eventId},
        'UPDATE',
        ${input.currentUserId},
        ${JSON.stringify({ status: 'VOIDED', reason: input.reason, source: input.source })}::jsonb
      )
    `);
  });

  return {
    id: event.id,
    referenceNumber: event.reference_number,
    status: 'VOIDED',
    voidReason: input.reason,
    source: input.source,
  };
}

function tryHandleDispensingError(res: any, error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status);
    const rawCode = (error as { code?: unknown }).code;
    const code = typeof rawCode === 'string'
      ? rawCode
      : 'DISPENSING_ERROR';
    if (Number.isFinite(status) && status >= 400) {
      res.status(status).json({ error: code });
      return true;
    }
  }

  return false;
}

function normalizeDispensingPaymentMethods(value: Prisma.JsonValue | null | undefined): DispensingPaymentMethodOption[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as Prisma.JsonObject).methods)) {
    return [...LEGACY_PAYMENT_METHOD_OPTIONS];
  }

  const methods = (value as Prisma.JsonObject).methods as Prisma.JsonArray;
  const seen = new Set<PaymentMethod>(['CASH']);
  const normalized: DispensingPaymentMethodOption[] = [
    {
      code: 'CASH',
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
    if (!code || code === 'CASH' || !isPaymentMethod(code) || seen.has(code)) {
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
      requiresReference: code !== 'CASH',
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

dispensingRouter.post('/checkout', requirePermission('dispensing.access'), upload.single('prescriptionPhoto'), dispensingPicPinLimiter, async (req: AuthRequest, res, next) => {
  try {
    const payload = parseCheckoutPayload(req);
    const pharmacyId = getPharmacyId(req);
    const currentUserId = getUserId(req);
    const discountAmount = payload.discountAmount ?? 0;
    const discountReason = payload.discountReason?.trim() || null;
    const prescriptionPhoto = req.file;

    if (prescriptionPhoto) {
      const allowedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!allowedPhotoTypes.has(prescriptionPhoto.mimetype)) {
        res.status(400).json({ error: 'UNSUPPORTED_PRESCRIPTION_PHOTO_TYPE' });
        return;
      }
    }

    if ((discountAmount > 0 || discountReason) && !req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (discountAmount > 0 || discountReason) {
      const canDiscount = hasPermission(req.user!.role, 'dispensing.apply_discount', req.user!.pharmacy);
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

    const prescriptionPhotoPath = prescriptionPhoto
      ? await storePrescriptionPhoto({
          originalname: prescriptionPhoto.originalname,
          mimetype: prescriptionPhoto.mimetype,
          buffer: prescriptionPhoto.buffer,
        })
      : null;

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
          "prescription_photo_path",
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
          ${prescriptionPhotoPath},
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
          "prescription_photo_path",
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
        ${JSON.stringify({ referenceNumber, totalAmount, lines: checkoutResult.lines, prescriptionPhotoPath })}::jsonb
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

dispensingRouter.get('/events', requirePermission('dispensing.void_sale'), async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      search: z.string().trim().max(100).optional(),
      status: z.enum(['COMPLETED', 'VOIDED']).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    }).parse(req.query);

    const pharmacyId = getPharmacyId(req);
    const searchPattern = query.search?.trim() ? `%${query.search.trim()}%` : null;
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      reference_number: string;
      payment_method: string;
      total_amount: string | number;
      status: string;
      created_at: Date;
      updated_at: Date;
      void_reason: string | null;
      voided_at: Date | null;
      item_count: number;
    }>>(Prisma.sql`
      SELECT
        "id",
        "reference_number",
        "payment_method"::text AS payment_method,
        "total_amount",
        "status",
        "created_at",
        "updated_at",
        "void_reason",
        "voided_at",
        jsonb_array_length("items") AS item_count
      FROM "dispensing_events"
      WHERE
        "pharmacy_id" = ${pharmacyId}
        AND (${query.status ?? null}::text IS NULL OR "status" = ${query.status ?? null})
        AND (${searchPattern}::text IS NULL OR "reference_number" ILIKE ${searchPattern})
      ORDER BY "created_at" DESC
      LIMIT ${query.limit ?? 20}
    `);

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        referenceNumber: row.reference_number,
        paymentMethod: row.payment_method,
        totalAmount: toNumber(row.total_amount),
        status: row.status,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        voidReason: row.void_reason,
        voidedAt: row.voided_at?.toISOString() ?? null,
        itemCount: Number(row.item_count ?? 0),
      })),
    });
  } catch (error) {
    next(error);
  }
});

dispensingRouter.patch('/:id/void', requirePermission('dispensing.void_sale'), async (req: AuthRequest, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().trim().min(5).max(255) }).parse(req.body);
    const result = await reverseDispensingEvent({
      pharmacyId: getPharmacyId(req),
      eventId: req.params.id,
      currentUserId: getUserId(req),
      reason,
      source: 'VOID',
    });

    res.json({ data: result });
  } catch (error) {
    if (tryHandleDispensingError(res, error)) {
      return;
    }
    next(error);
  }
});

dispensingRouter.post('/returns/:id', requirePermission('dispensing.void_sale'), async (req: AuthRequest, res, next) => {
  try {
    const { reason } = z.object({
      reason: z.string().trim().min(5).max(255),
    }).parse(req.body);

    const result = await reverseDispensingEvent({
      pharmacyId: getPharmacyId(req),
      eventId: req.params.id,
      currentUserId: getUserId(req),
      reason,
      source: 'RETURN',
    });

    await trackFeatureTelemetry({
      pharmacyId: getPharmacyId(req),
      userId: getUserId(req),
      featureKey: 'dispensing_returns',
      eventType: 'USED',
      metadata: {
        eventId: req.params.id,
      },
    });

    res.json({ data: result });
  } catch (error) {
    if (tryHandleDispensingError(res, error)) {
      return;
    }
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
  requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'),
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
