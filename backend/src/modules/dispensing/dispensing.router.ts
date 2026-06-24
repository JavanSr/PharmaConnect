import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Router, type NextFunction, type Response } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, assertUser, requireRole, type AuthRequest } from '../../middleware/auth';
import { hasPermission, requirePermission } from '../../middleware/permissions';
import { emitToPharmacy } from '../realtime/realtime.service';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { picPinLimiter } from '../../middleware/pic-pin';
import { prisma } from '../../lib/prisma';
import { clampLocalTimestamp } from '../../lib/timestamps';
import { recordAnonymousSafetyEvents, sessionReview } from '../patient-safety/patient-safety.service';
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
  localSessionId: z.string().trim().min(1).max(120).optional(),
  localTimestamp: z.string().datetime().optional(),
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
  return assertUser(req).userId;
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
          localCreatedAt: new Date(),
          syncedAt: new Date(),
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

type CheckoutPayload = z.infer<typeof checkoutSchema>;

// clampLocalTimestamp is imported from ../../lib/timestamps

// Override logs are permanent medical records. The write is intentionally
// non-fatal: if it fails the dispensing event has already committed and
// the sale must not return 500. Errors are logged at ERROR level so ops
// can reconstruct the missing entry from the dispensing event payload.
async function persistOverrideLog(data: Prisma.OverrideLogUncheckedCreateInput) {
  try {
    await prisma.overrideLog.create({ data });
  } catch (error) {
    console.error('[CRITICAL] Failed to write override log — medical record may be missing:', error);
  }
}

async function persistAnonymousSafetyEvents(input: Parameters<typeof recordAnonymousSafetyEvents>[0]) {
  try {
    await recordAnonymousSafetyEvents(input);
  } catch (error) {
    console.warn('Failed to record anonymous safety events', error);
  }
}

async function completeDispensingCheckout(input: {
  payload: CheckoutPayload;
  pharmacyId: string;
  currentUserId: string;
  user: NonNullable<AuthRequest['user']>;
  prescriptionPhotoPath?: string | null;
  source: 'ONLINE' | 'OFFLINE_SYNC';
}) {
  const { payload, pharmacyId, currentUserId, user } = input;
  const discountAmount = payload.discountAmount ?? 0;
  const discountReason = payload.discountReason?.trim() || null;
  const localSessionId = payload.localSessionId?.trim() || null;
  const localCreatedAt = clampLocalTimestamp(payload.localTimestamp);
  const syncedAt = new Date();

  if (localSessionId) {
    const existing = await prisma.$queryRaw<(DispensingEventLookupRow & { local_session_id: string | null })[]>(Prisma.sql`
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
        "items",
        "local_session_id"
      FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId} AND "local_session_id" = ${localSessionId}
      LIMIT 1
    `);

    if (existing[0]) {
      const lines = Array.isArray(existing[0].items) ? (existing[0].items as DispensingEventItem[]) : [];
      return {
        ...formatReceiptResponse(existing[0], lines),
        duplicate: true,
      };
    }
  }

  if ((discountAmount > 0 || discountReason) && !user) {
    throw Object.assign(new Error('Authentication required'), { status: 401, code: 'AUTHENTICATION_REQUIRED' });
  }

  if (discountAmount > 0 || discountReason) {
    const canDiscount = hasPermission(user.role, 'dispensing.apply_discount', user.pharmacy);
    if (!canDiscount) {
      throw Object.assign(new Error('Role insufficient'), { status: 403, code: 'ROLE_INSUFFICIENT' });
    }
    if (!(discountAmount > 0 && discountReason)) {
      throw Object.assign(new Error('Discount reason required'), { status: 400, code: 'DISCOUNT_REASON_REQUIRED' });
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
  }

  const referenceNumber = localSessionId
    ? `RX-OFF-${localSessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toUpperCase() || Date.now().toString(36).toUpperCase()}`
    : `RX-${Date.now().toString(36).toUpperCase()}`;
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

  const checkoutResult = await prisma.$transaction(async (tx) => {
    // FEFO batch selection inside transaction — read and write are now atomic,
    // eliminating the race window that caused spurious 409s under concurrent load.
    // Single batched query for all items (no N+1).
    const uniqueProductIds = [...new Set(payload.items.map((item) => item.productId))];
    const allBatches = await tx.batch.findMany({
      where: {
        pharmacyId,
        productId: { in: uniqueProductIds },
        quantityRemaining: { gt: 0 },
      },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    });
    const batchesByProduct = new Map<string, typeof allBatches>();
    for (const batch of allBatches) {
      const list = batchesByProduct.get(batch.productId) ?? [];
      list.push(batch);
      batchesByProduct.set(batch.productId, list);
    }

    const lines: DispensingEventItem[] = [];
    let subtotalAmount = 0;

    for (const item of payload.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw Object.assign(new Error('Product not found'), { status: 404, code: 'PRODUCT_NOT_FOUND' });
      }

      const productBatches = batchesByProduct.get(item.productId) ?? [];
      const batch = productBatches.find((b) => b.quantityRemaining >= item.quantity);
      if (!batch) {
        throw Object.assign(new Error('No FEFO batch has enough stock for this request'), { status: 409 });
      }

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
      });
    }

    const totalAmount = Number((subtotalAmount - discountAmount).toFixed(2));
    if (totalAmount < 0) {
      throw Object.assign(new Error('Discount cannot exceed subtotal'), { status: 400, code: 'DISCOUNT_EXCEEDS_SUBTOTAL' });
    }

    // Update all batches in parallel. The gte guard is kept as defense-in-depth:
    // if another transaction committed between our findMany and updateMany, this
    // catches it and rolls back cleanly instead of overselling.
    const batchUpdates = await Promise.all(
      lines.map((line) =>
        tx.batch.updateMany({
          where: { id: line.batchId, quantityRemaining: { gte: line.quantity } },
          data: { quantityRemaining: { decrement: line.quantity } },
        }),
      ),
    );

    const failedIndex = batchUpdates.findIndex((result) => result.count === 0);
    if (failedIndex !== -1) {
      throw Object.assign(new Error('Insufficient batch stock for FEFO allocation'), {
        status: 409,
        code: 'INSUFFICIENT_STOCK',
      });
    }

    await tx.stockMovement.createMany({
      data: lines.map((line) => ({
        pharmacyId,
        productId: line.productId,
        batchId: line.batchId,
        userId: currentUserId,
        type: 'DISPENSED' as const,
        quantity: line.quantity,
        notes: `Dispensed via ${referenceNumber}`,
        localCreatedAt: localCreatedAt ?? syncedAt,
        syncedAt,
      })),
    });

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
        "vfd_status",
        "local_session_id",
        "local_created_at",
        "synced_at"
      )
      VALUES (
        ${pharmacyId},
        ${currentUserId},
        ${user.normalizedRole === 'CASHIER' ? currentUserId : null},
        ${referenceNumber},
        ${payload.paymentMethod}::"PaymentMethod",
        ${payload.paymentRef || null},
        ${input.prescriptionPhotoPath ?? null},
        ${subtotalAmount},
        ${discountAmount},
        ${discountReason},
        ${totalAmount},
        ${JSON.stringify(lines)}::jsonb,
        'COMPLETED',
        ${pharmacySnapshot?.vfdEnabled ? 'PENDING' : 'NOT_ENABLED'},
        ${localSessionId},
        ${localCreatedAt},
        ${syncedAt}
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

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "dispensing_transactions" (
        "pharmacy_id",
        "local_session_id",
        "dispensing_event_id",
        "reference_number",
        "status",
        "payload",
        "local_created_at",
        "synced_at",
        "created_by"
      )
      VALUES (
        ${pharmacyId},
        ${localSessionId},
        ${event.id},
        ${referenceNumber},
        'COMPLETED',
        ${JSON.stringify({ source: input.source, checkout: payload, lines })}::jsonb,
        ${localCreatedAt},
        ${syncedAt},
        ${currentUserId}
      )
      ON CONFLICT DO NOTHING
    `);

    if (input.prescriptionPhotoPath) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "prescriptions" (
          "pharmacy_id",
          "dispensing_event_id",
          "reference_number",
          "photo_path",
          "metadata",
          "created_by"
        )
        VALUES (
          ${pharmacyId},
          ${event.id},
          ${referenceNumber},
          ${input.prescriptionPhotoPath},
          ${JSON.stringify({ source: input.source, localSessionId })}::jsonb,
          ${currentUserId}
        )
      `);
    }

    return {
      event,
      lines,
      totalAmount,
    };
  });

  if (payload.override && (review?.interactions.some((item) => item.requiresPicPin || item.severity === 'HIGH') || review?.contraindications.some((item) => item.requiresPicPin || item.severity === 'HIGH'))) {
    const criticalInteraction = review?.interactions.find((item) => item.requiresPicPin || item.severity === 'HIGH');
    const criticalContraindication = review?.contraindications.find((item) => item.requiresPicPin || item.severity === 'HIGH');
    await persistOverrideLog({
      pharmacyId,
      userId: currentUserId,
      picUserId: payload.override.pic_user_id || currentUserId,
      alertType: criticalContraindication ? 'CONTRAINDICATION' : 'INTERACTION',
      reason: payload.override.reason,
      interactionId: criticalInteraction?.id,
      contraindicationId: criticalContraindication?.id,
      payload: {
        referenceNumber,
        dispensingEventId: checkoutResult.event.id,
        review,
        localSessionId,
      } as Prisma.JsonObject,
    });
  }

  await persistAnonymousSafetyEvents({
    pharmacyId,
    userId: currentUserId,
    dispensingEventId: checkoutResult.event.id,
    referenceNumber,
    review,
    context: safetyContext,
    source: input.source === 'OFFLINE_SYNC' ? 'OFFLINE_SYNC' : 'DISPENSING_CHECKOUT',
    overrideEntered: Boolean(payload.override),
  });

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "audit_log" ("pharmacy_id", "table_name", "record_id", "action", "acted_by", "new_data")
    VALUES (
      ${pharmacyId},
      'dispensing_events',
      ${checkoutResult.event.id},
      'INSERT',
      ${currentUserId},
      ${JSON.stringify({
        referenceNumber,
        totalAmount: checkoutResult.totalAmount,
        lines: checkoutResult.lines,
        prescriptionPhotoPath: input.prescriptionPhotoPath ?? null,
        localSessionId,
        source: input.source,
      })}::jsonb
    )
  `);

  return {
    ...formatReceiptResponse(checkoutResult.event, checkoutResult.lines),
    safetyReview: review,
  };
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
      const canDiscount = hasPermission(assertUser(req).role, 'dispensing.apply_discount', assertUser(req).pharmacy);
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
    // Prescription photo upload must happen before the transaction — it's
    // external I/O and must not hold a DB connection open while it runs.
    const prescriptionPhotoPath = prescriptionPhoto
      ? await storePrescriptionPhoto({
          originalname: prescriptionPhoto.originalname,
          mimetype: prescriptionPhoto.mimetype,
          buffer: prescriptionPhoto.buffer,
        })
      : null;

    const checkoutResult = await prisma.$transaction(async (tx) => {
      // FEFO batch selection inside transaction — read and write are now atomic.
      // Single batched query for all items replaces the previous N per-item queries.
      const uniqueProductIds = [...new Set(payload.items.map((item) => item.productId))];
      const allBatches = await tx.batch.findMany({
        where: {
          pharmacyId,
          productId: { in: uniqueProductIds },
          quantityRemaining: { gt: 0 },
        },
        orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
      });
      const batchesByProduct = new Map<string, typeof allBatches>();
      for (const batch of allBatches) {
        const list = batchesByProduct.get(batch.productId) ?? [];
        list.push(batch);
        batchesByProduct.set(batch.productId, list);
      }

      const lines: DispensingEventItem[] = [];
      let subtotalAmount = 0;

      for (const item of payload.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw Object.assign(new Error('Product not found'), { status: 404, code: 'PRODUCT_NOT_FOUND' });
        }

        const productBatches = batchesByProduct.get(item.productId) ?? [];
        const batch = productBatches.find((b) => b.quantityRemaining >= item.quantity);
        if (!batch) {
          throw Object.assign(new Error('No FEFO batch has enough stock for this request'), { status: 409 });
        }

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
        });
      }

      const totalAmount = Number((subtotalAmount - discountAmount).toFixed(2));
      if (totalAmount < 0) {
        throw Object.assign(new Error('Discount cannot exceed subtotal'), { status: 400, code: 'DISCOUNT_EXCEEDS_SUBTOTAL' });
      }

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
            localCreatedAt: new Date(),
            syncedAt: new Date(),
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
          "vfd_status",
          "synced_at"
        )
        VALUES (
          ${pharmacyId},
          ${currentUserId},
          ${assertUser(req).normalizedRole === 'CASHIER' ? currentUserId : null},
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
          ${pharmacySnapshot?.vfdEnabled ? 'PENDING' : 'NOT_ENABLED'},
          CURRENT_TIMESTAMP
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
        totalAmount,
      };
    });

    if (prescriptionPhotoPath) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "prescriptions" (
          "pharmacy_id",
          "dispensing_event_id",
          "reference_number",
          "photo_path",
          "metadata",
          "created_by"
        )
        VALUES (
          ${pharmacyId},
          ${checkoutResult.event.id},
          ${referenceNumber},
          ${prescriptionPhotoPath},
          ${JSON.stringify({ source: 'ONLINE' })}::jsonb,
          ${currentUserId}
        )
      `);
    }

    if (payload.override && (review?.interactions.some((item) => item.requiresPicPin || item.severity === 'HIGH') || review?.contraindications.some((item) => item.requiresPicPin || item.severity === 'HIGH'))) {
      const criticalInteraction = review.interactions.find((item) => item.requiresPicPin || item.severity === 'HIGH');
      const criticalContraindication = review.contraindications.find((item) => item.requiresPicPin || item.severity === 'HIGH');

      await persistOverrideLog({
        pharmacyId,
        userId: currentUserId,
        picUserId: payload.override!.pic_user_id || currentUserId,
        alertType: criticalContraindication ? 'CONTRAINDICATION' : 'INTERACTION',
        reason: payload.override!.reason,
        interactionId: criticalInteraction?.id,
        contraindicationId: criticalContraindication?.id,
        payload: {
          referenceNumber,
          dispensingEventId: checkoutResult.event.id,
          review,
        } as Prisma.JsonObject,
      });
    }

  await persistAnonymousSafetyEvents({
    pharmacyId,
    userId: currentUserId,
    dispensingEventId: checkoutResult.event.id,
    referenceNumber,
    review,
    context: safetyContext,
    source: 'DISPENSING_CHECKOUT',
    overrideEntered: Boolean(payload.override),
  });

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "audit_log" ("pharmacy_id", "table_name", "record_id", "action", "acted_by", "new_data")
      VALUES (
        ${pharmacyId},
        'dispensing_events',
        ${checkoutResult.event.id},
        'INSERT',
        ${currentUserId},
        ${JSON.stringify({ referenceNumber, totalAmount: checkoutResult.totalAmount, lines: checkoutResult.lines, prescriptionPhotoPath })}::jsonb
      )
    `);

    emitToPharmacy(pharmacyId, 'STOCK_UPDATED');

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

const syncBatchSessionSchema = z
  .object({
    localSessionId: z.string().trim().min(1).max(120).optional(),
    localTimestamp: z.string().datetime().optional(),
    payload: checkoutSchema.optional(),
    checkout: checkoutSchema.optional(),
  })
  .refine((value) => Boolean(value.payload || value.checkout), {
    message: 'Each session requires a payload or checkout object',
  });

dispensingRouter.post('/sync-batch', requirePermission('dispensing.access'), async (req: AuthRequest, res, next) => {
  try {
    const { sessions } = z
      .object({
        sessions: z.array(syncBatchSessionSchema).min(1).max(50),
      })
      .parse(req.body);
    const pharmacyId = getPharmacyId(req);
    const currentUserId = getUserId(req);

    const results: Array<{
      localSessionId: string;
      status: 'SYNCED' | 'CONFLICT';
      data?: unknown;
      conflictId?: string;
      error?: string;
    }> = [];
    for (const session of sessions) {
      const basePayload = (session.payload ?? session.checkout)!;
      const payload: CheckoutPayload = {
        ...basePayload,
        localSessionId: basePayload.localSessionId ?? session.localSessionId,
        localTimestamp: basePayload.localTimestamp ?? session.localTimestamp,
      };
      const localSessionId: string = payload.localSessionId ?? session.localSessionId ?? `session-${results.length}`;

      try {
        const data = await completeDispensingCheckout({
          payload,
          pharmacyId,
          currentUserId,
          user: assertUser(req),
          source: 'OFFLINE_SYNC',
        });
        results.push({
          localSessionId,
          status: 'SYNCED',
          data,
        });
      } catch (error: any) {
        const status = Number(error?.status ?? 500);
        const code = typeof error?.code === 'string' ? error.code : 'DISPENSING_SYNC_FAILED';

        if (status >= 400 && status < 500) {
          const conflict = await prisma.syncConflict.create({
            data: {
              pharmacyId,
              entityType: 'DISPENSING_SESSION',
              entityId: localSessionId,
              conflictType: code,
              localPayload: payload as Prisma.InputJsonValue,
              serverPayload: {
                status,
                code,
                message: error?.message ?? 'Offline dispensing session was rejected during sync.',
                review: error?.review ?? null,
              },
            },
          });

          results.push({
            localSessionId,
            status: 'CONFLICT',
            conflictId: conflict.id,
            error: code,
          });
          continue;
        }

        throw error;
      }
    }

    res.json({
      data: {
        results,
        synced: results.filter((result) => result.status === 'SYNCED').length,
        conflicts: results.filter((result) => result.status === 'CONFLICT').length,
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

const dailyClosePayloadSchema = z.object({
  actualCashCounted: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(255).optional(),
  closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

type DailyClosePaymentBreakdown = {
  paymentMethod: string;
  salesCount: number;
  totalAmount: number;
};

type DailyCloseSummary = {
  date: string;
  totalSales: number;
  totalRevenueTzs: number;
  expectedCash: number;
  itemsDispensed: number;
  uniqueProducts: number;
  paymentBreakdown: DailyClosePaymentBreakdown[];
};

async function getPharmacyTimezone(pharmacyId: string): Promise<string> {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { timezone: true },
  });
  return pharmacy?.timezone ?? 'Africa/Nairobi';
}

function dailyCloseDateSql(closingDate?: string, timezone = 'Africa/Nairobi') {
  return closingDate
    ? Prisma.sql`CAST(${closingDate} AS date)`
    : Prisma.sql`DATE(NOW() AT TIME ZONE ${timezone})`;
}

async function getDailyCloseSummary(pharmacyId: string, closingDate?: string, timezone = 'Africa/Nairobi'): Promise<DailyCloseSummary> {
  const [summaryRows, itemRows, paymentRows] = await Promise.all([
    prisma.$queryRaw<Array<{
      close_date: Date | string;
      total_sales: string | number;
      total_revenue_tzs: string | number;
      expected_cash: string | number;
    }>>(Prisma.sql`
      WITH events AS (
        SELECT "id", "payment_method"::text AS "payment_method", "total_amount", "items"
        FROM "dispensing_events"
        WHERE
          "pharmacy_id" = ${pharmacyId}
          AND "status" = 'COMPLETED'
          AND DATE("created_at" AT TIME ZONE ${timezone}) = ${dailyCloseDateSql(closingDate, timezone)}
      )
      SELECT
        ${dailyCloseDateSql(closingDate, timezone)} AS "close_date",
        COUNT(*)::int AS "total_sales",
        COALESCE(SUM("total_amount"), 0)::text AS "total_revenue_tzs",
        COALESCE(SUM("total_amount") FILTER (WHERE "payment_method" = 'CASH'), 0)::text AS "expected_cash"
      FROM events
    `),
    prisma.$queryRaw<Array<{
      items_dispensed: string | number;
      unique_products: string | number;
    }>>(Prisma.sql`
      WITH events AS (
        SELECT "items"
        FROM "dispensing_events"
        WHERE
          "pharmacy_id" = ${pharmacyId}
          AND "status" = 'COMPLETED'
          AND DATE("created_at" AT TIME ZONE ${timezone}) = ${dailyCloseDateSql(closingDate, timezone)}
      ),
      line_items AS (
        SELECT
          COALESCE(item.value->>'productId', item.value->>'product_id') AS "product_id",
          COALESCE(NULLIF(item.value->>'quantity', '')::numeric, 0) AS "quantity"
        FROM events
        CROSS JOIN LATERAL jsonb_array_elements("items") AS item(value)
      )
      SELECT
        COALESCE(SUM("quantity"), 0)::int AS "items_dispensed",
        COUNT(DISTINCT "product_id") FILTER (WHERE "product_id" IS NOT NULL)::int AS "unique_products"
      FROM line_items
    `),
    prisma.$queryRaw<Array<{
      payment_method: string;
      sales_count: string | number;
      total_amount: string | number;
    }>>(Prisma.sql`
      SELECT
        "payment_method"::text,
        COUNT(*)::int AS "sales_count",
        COALESCE(SUM("total_amount"), 0)::text AS "total_amount"
      FROM "dispensing_events"
      WHERE
        "pharmacy_id" = ${pharmacyId}
        AND "status" = 'COMPLETED'
        AND DATE("created_at" AT TIME ZONE ${timezone}) = ${dailyCloseDateSql(closingDate, timezone)}
      GROUP BY "payment_method"
      ORDER BY "payment_method"
    `),
  ]);

  const closeDate = summaryRows[0]?.close_date;

  return {
    date: closeDate instanceof Date ? closeDate.toISOString().slice(0, 10) : String(closeDate),
    totalSales: Number(summaryRows[0]?.total_sales ?? 0),
    totalRevenueTzs: Number(summaryRows[0]?.total_revenue_tzs ?? 0),
    expectedCash: Number(summaryRows[0]?.expected_cash ?? 0),
    itemsDispensed: Number(itemRows[0]?.items_dispensed ?? 0),
    uniqueProducts: Number(itemRows[0]?.unique_products ?? 0),
    paymentBreakdown: paymentRows.map((row) => ({
      paymentMethod: row.payment_method,
      salesCount: Number(row.sales_count ?? 0),
      totalAmount: Number(row.total_amount ?? 0),
    })),
  };
}

async function getDailyCloseRecord(pharmacyId: string, closingDate?: string, timezone = 'Africa/Nairobi') {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      closing_date: Date;
      expected_cash: string | number;
      actual_cash_counted: string | number;
      discrepancy: string | number;
      notes: string | null;
      created_at: Date;
    }>
  >(Prisma.sql`
    SELECT "id", "closing_date", "expected_cash", "actual_cash_counted", "discrepancy", "notes", "created_at"
    FROM "daily_closings"
    WHERE "pharmacy_id" = ${pharmacyId}
      AND "closing_date" = ${dailyCloseDateSql(closingDate, timezone)}
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    closingDate: row.closing_date,
    expectedCash: Number(row.expected_cash),
    actualCashCounted: Number(row.actual_cash_counted),
    discrepancy: Number(row.discrepancy),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

dispensingRouter.get(
  '/daily-close',
  requireRole('PHARMACIST_IN_CHARGE', 'OWNER', 'SUPER_ADMIN'),
  async (req: AuthRequest, res, next) => {
    try {
      const { closingDate } = z
        .object({ closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })
        .parse(req.query);
      const pharmacyId = getPharmacyId(req);
      const timezone = await getPharmacyTimezone(pharmacyId);
      const [summary, existing] = await Promise.all([
        getDailyCloseSummary(pharmacyId, closingDate, timezone),
        getDailyCloseRecord(pharmacyId, closingDate, timezone),
      ]);

      res.json({
        data: {
          ...summary,
          closing: existing,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

dispensingRouter.post(
  ['/daily-close', '/close-day'],
  requireRole('PHARMACIST_IN_CHARGE', 'OWNER', 'SUPER_ADMIN'),
  async (req: AuthRequest, res, next) => {
    try {
      const { actualCashCounted, notes, closingDate } = dailyClosePayloadSchema.parse(req.body);
      const normalizedNotes = notes?.trim() || null;

      const pharmacyId = getPharmacyId(req);
      const currentUserId = getUserId(req);
      const timezone = await getPharmacyTimezone(pharmacyId);
      const summary = await getDailyCloseSummary(pharmacyId, closingDate, timezone);
      const discrepancy = Number((actualCashCounted - summary.expectedCash).toFixed(2));
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
          ${dailyCloseDateSql(closingDate, timezone)},
          ${summary.expectedCash},
          ${actualCashCounted},
          ${discrepancy},
          ${normalizedNotes}
        )
        ON CONFLICT ("pharmacy_id", "closing_date")
        DO NOTHING
        RETURNING "id", "closing_date", "expected_cash", "actual_cash_counted", "discrepancy"
      `);

      if (!result[0]) {
        res.status(409).json({ error: 'DAILY_CLOSE_ALREADY_EXISTS' });
        return;
      }

      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "audit_log" ("pharmacy_id", "table_name", "record_id", "action", "acted_by", "new_data")
        VALUES (
          ${pharmacyId},
          'daily_closings',
          ${result[0].id},
          'INSERT',
          ${currentUserId},
          ${JSON.stringify({
            date: summary.date,
            totalSales: summary.totalSales,
            totalRevenueTzs: summary.totalRevenueTzs,
            expectedCash: summary.expectedCash,
            actualCashCounted,
            discrepancy,
            itemsDispensed: summary.itemsDispensed,
            uniqueProducts: summary.uniqueProducts,
            paymentBreakdown: summary.paymentBreakdown,
          })}::jsonb
        )
      `);

      res.status(201).json({
        data: {
          id: result[0].id,
          date: summary.date,
          closingDate: result[0].closing_date,
          totalSales: summary.totalSales,
          totalRevenueTzs: summary.totalRevenueTzs,
          itemsDispensed: summary.itemsDispensed,
          uniqueProducts: summary.uniqueProducts,
          paymentBreakdown: summary.paymentBreakdown,
          expectedCash: summary.expectedCash,
          actualCashCounted: Number(result[0].actual_cash_counted),
          discrepancy: Number(result[0].discrepancy),
          notes: normalizedNotes,
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

      const { page, limit, from, to } = z.object({
        page:  z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(500).default(100),
        from:  z.string().datetime().optional(),
        to:    z.string().datetime().optional(),
      }).parse(req.query);

      const offset = (page - 1) * limit;
      const fromDate = from ? new Date(from) : null;
      const toDate   = to   ? new Date(to)   : null;

      type RegisterRow = {
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
      };

      const baseWhere = Prisma.sql`
        de."pharmacy_id" = ${pharmacyId}
        AND de."status" = 'COMPLETED'
        AND p."drugClass" IN ('CONTROLLED', 'NARCOTIC')
        ${fromDate ? Prisma.sql`AND de."created_at" >= ${fromDate}` : Prisma.empty}
        ${toDate   ? Prisma.sql`AND de."created_at" <= ${toDate}`   : Prisma.empty}
      `;

      const [rows, countResult] = await Promise.all([
        prisma.$queryRaw<RegisterRow[]>(Prisma.sql`
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
          WHERE ${baseWhere}
          ORDER BY de."created_at" DESC
          LIMIT ${limit} OFFSET ${offset}
        `),
        prisma.$queryRaw<[{ total: bigint }]>(Prisma.sql`
          SELECT COUNT(*) AS total
          FROM "dispensing_events" de
          CROSS JOIN LATERAL jsonb_to_recordset(de."items") AS item(
            "productId" text,
            "quantity" int,
            "batchNumber" text
          )
          INNER JOIN "products" p ON p."id" = item."productId"
          WHERE ${baseWhere}
        `),
      ]);

      const total = Number(countResult[0]?.total ?? 0);
      const totalPages = Math.ceil(total / limit);

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
        meta: {
          total,
          page,
          limit,
          totalPages,
          truncated: page === 1 && total > limit,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
