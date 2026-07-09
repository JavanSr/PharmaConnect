import { randomUUID } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { storeComplianceObject } from '../compliance/compliance.storage';
import { resolveActiveClientPriceOverrideMap, resolveSchemeDiscounts } from './b2b.extensions.service';
import { sendOrderStatusEmail } from '../../lib/email';

export const ORDER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'CONFIRMED',
  'CANCELLED',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
  'DISPUTED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderLine = {
  productId: string;
  productName: string;
  genericName: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  pickedQuantity?: number;
  verifiedQuantity?: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  buyer_pharmacy_id: string | null;
  seller_pharmacy_id: string;
  buyer_name: string | null;
  seller_name: string | null;
  walkin_buyer_name: string | null;
  assigned_picker: string | null;
  assigned_driver: string | null;
  status: OrderStatus;
  items: Prisma.JsonValue;
  subtotal_amount: Prisma.Decimal | string | number;
  total_amount: Prisma.Decimal | string | number;
  notes: string | null;
  submitted_at: Date | null;
  confirmed_at: Date | null;
  packed_at: Date | null;
  dispatched_at: Date | null;
  delivered_at: Date | null;
  completed_at: Date | null;
  disputed_at: Date | null;
  cancelled_at: Date | null;
  scheduled_delivery_at: Date | null;
  delivery_window_label: string | null;
  delivery_note: string | null;
  scheme_savings_tzs: Prisma.Decimal | string | number;
  applied_scheme_ids: Prisma.JsonValue;
  created_at: Date;
  updated_at: Date;
};

type CataloguePricingRow = {
  product_id: string;
  product_name: string;
  generic_name: string | null;
  barcode: string | null;
  price: Prisma.Decimal | string | number;
  tier_prices: Prisma.JsonValue;
  min_order_quantity: number;
  max_order_quantity: number | null;
};

type CreditLimitRow = {
  id: string;
  seller_pharmacy_id: string;
  client_pharmacy_id: string;
  credit_limit: Prisma.Decimal | string | number;
  outstanding_balance: Prisma.Decimal | string | number;
  payment_terms_days: number;
  is_active: boolean;
  block_new_orders: boolean;
  block_reason: string | null;
};

type TierPriceMap = Partial<Record<'ADDO' | 'ESSENTIAL' | 'ADDO_PLUS' | 'STANDARD' | 'PREMIUM' | 'WHOLESALE' | 'ENTERPRISE', number>>;

function parseTierPrices(value: Prisma.JsonValue): TierPriceMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<TierPriceMap>((acc, [key, raw]) => {
    const numeric = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return acc;
    }

    if (['ADDO', 'ESSENTIAL', 'ADDO_PLUS', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE'].includes(key)) {
      acc[key as keyof TierPriceMap] = Math.round(numeric);
    }

    return acc;
  }, {});
}

function resolveTierPrice(
  basePrice: number,
  tierPrices: TierPriceMap,
  buyerTier: string | null | undefined,
): number {
  if (!buyerTier) {
    return basePrice;
  }

  const tierPrice = tierPrices[buyerTier as keyof TierPriceMap];
  return typeof tierPrice === 'number' ? tierPrice : basePrice;
}

const STATE_MACHINE: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED'],
  CANCELLED: [],
  PACKED: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  DISPUTED: [],
};

function asNumber(value: Prisma.Decimal | string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function mapCreditLimit(row: CreditLimitRow) {
  return {
    id: row.id,
    sellerPharmacyId: row.seller_pharmacy_id,
    clientPharmacyId: row.client_pharmacy_id,
    creditLimit: asNumber(row.credit_limit),
    outstandingBalance: asNumber(row.outstanding_balance),
    paymentTermsDays: row.payment_terms_days,
    isActive: row.is_active,
    blockNewOrders: row.block_new_orders,
    blockReason: row.block_reason,
  };
}

function mapOrder(row: OrderRow) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    buyerPharmacyId: row.buyer_pharmacy_id,
    sellerPharmacyId: row.seller_pharmacy_id,
    buyerName: row.walkin_buyer_name ?? row.buyer_name ?? undefined,
    sellerName: row.seller_name ?? undefined,
    walkinBuyerName: row.walkin_buyer_name ?? undefined,
    assignedPicker: row.assigned_picker,
    assignedDriver: row.assigned_driver,
    status: row.status,
    items: Array.isArray(row.items) ? (row.items as OrderLine[]) : [],
    subtotalAmount: asNumber(row.subtotal_amount),
    totalAmount: asNumber(row.total_amount),
    notes: row.notes,
    submittedAt: row.submitted_at?.toISOString() ?? null,
    confirmedAt: row.confirmed_at?.toISOString() ?? null,
    packedAt: row.packed_at?.toISOString() ?? null,
    dispatchedAt: row.dispatched_at?.toISOString() ?? null,
    deliveredAt: row.delivered_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    disputedAt: row.disputed_at?.toISOString() ?? null,
    cancelledAt: row.cancelled_at?.toISOString() ?? null,
    scheduledDeliveryAt: row.scheduled_delivery_at?.toISOString() ?? null,
    deliveryWindowLabel: row.delivery_window_label,
    deliveryNote: row.delivery_note,
    schemeSavingsTzs: asNumber(row.scheme_savings_tzs),
    appliedSchemeIds: Array.isArray(row.applied_scheme_ids) ? (row.applied_scheme_ids as string[]) : [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function getOrderRow(orderId: string, pharmacyId: string, sellerOnly = false) {
  const rows = await prisma.$queryRaw<OrderRow[]>(Prisma.sql`
    SELECT *
    FROM "orders"
    WHERE "id" = ${orderId}
      AND ${
        sellerOnly
          ? Prisma.sql`"seller_pharmacy_id" = ${pharmacyId}`
          : Prisma.sql`("seller_pharmacy_id" = ${pharmacyId} OR "buyer_pharmacy_id" = ${pharmacyId})`
      }
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function assertPlatformWholesaleSeller(sellerPharmacyId: string) {
  const seller = await prisma.pharmacy.findUnique({
    where: { id: sellerPharmacyId },
    select: { id: true, subscriptionTier: true },
  });

  if (!seller || !['WHOLESALE', 'ENTERPRISE'].includes(seller.subscriptionTier)) {
    throw Object.assign(new Error('SELLER_NOT_ON_PLATFORM'), {
      status: 403,
      code: 'SELLER_NOT_ON_PLATFORM',
    });
  }
}

async function fetchCreditLimit(sellerPharmacyId: string, clientPharmacyId: string) {
  const rows = await prisma.$queryRaw<CreditLimitRow[]>(Prisma.sql`
    SELECT *
    FROM "client_credit_limits"
    WHERE "seller_pharmacy_id" = ${sellerPharmacyId}
      AND "client_pharmacy_id" = ${clientPharmacyId}
      AND "is_active" = true
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function validateCreditLimit(sellerPharmacyId: string, clientPharmacyId: string, totalAmount: number) {
  const creditLimit = await fetchCreditLimit(sellerPharmacyId, clientPharmacyId);
  if (!creditLimit) {
    return null;
  }

  if (creditLimit.block_new_orders) {
    throw Object.assign(new Error('CREDIT_BLOCKED'), {
      status: 403,
      code: 'CREDIT_BLOCKED',
      blockReason: creditLimit.block_reason,
    });
  }

  if (asNumber(creditLimit.outstanding_balance) + totalAmount > asNumber(creditLimit.credit_limit)) {
    throw Object.assign(new Error('CREDIT_LIMIT_EXCEEDED'), {
      status: 402,
      code: 'CREDIT_LIMIT_EXCEEDED',
      creditLimit: asNumber(creditLimit.credit_limit),
      outstandingBalance: asNumber(creditLimit.outstanding_balance),
    });
  }

  return creditLimit;
}

function ensureValidTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
  if (!STATE_MACHINE[currentStatus].includes(nextStatus)) {
    throw Object.assign(new Error('INVALID_STATE_TRANSITION'), {
      status: 422,
      code: 'INVALID_STATE_TRANSITION',
      currentStatus,
      nextStatus,
    });
  }
}

async function renderInvoicePdf(input: {
  invoiceNumber: string;
  orderNumber: string;
  sellerName: string;
  buyerName: string;
  items: OrderLine[];
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
}) {
  const doc = new PDFDocument({ margin: 42 });
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text('APOTEKH VAT Invoice', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Invoice: ${input.invoiceNumber}`);
    doc.text(`Order: ${input.orderNumber}`);
    doc.text(`Seller: ${input.sellerName}`);
    doc.text(`Buyer: ${input.buyerName}`);
    doc.moveDown();

    input.items.forEach((item) => {
      doc.font('Helvetica-Bold').text(item.productName);
      doc.font('Helvetica').text(`Qty ${item.quantity} x Tsh ${item.unitPrice.toFixed(2)} = Tsh ${item.lineTotal.toFixed(2)}`);
      doc.moveDown(0.25);
    });

    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Subtotal: Tsh ${input.subtotalAmount.toFixed(2)}`);
    doc.text(`VAT (18%): Tsh ${input.vatAmount.toFixed(2)}`);
    doc.text(`Total: Tsh ${input.totalAmount.toFixed(2)}`);
    doc.end();
  });
}

async function generateVatInvoice(order: OrderRow) {
  const efdmsEnabled = process.env.FEATURE_EFDMS_INVOICES === 'true';
  const efdmsStatus = efdmsEnabled ? 'QUEUED' : 'STUBBED';
  const efdmsPayload: { provider: string; mode: string; orderId: string; invoiceNumber: string | null } = {
    provider: 'EFDMS',
    mode: efdmsEnabled ? 'feature_flagged' : 'stub',
    orderId: order.id,
    invoiceNumber: null,
  };
  const numberRows = await prisma.$queryRaw<Array<{ invoice_number: string }>>(Prisma.sql`
    SELECT 'PC-INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('vat_invoice_number_seq')::text, 6, '0') AS invoice_number
  `);

  const invoiceNumber = numberRows[0]?.invoice_number;
  if (!invoiceNumber) {
    throw new Error('VAT invoice number generation failed');
  }

  const [seller, buyer] = await Promise.all([
    prisma.pharmacy.findUnique({ where: { id: order.seller_pharmacy_id }, select: { name: true } }),
    order.buyer_pharmacy_id
      ? prisma.pharmacy.findUnique({ where: { id: order.buyer_pharmacy_id }, select: { name: true } })
      : null,
  ]);

  const items = Array.isArray(order.items) ? (order.items as OrderLine[]) : [];
  const subtotalAmount = asNumber(order.subtotal_amount);
  const vatAmount = Number((subtotalAmount * 0.18).toFixed(2));
  const totalAmount = Number((subtotalAmount + vatAmount).toFixed(2));
  const pdf = await renderInvoicePdf({
    invoiceNumber,
    orderNumber: order.order_number,
    sellerName: seller?.name ?? 'Seller',
    buyerName: buyer?.name ?? 'Buyer',
    items,
    subtotalAmount,
    vatAmount,
    totalAmount,
  });

  const stored = await storeComplianceObject({
    bucket: 'vat-invoices',
    folder: order.seller_pharmacy_id,
    fileName: `${invoiceNumber}.pdf`,
    contentType: 'application/pdf',
    buffer: pdf,
  });
  efdmsPayload.invoiceNumber = invoiceNumber;

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "vat_invoices" (
      "id",
      "order_id",
      "invoice_number",
      "pdf_path",
      "subtotal_amount",
      "vat_amount",
      "total_amount",
      "efdms_status",
      "efdms_payload",
      "updated_at"
    )
    VALUES (
      ${randomUUID()},
      ${order.id},
      ${invoiceNumber},
      ${stored.filePath},
      ${subtotalAmount},
      ${vatAmount},
      ${totalAmount},
      ${efdmsStatus},
      ${JSON.stringify(efdmsPayload)}::jsonb,
      NOW()
    )
    ON CONFLICT ("order_id") DO NOTHING
  `);

  return {
    invoiceNumber,
    pdfPath: stored.filePath,
    url: stored.url,
    subtotalAmount,
    vatAmount,
    totalAmount,
    efdmsStatus,
    efdmsReference: null,
    efdmsPayload,
  };
}

async function sendOrderStatusNotification(order: OrderRow, nextStatus: OrderStatus) {
  const statusMessages: Partial<Record<OrderStatus, string>> = {
    CONFIRMED: 'Your order has been confirmed by the seller and is being prepared.',
    DISPATCHED: 'Your order is on its way. Expect delivery soon.',
    DELIVERED: 'Your order has been delivered. Please confirm receipt.',
    CANCELLED: 'Your order has been cancelled. Contact your supplier for details.',
  };

  const message = statusMessages[nextStatus];
  if (!message) return;

  if (!order.buyer_pharmacy_id) return;

  const buyerOwner = await prisma.pharmacyMembership.findFirst({
    where: { pharmacyId: order.buyer_pharmacy_id, role: 'OWNER', active: true },
    select: { user: { select: { email: true, firstName: true } } },
  });

  const sellerName = (await prisma.pharmacy.findUnique({
    where: { id: order.seller_pharmacy_id },
    select: { name: true },
  }))?.name ?? 'Your supplier';

  if (buyerOwner?.user?.email) {
    await sendOrderStatusEmail({
      to: buyerOwner.user.email,
      firstName: buyerOwner.user.firstName,
      orderNumber: order.order_number,
      status: nextStatus,
      sellerName,
      message,
    });
  }
}

export async function listWholesaleCatalogue(sellerPharmacyId?: string | null, buyerPharmacyId?: string | null) {
  const buyerTier = buyerPharmacyId
    ? (await prisma.pharmacy.findUnique({
      where: { id: buyerPharmacyId },
      select: { subscriptionTier: true },
    }))?.subscriptionTier ?? null
    : null;

  const rows = await prisma.$queryRaw<Array<{
    catalogue_id: string;
    catalogue_title: string;
    catalogue_description: string | null;
    seller_pharmacy_id: string;
    seller_pharmacy_name: string;
    product_id: string;
    product_name: string;
    generic_name: string | null;
    barcode: string | null;
    price: Prisma.Decimal | string | number;
    tier_prices: Prisma.JsonValue;
    min_order_quantity: number;
    max_order_quantity: number | null;
  }>>(Prisma.sql`
    SELECT
      wc."id" AS catalogue_id,
      wc."title" AS catalogue_title,
      wc."description" AS catalogue_description,
      wc."pharmacy_id" AS seller_pharmacy_id,
      ph."name" AS seller_pharmacy_name,
      p."id" AS product_id,
      p."name" AS product_name,
      p."genericName" AS generic_name,
      p."barcode" AS barcode,
      wcp."price",
      wcp."tier_prices",
      wcp."min_order_quantity",
      wcp."max_order_quantity"
    FROM "wholesale_catalogues" wc
    INNER JOIN "wholesale_catalogue_pricing" wcp ON wcp."catalogue_id" = wc."id"
    INNER JOIN "products" p ON p."id" = wcp."product_id"
    INNER JOIN "pharmacies" ph ON ph."id" = wc."pharmacy_id"
    WHERE wc."is_active" = true
      AND wcp."is_active" = true
      ${sellerPharmacyId ? Prisma.sql`AND wc."pharmacy_id" = ${sellerPharmacyId}` : Prisma.empty}
    ORDER BY wc."created_at" DESC, p."name" ASC
  `);

  return rows.map((row) => {
    const basePrice = asNumber(row.price);
    const tierPrices = parseTierPrices(row.tier_prices);

    return {
      catalogueId: row.catalogue_id,
      title: row.catalogue_title,
      description: row.catalogue_description,
      sellerPharmacyId: row.seller_pharmacy_id,
      sellerPharmacyName: row.seller_pharmacy_name,
      productId: row.product_id,
      productName: row.product_name,
      genericName: row.generic_name,
      barcode: row.barcode,
      price: basePrice,
      tierPrices,
      effectivePrice: resolveTierPrice(basePrice, tierPrices, buyerTier),
      minOrderQuantity: row.min_order_quantity,
      maxOrderQuantity: row.max_order_quantity,
    };
  });
}

export async function upsertWholesaleCatalogue(input: {
  sellerPharmacyId: string;
  title: string;
  description?: string;
  items: Array<{
    productId: string;
    price: number;
    minOrderQuantity?: number;
    maxOrderQuantity?: number | null;
    tierPrices?: TierPriceMap;
  }>;
}) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO "wholesale_catalogues" ("id", "pharmacy_id", "title", "description")
    VALUES (${randomUUID()}, ${input.sellerPharmacyId}, ${input.title.trim()}, ${input.description ?? null})
    RETURNING "id"
  `);

  const catalogueId = rows[0]?.id;
  if (!catalogueId) {
    throw new Error('Catalogue creation failed');
  }

  for (const item of input.items) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "wholesale_catalogue_pricing" (
        "id",
        "catalogue_id",
        "product_id",
        "price",
        "tier_prices",
        "min_order_quantity",
        "max_order_quantity"
      )
      VALUES (
        ${randomUUID()},
        ${catalogueId},
        ${item.productId},
        ${item.price},
        ${JSON.stringify(item.tierPrices ?? {})}::jsonb,
        ${item.minOrderQuantity ?? 1},
        ${item.maxOrderQuantity ?? null}
      )
    `);
  }

  return { catalogueId };
}

export async function removeCatalogueItem(sellerPharmacyId: string, catalogueId: string, productId: string) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "wholesale_catalogue_pricing"
    SET "is_active" = false, "updated_at" = NOW()
    WHERE "catalogue_id" = ${catalogueId}
      AND "product_id" = ${productId}
      AND EXISTS (
        SELECT 1 FROM "wholesale_catalogues" wc
        WHERE wc."id" = ${catalogueId} AND wc."pharmacy_id" = ${sellerPharmacyId}
      )
  `);
}

async function reserveStockForOrder(orderId: string, sellerPharmacyId: string, lines: OrderLine[]) {
  for (const line of lines) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "b2b_stock_reservations" ("order_id", "product_id", "seller_pharmacy_id", "reserved_qty")
      VALUES (${orderId}::uuid, ${line.productId}, ${sellerPharmacyId}, ${line.quantity})
      ON CONFLICT ("order_id", "product_id") DO UPDATE SET "reserved_qty" = EXCLUDED."reserved_qty"
    `);
  }
}

async function releaseStockReservation(orderId: string) {
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "b2b_stock_reservations" WHERE "order_id" = ${orderId}::uuid
  `);
}

export async function getStockAvailability(sellerPharmacyId: string, productIds: string[]) {
  const availability = new Map<string, number>();
  for (const productId of productIds) {
    const rows = await prisma.$queryRaw<Array<{ available: number }>>(Prisma.sql`
      SELECT
        COALESCE(SUM(b."quantityRemaining"), 0) -
        COALESCE((
          SELECT SUM(r."reserved_qty")
          FROM "b2b_stock_reservations" r
          INNER JOIN "orders" o ON o."id" = r."order_id"::text
          WHERE r."seller_pharmacy_id" = ${sellerPharmacyId}
            AND r."product_id" = ${productId}
            AND o."status" NOT IN ('CANCELLED', 'COMPLETED', 'DISPUTED')
        ), 0) AS available
      FROM "batches" b
      WHERE b."pharmacyId" = ${sellerPharmacyId}
        AND b."productId" = ${productId}
        AND b."quantityRemaining" > 0
        AND b."expiryDate" > NOW()
    `);
    availability.set(productId, Number(rows[0]?.available ?? 0));
  }
  return availability;
}

async function checkStockAvailability(sellerPharmacyId: string, items: Array<{ productId: string; quantity: number }>) {
  const availability = await getStockAvailability(sellerPharmacyId, items.map((item) => item.productId));
  for (const item of items) {
    const available = availability.get(item.productId) ?? 0;
    if (available < item.quantity) {
      throw Object.assign(new Error('INSUFFICIENT_STOCK'), {
        status: 422,
        code: 'INSUFFICIENT_STOCK',
        productId: item.productId,
        requested: item.quantity,
        available,
      });
    }
  }
}

export async function createOrder(input: {
  buyerPharmacyId?: string | null;
  walkinBuyerName?: string;
  sellerPharmacyId: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number }>;
  allowPartialFulfilment?: boolean;
  enforceMoq?: boolean;
}) {
  const enforceMoq = input.enforceMoq ?? true;
  await assertPlatformWholesaleSeller(input.sellerPharmacyId);
  if (!input.buyerPharmacyId && !input.walkinBuyerName) {
    throw Object.assign(new Error('Either buyerPharmacyId or walkinBuyerName is required'), { status: 422 });
  }
  const buyer = input.buyerPharmacyId
    ? await prisma.pharmacy.findUnique({
        where: { id: input.buyerPharmacyId },
        select: { subscriptionTier: true },
      })
    : null;

  const pricingRows = await prisma.$queryRaw<CataloguePricingRow[]>(Prisma.sql`
    SELECT
      p."id" AS product_id,
      p."name" AS product_name,
      p."genericName" AS generic_name,
      p."barcode" AS barcode,
      wcp."price",
      wcp."tier_prices",
      wcp."min_order_quantity",
      wcp."max_order_quantity"
    FROM "wholesale_catalogue_pricing" wcp
    INNER JOIN "wholesale_catalogues" wc ON wc."id" = wcp."catalogue_id"
    INNER JOIN "products" p ON p."id" = wcp."product_id"
    WHERE wc."pharmacy_id" = ${input.sellerPharmacyId}
      AND wc."is_active" = true
      AND wcp."is_active" = true
      AND p."id" IN (${Prisma.join(input.items.map((item) => item.productId))})
  `);
  const overridePriceMap = input.buyerPharmacyId
    ? await resolveActiveClientPriceOverrideMap(
        input.sellerPharmacyId,
        input.buyerPharmacyId,
        input.items.map((item) => item.productId),
      )
    : new Map<string, number>();

  const pricingMap = new Map(pricingRows.map((row) => [row.product_id, row]));
  const pricedItems = input.items.map((item) => {
    const pricing = pricingMap.get(item.productId);
    if (!pricing) {
      throw Object.assign(new Error('CATALOGUE_ITEM_NOT_FOUND'), { status: 404, code: 'CATALOGUE_ITEM_NOT_FOUND' });
    }

    if (enforceMoq && item.quantity < pricing.min_order_quantity) {
      throw Object.assign(new Error('MIN_ORDER_QUANTITY_NOT_MET'), { status: 422, code: 'MIN_ORDER_QUANTITY_NOT_MET' });
    }

    if (pricing.max_order_quantity && item.quantity > pricing.max_order_quantity) {
      throw Object.assign(new Error('MAX_ORDER_QUANTITY_EXCEEDED'), { status: 422, code: 'MAX_ORDER_QUANTITY_EXCEEDED' });
    }

    const unitPrice =
      overridePriceMap.get(pricing.product_id) ??
      resolveTierPrice(asNumber(pricing.price), parseTierPrices(pricing.tier_prices), buyer?.subscriptionTier);
    return { pricing, requestedQuantity: item.quantity, unitPrice };
  });

  // Partial fulfilment: clamp lines to available stock and queue the shortfall
  // as backorders. Requested-quantity checks (MOQ/max) above still apply.
  type BackorderDraft = { productId: string; productName: string; quantity: number; unitPrice: number };
  const backorderDrafts: BackorderDraft[] = [];

  if (input.allowPartialFulfilment && input.buyerPharmacyId) {
    const availability = await getStockAvailability(
      input.sellerPharmacyId,
      pricedItems.map((item) => item.pricing.product_id),
    );
    for (const item of pricedItems) {
      const available = Math.max(0, availability.get(item.pricing.product_id) ?? 0);
      if (available < item.requestedQuantity) {
        backorderDrafts.push({
          productId: item.pricing.product_id,
          productName: item.pricing.product_name,
          quantity: item.requestedQuantity - available,
          unitPrice: item.unitPrice,
        });
        item.requestedQuantity = available;
      }
    }
    if (pricedItems.every((item) => item.requestedQuantity <= 0)) {
      throw Object.assign(new Error('INSUFFICIENT_STOCK'), {
        status: 422,
        code: 'INSUFFICIENT_STOCK',
        detail: 'No items in stock — nothing to ship. Order not created; try again when the seller restocks.',
      });
    }
  }

  const lines: OrderLine[] = pricedItems
    .filter((item) => item.requestedQuantity > 0)
    .map((item) => ({
      productId: item.pricing.product_id,
      productName: item.pricing.product_name,
      genericName: item.pricing.generic_name,
      barcode: item.pricing.barcode,
      quantity: item.requestedQuantity,
      unitPrice: item.unitPrice,
      lineTotal: Number((item.unitPrice * item.requestedQuantity).toFixed(2)),
      pickedQuantity: 0,
      verifiedQuantity: 0,
    }));

  const subtotalAmount = Number(lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
  const { totalSavings, appliedSchemeIds } = await resolveSchemeDiscounts(input.sellerPharmacyId, lines);
  const totalAmount = Number((subtotalAmount - totalSavings).toFixed(2));

  await checkStockAvailability(
    input.sellerPharmacyId,
    lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
  );
  if (input.buyerPharmacyId) {
    await validateCreditLimit(input.sellerPharmacyId, input.buyerPharmacyId, totalAmount);
  }

  const orderId = randomUUID();
  const rows = await prisma.$queryRaw<OrderRow[]>(Prisma.sql`
    INSERT INTO "orders" (
      "id",
      "buyer_pharmacy_id",
      "walkin_buyer_name",
      "seller_pharmacy_id",
      "status",
      "items",
      "subtotal_amount",
      "total_amount",
      "scheme_savings_tzs",
      "applied_scheme_ids",
      "notes",
      "submitted_at"
    )
    VALUES (
      ${orderId}::uuid,
      ${input.buyerPharmacyId ?? null},
      ${input.walkinBuyerName ?? null},
      ${input.sellerPharmacyId},
      'SUBMITTED',
      ${JSON.stringify(lines)}::jsonb,
      ${subtotalAmount},
      ${totalAmount},
      ${totalSavings},
      ${JSON.stringify(appliedSchemeIds)}::jsonb,
      ${input.notes ?? null},
      NOW()
    )
    RETURNING *
  `);

  await reserveStockForOrder(orderId, input.sellerPharmacyId, lines);

  let backorders: Awaited<ReturnType<typeof prisma.b2bBackorder.create>>[] = [];
  if (backorderDrafts.length > 0 && input.buyerPharmacyId) {
    const buyerPharmacyId = input.buyerPharmacyId;
    const orderNumber = rows[0].order_number;
    backorders = await prisma.$transaction(
      backorderDrafts.map((draft) =>
        prisma.b2bBackorder.create({
          data: {
            orderId,
            orderNumber,
            sellerPharmacyId: input.sellerPharmacyId,
            buyerPharmacyId,
            productId: draft.productId,
            productName: draft.productName,
            quantity: draft.quantity,
            unitPrice: draft.unitPrice,
          },
        }),
      ),
    );

    const summary = backorderDrafts
      .map((draft) => `${draft.productName} ×${draft.quantity}`)
      .join(', ');
    await prisma.notification.create({
      data: {
        pharmacyId: input.sellerPharmacyId,
        type: 'B2B_BACKORDER_CREATED',
        title: `Backorder queued on order ${orderNumber}`,
        body: `Short stock on: ${summary}. Fulfil from the backorder queue once stock arrives.`,
        metadata: { orderId, orderNumber, backorderIds: backorders.map((b) => b.id) },
      },
    }).catch(() => undefined);
  }

  const buyerLabel = input.walkinBuyerName
    ?? (input.buyerPharmacyId
      ? (await prisma.pharmacy.findUnique({ where: { id: input.buyerPharmacyId }, select: { name: true } }))?.name ?? 'a buyer'
      : 'a buyer');
  void flagSuspiciousControlledOrder({
    orderId,
    orderNumber: rows[0].order_number,
    sellerPharmacyId: input.sellerPharmacyId,
    buyerLabel,
    lines,
  });

  return { ...mapOrder(rows[0]), backorders: backorders.map(mapBackorder) };
}

function mapBackorder(row: {
  id: string;
  orderId: string;
  orderNumber: string;
  sellerPharmacyId: string;
  buyerPharmacyId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Prisma.Decimal | number;
  status: string;
  fulfilledOrderId: string | null;
  fulfilledAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    sellerPharmacyId: row.sellerPharmacyId,
    buyerPharmacyId: row.buyerPharmacyId,
    productId: row.productId,
    productName: row.productName,
    quantity: row.quantity,
    unitPrice: asNumber(row.unitPrice),
    status: row.status,
    fulfilledOrderId: row.fulfilledOrderId,
    fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listBackorders(input: { pharmacyId: string; side: 'seller' | 'buyer'; status?: 'OPEN' | 'FULFILLED' | 'CANCELLED' }) {
  const rows = await prisma.b2bBackorder.findMany({
    where: {
      ...(input.side === 'seller'
        ? { sellerPharmacyId: input.pharmacyId }
        : { buyerPharmacyId: input.pharmacyId }),
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const counterpartIds = [...new Set(rows.map((row) => (input.side === 'seller' ? row.buyerPharmacyId : row.sellerPharmacyId)))];
  const names = counterpartIds.length > 0
    ? await prisma.pharmacy.findMany({ where: { id: { in: counterpartIds } }, select: { id: true, name: true } })
    : [];
  const nameMap = new Map(names.map((p) => [p.id, p.name]));

  return rows.map((row) => ({
    ...mapBackorder(row),
    counterpartName: nameMap.get(input.side === 'seller' ? row.buyerPharmacyId : row.sellerPharmacyId) ?? null,
  }));
}

export async function cancelBackorder(input: { backorderId: string; pharmacyId: string; userId: string }) {
  const result = await prisma.b2bBackorder.updateMany({
    where: {
      id: input.backorderId,
      status: 'OPEN',
      OR: [{ sellerPharmacyId: input.pharmacyId }, { buyerPharmacyId: input.pharmacyId }],
    },
    data: { status: 'CANCELLED', cancelledBy: input.userId },
  });
  if (result.count === 0) {
    throw Object.assign(new Error('Backorder not found or not open'), { status: 404 });
  }
  const row = await prisma.b2bBackorder.findUnique({ where: { id: input.backorderId } });
  return row ? mapBackorder(row) : null;
}

export async function fulfilBackorder(input: { backorderId: string; sellerPharmacyId: string; userId: string }) {
  const backorder = await prisma.b2bBackorder.findFirst({
    where: { id: input.backorderId, sellerPharmacyId: input.sellerPharmacyId, status: 'OPEN' },
  });
  if (!backorder) {
    throw Object.assign(new Error('Backorder not found or not open'), { status: 404 });
  }

  // MOQ is waived: the buyer already committed to this quantity on the original order.
  const order = await createOrder({
    buyerPharmacyId: backorder.buyerPharmacyId,
    sellerPharmacyId: input.sellerPharmacyId,
    items: [{ productId: backorder.productId, quantity: backorder.quantity }],
    notes: `Backorder fulfilment for order ${backorder.orderNumber}`,
    enforceMoq: false,
  });

  // Guard against double-fulfilment: only flip if still OPEN.
  const updated = await prisma.b2bBackorder.updateMany({
    where: { id: backorder.id, status: 'OPEN' },
    data: { status: 'FULFILLED', fulfilledOrderId: order.id, fulfilledAt: new Date() },
  });
  if (updated.count === 0) {
    throw Object.assign(new Error('Backorder was already fulfilled or cancelled'), { status: 409 });
  }

  await prisma.notification.create({
    data: {
      pharmacyId: backorder.buyerPharmacyId,
      type: 'B2B_BACKORDER_FULFILLED',
      title: `Backordered item now shipping — ${backorder.productName}`,
      body: `${backorder.productName} ×${backorder.quantity} from order ${backorder.orderNumber} has been placed as order ${order.orderNumber}.`,
      metadata: { backorderId: backorder.id, originalOrderId: backorder.orderId, fulfilledOrderId: order.id },
    },
  }).catch(() => undefined);

  return { backorder: (await prisma.b2bBackorder.findUnique({ where: { id: backorder.id } }))!, order };
}

/**
 * Suspicious Order Monitoring (SOM): flag unusually large orders of
 * CONTROLLED/NARCOTIC products so the wholesaler can review before dispatch.
 * Threshold per product: max(SOM floor, 3 × the product's average ordered
 * quantity at this seller over the past 90 days). Alert-only — never blocks
 * the order. Fire-and-forget: must never break order creation.
 */
const SOM_QTY_FLOOR = Number(process.env.SOM_CONTROLLED_QTY_THRESHOLD ?? 100);

export async function flagSuspiciousControlledOrder(input: {
  orderId: string;
  orderNumber: string;
  sellerPharmacyId: string;
  buyerLabel: string;
  lines: OrderLine[];
}) {
  try {
    const controlled = await prisma.product.findMany({
      where: {
        id: { in: input.lines.map((line) => line.productId) },
        drugClass: { in: ['CONTROLLED', 'NARCOTIC'] },
      },
      select: { id: true, name: true, drugClass: true },
    });
    if (controlled.length === 0) return;

    const flagged: Array<{ productId: string; productName: string; drugClass: string; quantity: number; threshold: number }> = [];
    for (const product of controlled) {
      const line = input.lines.find((l) => l.productId === product.id);
      if (!line) continue;

      const historyRows = await prisma.$queryRaw<Array<{ avg_qty: number | null; cnt: bigint | number }>>(Prisma.sql`
        SELECT AVG((item->>'quantity')::numeric) AS avg_qty, COUNT(*) AS cnt
        FROM "orders" o, jsonb_array_elements(o."items") AS item
        WHERE o."seller_pharmacy_id" = ${input.sellerPharmacyId}
          AND item->>'productId' = ${product.id}
          AND o."created_at" >= NOW() - INTERVAL '90 days'
          AND o."id" <> ${input.orderId}
          AND o."status" NOT IN ('CANCELLED')
      `);
      const historyCount = Number(historyRows[0]?.cnt ?? 0);
      const avgQty = Number(historyRows[0]?.avg_qty ?? 0);
      const threshold = historyCount >= 3
        ? Math.max(SOM_QTY_FLOOR, Math.ceil(avgQty * 3))
        : SOM_QTY_FLOOR;

      if (line.quantity > threshold) {
        flagged.push({
          productId: product.id,
          productName: product.name,
          drugClass: product.drugClass,
          quantity: line.quantity,
          threshold,
        });
      }
    }
    if (flagged.length === 0) return;

    const summary = flagged
      .map((f) => `${f.productName} ×${f.quantity} (threshold ${f.threshold})`)
      .join(', ');
    await prisma.notification.create({
      data: {
        pharmacyId: input.sellerPharmacyId,
        type: 'SUSPICIOUS_ORDER_ALERT',
        title: `Review order ${input.orderNumber} — unusually large controlled quantity`,
        body: `Order from ${input.buyerLabel} includes ${summary}. Verify legitimacy before dispatch; controlled-substance orders above the usual pattern must be reviewed.`,
        metadata: { orderId: input.orderId, orderNumber: input.orderNumber, flagged: JSON.parse(JSON.stringify(flagged)) },
      },
    });
  } catch {
    // alert-only; never break order creation
  }
}

/**
 * Called from stock intake: when a wholesale pharmacy receives stock for a
 * product with OPEN backorders, notify them the backorders can now be fulfilled.
 * Fire-and-forget — must never break the intake flow.
 */
export async function notifyFulfillableBackorders(pharmacyId: string, productId: string) {
  try {
    const open = await prisma.b2bBackorder.findMany({
      where: { sellerPharmacyId: pharmacyId, productId, status: 'OPEN' },
      take: 20,
    });
    if (open.length === 0) return;

    const totalQty = open.reduce((sum, row) => sum + row.quantity, 0);
    await prisma.notification.create({
      data: {
        pharmacyId,
        type: 'B2B_BACKORDER_STOCK_ARRIVED',
        title: `Stock arrived for backordered ${open[0].productName}`,
        body: `${open.length} open backorder${open.length > 1 ? 's' : ''} (${totalQty} units) can now be fulfilled from the backorder queue.`,
        metadata: { productId, backorderIds: open.map((row) => row.id) },
      },
    });
  } catch {
    // never block stock intake on notification failures
  }
}

export async function listOrders(input: {
  pharmacyId: string;
  role: string;
  assignedPickerUserId?: string;
}) {
  const wholesaleScope = ['WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF'].includes(input.role);
  const rows = await prisma.$queryRaw<OrderRow[]>(Prisma.sql`
    SELECT
      o.*,
      bp."name" AS buyer_name,
      sp."name" AS seller_name
    FROM "orders" o
    LEFT JOIN "pharmacies" bp ON bp."id" = o."buyer_pharmacy_id"
    LEFT JOIN "pharmacies" sp ON sp."id" = o."seller_pharmacy_id"
    WHERE ${
      wholesaleScope
        ? Prisma.sql`o."seller_pharmacy_id" = ${input.pharmacyId}`
        : Prisma.sql`(o."buyer_pharmacy_id" = ${input.pharmacyId} OR o."seller_pharmacy_id" = ${input.pharmacyId})`
    }
    ${input.assignedPickerUserId ? Prisma.sql`AND o."assigned_picker" = ${input.assignedPickerUserId}` : Prisma.empty}
    ORDER BY o."created_at" DESC
    LIMIT 200
  `);

  return rows.map(mapOrder);
}

export async function getOrder(orderId: string, pharmacyId: string) {
  const order = await getOrderRow(orderId, pharmacyId);
  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  return mapOrder(order);
}

export async function upsertCreditLimit(input: {
  sellerPharmacyId: string;
  clientPharmacyId: string;
  creditLimit: number;
  outstandingBalance?: number;
  paymentTermsDays?: number;
  blockNewOrders?: boolean;
  blockReason?: string | null;
}) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "client_credit_limits" (
      "id",
      "seller_pharmacy_id",
      "client_pharmacy_id",
      "credit_limit",
      "outstanding_balance",
      "payment_terms_days",
      "block_new_orders",
      "block_reason"
    )
    VALUES (
      ${randomUUID()},
      ${input.sellerPharmacyId},
      ${input.clientPharmacyId},
      ${input.creditLimit},
      ${input.outstandingBalance ?? 0},
      ${input.paymentTermsDays ?? 30},
      ${input.blockNewOrders ?? false},
      ${input.blockReason ?? null}
    )
    ON CONFLICT ("seller_pharmacy_id", "client_pharmacy_id")
    DO UPDATE SET
      "credit_limit" = EXCLUDED."credit_limit",
      "outstanding_balance" = EXCLUDED."outstanding_balance",
      "payment_terms_days" = EXCLUDED."payment_terms_days",
      "block_new_orders" = EXCLUDED."block_new_orders",
      "block_reason" = EXCLUDED."block_reason",
      "updated_at" = NOW()
  `);

  const saved = await fetchCreditLimit(input.sellerPharmacyId, input.clientPharmacyId);
  return saved ? mapCreditLimit(saved) : null;
}

export async function listCreditLimits(sellerPharmacyId: string) {
  const rows = await prisma.$queryRaw<Array<CreditLimitRow & { client_name: string }>>(Prisma.sql`
    SELECT ccl.*, p."name" AS client_name
    FROM "client_credit_limits" ccl
    INNER JOIN "pharmacies" p ON p."id" = ccl."client_pharmacy_id"
    WHERE ccl."seller_pharmacy_id" = ${sellerPharmacyId}
    ORDER BY ccl."created_at" DESC
  `);

  return rows.map((row) => ({
    ...mapCreditLimit(row),
    clientName: row.client_name,
  }));
}

export async function updateOrderStatus(input: {
  orderId: string;
  pharmacyId: string;
  nextStatus: OrderStatus;
  assignedPicker?: string | null;
  assignedDriver?: string | null;
}) {
  const order = await getOrderRow(input.orderId, input.pharmacyId);
  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  ensureValidTransition(order.status, input.nextStatus);
  const timestampColumn = ({
    SUBMITTED: 'submitted_at',
    CONFIRMED: 'confirmed_at',
    PACKED: 'packed_at',
    DISPATCHED: 'dispatched_at',
    DELIVERED: 'delivered_at',
    COMPLETED: 'completed_at',
    DISPUTED: 'disputed_at',
    CANCELLED: 'cancelled_at',
  } as Partial<Record<OrderStatus, string>>)[input.nextStatus];

  if (!timestampColumn) {
    throw Object.assign(new Error('INVALID_STATE_TRANSITION'), {
      status: 422,
      code: 'INVALID_STATE_TRANSITION',
    });
  }

  const tsCol = Prisma.raw(`"${timestampColumn}"`);
  const updatedRows = await prisma.$queryRaw<OrderRow[]>(Prisma.sql`
    UPDATE "orders"
    SET
      "status" = ${input.nextStatus}::"OrderStatus",
      "assigned_picker" = COALESCE(${input.assignedPicker ?? null}, "assigned_picker"),
      "assigned_driver" = COALESCE(${input.assignedDriver ?? null}, "assigned_driver"),
      "updated_at" = NOW(),
      ${tsCol} = COALESCE(${tsCol}, NOW())
    WHERE "id" = ${order.id}
    RETURNING *
  `);

  const updated = updatedRows[0];
  const invoice = input.nextStatus === 'CONFIRMED' ? await generateVatInvoice(updated) : null;

  if (['CANCELLED', 'COMPLETED', 'DISPUTED'].includes(input.nextStatus)) {
    await releaseStockReservation(order.id);
  }

  sendOrderStatusNotification(updated, input.nextStatus).catch(() => undefined);

  return { order: mapOrder(updated), invoice };
}

export async function pickOrderItems(input: {
  orderId: string;
  pharmacyId: string;
  pickerUserId: string;
  picks: Array<{ productId: string; pickedQuantity: number }>;
}) {
  const order = await getOrderRow(input.orderId, input.pharmacyId, true);
  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  if (!['CONFIRMED', 'PACKED'].includes(order.status)) {
    throw Object.assign(new Error('INVALID_STATE_TRANSITION'), { status: 422, code: 'INVALID_STATE_TRANSITION' });
  }

  const pickMap = new Map(input.picks.map((pick) => [pick.productId, pick.pickedQuantity]));
  const lines = (Array.isArray(order.items) ? order.items : []) as OrderLine[];
  const updatedLines = lines.map((line) => ({
    ...line,
    pickedQuantity: Math.min(line.quantity, Math.max(0, pickMap.get(line.productId) ?? line.pickedQuantity ?? 0)),
  }));
  const allPicked = updatedLines.every((line) => (line.pickedQuantity ?? 0) >= line.quantity);

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "orders"
    SET
      "items" = ${JSON.stringify(updatedLines)}::jsonb,
      "assigned_picker" = ${input.pickerUserId},
      "status" = ${allPicked ? 'PACKED' : order.status}::"OrderStatus",
      "packed_at" = CASE WHEN ${allPicked} THEN COALESCE("packed_at", NOW()) ELSE "packed_at" END,
      "updated_at" = NOW()
    WHERE "id" = ${order.id}
  `);

  return getOrder(order.id, input.pharmacyId);
}

export async function verifyOrderItems(input: {
  orderId: string;
  pharmacyId: string;
  scannedBarcodes: string[];
}) {
  const order = await getOrderRow(input.orderId, input.pharmacyId, true);
  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  const counts = input.scannedBarcodes.reduce<Record<string, number>>((acc, barcode) => {
    acc[barcode] = (acc[barcode] ?? 0) + 1;
    return acc;
  }, {});
  const lines = (Array.isArray(order.items) ? order.items : []) as OrderLine[];
  const knownBarcodes = new Set(lines.map((line) => line.barcode).filter(Boolean));

  const matched = lines
    .filter((line) => line.barcode && (counts[line.barcode] ?? 0) >= line.quantity)
    .map((line) => ({
      productId: line.productId,
      barcode: line.barcode!,
      expected: line.quantity,
      scanned: counts[line.barcode!] ?? 0,
    }));

  const shortfall = lines
    .filter((line) => !line.barcode || (counts[line.barcode] ?? 0) < line.quantity)
    .map((line) => ({
      productId: line.productId,
      barcode: line.barcode,
      expected: line.quantity,
      scanned: line.barcode ? counts[line.barcode] ?? 0 : 0,
    }));

  const unmatched = Object.entries(counts)
    .filter(([barcode]) => !knownBarcodes.has(barcode))
    .map(([barcode, scanned]) => ({ barcode, scanned }));

  const updatedLines = lines.map((line) => ({
    ...line,
    verifiedQuantity: line.barcode ? Math.min(line.quantity, counts[line.barcode] ?? 0) : 0,
  }));

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "orders"
    SET "items" = ${JSON.stringify(updatedLines)}::jsonb, "updated_at" = NOW()
    WHERE "id" = ${order.id}
  `);

  return { matched, unmatched, shortfall };
}

export async function confirmDelivery(input: { orderId: string; pharmacyId: string; userId: string }) {
  const result = await updateOrderStatus({
    orderId: input.orderId,
    pharmacyId: input.pharmacyId,
    nextStatus: 'DELIVERED',
  });

  const order = result.order;
  const stockUpdated: string[] = [];
  const stockSkipped: string[] = [];

  if (order.buyerPharmacyId && Array.isArray(order.items) && order.items.length > 0) {
    const buyerPharmacyId = order.buyerPharmacyId;
    const lines = order.items as OrderLine[];

    for (const line of lines) {
      // 0 means "step not performed" (createOrder initializes both to 0), so
      // fall through to the ordered quantity rather than delivering nothing.
      const qty = (line.verifiedQuantity || 0) > 0
        ? line.verifiedQuantity!
        : (line.pickedQuantity || 0) > 0
          ? line.pickedQuantity!
          : line.quantity;
      if (qty <= 0) continue;

      const buyerProduct = await prisma.product.findFirst({
        where: { pharmacyId: buyerPharmacyId, name: { equals: line.productName, mode: 'insensitive' } },
        select: { id: true },
      });

      if (!buyerProduct) {
        stockSkipped.push(line.productName);
        continue;
      }

      // FEFO-allocate the delivered quantity across the seller's real batches:
      // decrement seller stock (goods physically left) and mirror each consumed
      // batch on the buyer side with its true batch number and expiry date.
      // Generous timeout: many sequential statements against a remote DB.
      await prisma.$transaction(async (tx) => {
        const sellerBatches = await tx.batch.findMany({
          where: {
            pharmacyId: order.sellerPharmacyId,
            productId: line.productId,
            quantityRemaining: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          orderBy: { expiryDate: 'asc' },
        });

        let remaining = qty;
        const allocations: Array<{ batchNumber: string; expiryDate: Date; quantity: number }> = [];

        for (const sellerBatch of sellerBatches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, sellerBatch.quantityRemaining);
          await tx.batch.update({
            where: { id: sellerBatch.id },
            data: { quantityRemaining: { decrement: take } },
          });
          await tx.stockMovement.create({
            data: {
              pharmacyId: order.sellerPharmacyId,
              productId: line.productId,
              batchId: sellerBatch.id,
              userId: input.userId,
              type: 'TRANSFERRED',
              quantity: take,
              notes: `B2B dispatch — order ${order.orderNumber}`,
            },
          });
          allocations.push({ batchNumber: sellerBatch.batchNumber, expiryDate: sellerBatch.expiryDate, quantity: take });
          remaining -= take;
        }

        // Seller's recorded stock ran out (e.g. sold off-system) but the goods
        // were physically delivered — still receive them on the buyer side,
        // under a synthetic batch flagged for manual expiry verification.
        if (remaining > 0) {
          allocations.push({
            batchNumber: `B2B-${order.orderNumber}-${line.productId.slice(-4).toUpperCase()}`,
            expiryDate: allocations[allocations.length - 1]?.expiryDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            quantity: remaining,
          });
        }

        for (const allocation of allocations) {
          const batch = await tx.batch.create({
            data: {
              productId: buyerProduct.id,
              pharmacyId: buyerPharmacyId,
              batchNumber: allocation.batchNumber,
              expiryDate: allocation.expiryDate,
              quantityRemaining: allocation.quantity,
              purchasePrice: line.unitPrice,
            },
          });
          await tx.stockMovement.create({
            data: {
              pharmacyId: buyerPharmacyId,
              productId: buyerProduct.id,
              batchId: batch.id,
              userId: input.userId,
              type: 'RECEIVED',
              quantity: allocation.quantity,
              notes: `B2B delivery — order ${order.orderNumber}, batch ${allocation.batchNumber}`,
            },
          });
        }
      }, { maxWait: 15_000, timeout: 60_000 });

      stockUpdated.push(line.productName);
    }

    // Physical stock has left the seller — the batch decrement now represents
    // it, so drop the order's availability reservation to avoid double-counting.
    await releaseStockReservation(order.id);

    if (stockSkipped.length > 0) {
      await prisma.notification.create({
        data: {
          pharmacyId: buyerPharmacyId,
          type: 'B2B_STOCK_UPDATE_SKIPPED',
          title: `${stockSkipped.length} delivered item${stockSkipped.length > 1 ? 's' : ''} not added to your inventory`,
          body: `No matching product found for: ${stockSkipped.join(', ')}. Create the product${stockSkipped.length > 1 ? 's' : ''} and receive the stock via Stock Intake (order ${order.orderNumber}).`,
          metadata: { orderId: order.id, orderNumber: order.orderNumber, skippedProducts: stockSkipped },
        },
      }).catch(() => undefined);
    }
  }

  return { ...result, stockUpdated, stockSkipped };
}

export async function scheduleDelivery(input: {
  orderId: string;
  pharmacyId: string;
  scheduledDeliveryAt: Date;
  deliveryWindowLabel?: string | null;
  deliveryNote?: string | null;
}) {
  const order = await getOrderRow(input.orderId, input.pharmacyId, true);
  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  const rows = await prisma.$queryRaw<OrderRow[]>(Prisma.sql`
    UPDATE "orders"
    SET
      "scheduled_delivery_at" = ${input.scheduledDeliveryAt},
      "delivery_window_label" = ${input.deliveryWindowLabel ?? null},
      "delivery_note" = ${input.deliveryNote ?? null},
      "updated_at" = NOW()
    WHERE "id" = ${order.id}
    RETURNING *
  `);

  return mapOrder(rows[0]);
}

export async function listVatInvoices(pharmacyId: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    order_id: string;
    order_number: string;
    buyer_name: string | null;
    invoice_number: string;
    pdf_path: string | null;
    subtotal_amount: Prisma.Decimal | string | number;
    vat_amount: Prisma.Decimal | string | number;
    total_amount: Prisma.Decimal | string | number;
    efdms_status: string | null;
    efdms_reference: string | null;
    efdms_payload: Prisma.JsonValue;
    efdms_synced_at: Date | null;
    issued_at: Date;
  }>>(Prisma.sql`
    SELECT
      vi.*,
      o."order_number",
      bp."name" AS buyer_name
    FROM "vat_invoices" vi
    INNER JOIN "orders" o ON o."id" = vi."order_id"
    LEFT JOIN "pharmacies" bp ON bp."id" = o."buyer_pharmacy_id"
    WHERE o."seller_pharmacy_id" = ${pharmacyId} OR o."buyer_pharmacy_id" = ${pharmacyId}
    ORDER BY vi."issued_at" DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    buyerName: row.buyer_name ?? undefined,
    invoiceNumber: row.invoice_number,
    pdfPath: row.pdf_path,
    subtotalAmount: asNumber(row.subtotal_amount),
    vatAmount: asNumber(row.vat_amount),
    totalAmount: asNumber(row.total_amount),
    efdmsStatus: row.efdms_status ?? undefined,
    efdmsReference: row.efdms_reference,
    efdmsPayload: row.efdms_payload,
    efdmsSyncedAt: row.efdms_synced_at?.toISOString() ?? null,
    issuedAt: row.issued_at.toISOString(),
  }));
}

// Applied when the seller has not set payment terms on the buyer's credit limit.
const DEFAULT_PAYMENT_TERMS_DAYS = 30;

export async function listReceivablesAging(sellerPharmacyId: string) {
  const rows = await prisma.$queryRaw<Array<{
    invoice_id: string;
    invoice_number: string;
    order_id: string;
    buyer_pharmacy_id: string;
    buyer_name: string;
    total_amount: Prisma.Decimal | string | number;
    issued_at: Date;
    payment_terms_days: number | null;
    paid_amount: Prisma.Decimal | string | number | null;
  }>>(Prisma.sql`
    SELECT
      vi."id" AS invoice_id,
      vi."invoice_number",
      vi."order_id",
      o."buyer_pharmacy_id",
      p."name" AS buyer_name,
      vi."total_amount",
      vi."issued_at",
      cl."payment_terms_days",
      pay."paid_amount"
    FROM "vat_invoices" vi
    INNER JOIN "orders" o ON o."id" = vi."order_id"
    INNER JOIN "pharmacies" p ON p."id" = o."buyer_pharmacy_id"
    LEFT JOIN "client_credit_limits" cl
      ON cl."seller_pharmacy_id" = o."seller_pharmacy_id"
     AND cl."client_pharmacy_id" = o."buyer_pharmacy_id"
     AND cl."is_active" = true
    LEFT JOIN (
      SELECT "invoice_id", SUM("amount_tzs") AS paid_amount
      FROM "wholesale_payments"
      WHERE "invoice_id" IS NOT NULL
      GROUP BY "invoice_id"
    ) pay ON pay."invoice_id" = vi."id"
    WHERE o."seller_pharmacy_id" = ${sellerPharmacyId}
    ORDER BY vi."issued_at" DESC
  `);

  const buckets = {
    current: 0,
    days31To60: 0,
    days61To90: 0,
    over90: 0,
  };

  const invoices = rows.flatMap((row) => {
    const totalAmount = asNumber(row.total_amount);
    const paidAmount = asNumber(row.paid_amount);
    const openAmount = Math.max(0, totalAmount - paidAmount);
    if (openAmount <= 0) return [];

    const daysOutstanding = Math.max(
      0,
      Math.floor((Date.now() - row.issued_at.getTime()) / 86_400_000),
    );

    const paymentTermsDays = row.payment_terms_days ?? DEFAULT_PAYMENT_TERMS_DAYS;
    const dueDate = new Date(row.issued_at.getTime() + paymentTermsDays * 86_400_000);
    const daysOverdue = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86_400_000));

    if (daysOutstanding <= 30) {
      buckets.current += openAmount;
    } else if (daysOutstanding <= 60) {
      buckets.days31To60 += openAmount;
    } else if (daysOutstanding <= 90) {
      buckets.days61To90 += openAmount;
    } else {
      buckets.over90 += openAmount;
    }

    return [{
      invoiceId: row.invoice_id,
      invoiceNumber: row.invoice_number,
      orderId: row.order_id,
      buyerPharmacyId: row.buyer_pharmacy_id,
      buyerName: row.buyer_name,
      totalAmount,
      paidAmount,
      openAmount,
      daysOutstanding,
      paymentTermsDays,
      dueDate: dueDate.toISOString(),
      isOverdue: daysOverdue > 0,
      daysOverdue,
      issuedAt: row.issued_at.toISOString(),
    }];
  });

  const overdueInvoices = invoices.filter((invoice) => invoice.isOverdue);

  return {
    totalOpenAmount: invoices.reduce((sum, invoice) => sum + invoice.openAmount, 0),
    overdueAmount: overdueInvoices.reduce((sum, invoice) => sum + invoice.openAmount, 0),
    overdueCount: overdueInvoices.length,
    buckets,
    invoices,
  };
}

export async function getDemandInsights(sellerPharmacyId: string) {
  const rows = await prisma.$queryRaw<Array<{
    buyer_pharmacy_id: string;
    created_at: Date;
    items: Prisma.JsonValue;
  }>>(Prisma.sql`
    SELECT
      o."buyer_pharmacy_id",
      o."created_at",
      o."items"
    FROM "orders" o
    WHERE o."seller_pharmacy_id" = ${sellerPharmacyId}
      AND o."status" IN ('CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'COMPLETED')
      AND o."created_at" >= NOW() - INTERVAL '120 days'
    ORDER BY o."created_at" DESC
  `);

  const currentWindowStart = Date.now() - (30 * 86_400_000);
  const previousWindowStart = Date.now() - (60 * 86_400_000);
  const productStats = new Map<string, {
    productId: string;
    productName: string;
    units: number;
    revenueTzs: number;
    buyers: Set<string>;
  }>();

  let currentWindowRevenue = 0;
  let previousWindowRevenue = 0;
  let currentWindowUnits = 0;
  let previousWindowUnits = 0;

  rows.forEach((row) => {
    const timestamp = row.created_at.getTime();
    const inCurrentWindow = timestamp >= currentWindowStart;
    const inPreviousWindow = timestamp >= previousWindowStart && timestamp < currentWindowStart;
    const lines = Array.isArray(row.items) ? (row.items as OrderLine[]) : [];

    lines.forEach((line) => {
      const stat = productStats.get(line.productId) ?? {
        productId: line.productId,
        productName: line.productName,
        units: 0,
        revenueTzs: 0,
        buyers: new Set<string>(),
      };

      stat.units += line.quantity;
      stat.revenueTzs += line.lineTotal;
      stat.buyers.add(row.buyer_pharmacy_id);
      productStats.set(line.productId, stat);

      if (inCurrentWindow) {
        currentWindowUnits += line.quantity;
        currentWindowRevenue += line.lineTotal;
      }

      if (inPreviousWindow) {
        previousWindowUnits += line.quantity;
        previousWindowRevenue += line.lineTotal;
      }
    });
  });

  const topProducts = Array.from(productStats.values())
    .sort((left, right) => right.units - left.units)
    .slice(0, 5)
    .map((stat) => ({
      productId: stat.productId,
      productName: stat.productName,
      units: stat.units,
      revenueTzs: stat.revenueTzs,
      activeBuyers: stat.buyers.size,
    }));

  return {
    windows: {
      current30d: {
        units: currentWindowUnits,
        revenueTzs: currentWindowRevenue,
      },
      previous30d: {
        units: previousWindowUnits,
        revenueTzs: previousWindowRevenue,
      },
    },
    topProducts,
  };
}

// ─── Pharmacy Link functions ──────────────────────────────────────────────────

export async function requestPharmacyLink(
  retailId: string,
  wholesaleId: string,
  requestedBy: string,
) {
  const existing = await (prisma as any).pharmacyLink.findFirst({
    where: {
      retailId,
      wholesaleId,
      status: { in: ['PENDING', 'ACTIVE'] },
    },
  });

  if (existing) {
    throw Object.assign(new Error('LINK_ALREADY_EXISTS'), {
      status: 409,
      code: 'LINK_ALREADY_EXISTS',
    });
  }

  return (prisma as any).pharmacyLink.create({
    data: { retailId, wholesaleId, requestedBy },
  });
}

export async function respondToPharmacyLink(
  linkId: string,
  wholesaleId: string,
  accept: boolean,
  respondedBy: string,
  rejectionReason?: string,
) {
  const link = await (prisma as any).pharmacyLink.findFirst({
    where: { id: linkId, wholesaleId },
  });

  if (!link) {
    throw Object.assign(new Error('Link not found'), { status: 404 });
  }

  if (link.status !== 'PENDING') {
    throw Object.assign(new Error('LINK_NOT_PENDING'), {
      status: 400,
      code: 'LINK_NOT_PENDING',
    });
  }

  return (prisma as any).pharmacyLink.update({
    where: { id: linkId },
    data: {
      status: accept ? 'ACTIVE' : 'REJECTED',
      respondedBy,
      rejectionReason: accept ? null : (rejectionReason ?? null),
    },
  });
}

export async function dissolvePharmacyLink(
  linkId: string,
  pharmacyId: string,
  dissolvedBy: string,
) {
  const link = await (prisma as any).pharmacyLink.findFirst({
    where: {
      id: linkId,
      status: 'ACTIVE',
      OR: [{ retailId: pharmacyId }, { wholesaleId: pharmacyId }],
    },
  });

  if (!link) {
    throw Object.assign(new Error('Active link not found'), { status: 404 });
  }

  return (prisma as any).pharmacyLink.update({
    where: { id: linkId },
    data: {
      status: 'DISSOLVED',
      dissolvedBy,
      dissolvedAt: new Date(),
    },
  });
}

export async function listPharmacyLinks(
  pharmacyId: string,
  role: 'buyer' | 'seller',
  status?: string,
) {
  const where: Record<string, unknown> = role === 'buyer'
    ? { retailId: pharmacyId }
    : { wholesaleId: pharmacyId };

  if (status) {
    where.status = status;
  }

  return (prisma as any).pharmacyLink.findMany({
    where,
    include: {
      retailPharmacy: { select: { id: true, name: true, pharmacyType: true } },
      wholesalePharmacy: { select: { id: true, name: true, pharmacyType: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPharmacyLink(
  retailId: string,
  wholesaleId: string,
) {
  return (prisma as any).pharmacyLink.findUnique({
    where: { retailId_wholesaleId: { retailId, wholesaleId } },
  });
}

export async function hasActiveLink(
  retailId: string,
  wholesaleId: string,
): Promise<boolean> {
  const link = await (prisma as any).pharmacyLink.findFirst({
    where: { retailId, wholesaleId, status: 'ACTIVE' },
    select: { id: true },
  });

  return link !== null;
}

// ─── Dispute functions ────────────────────────────────────────────────────────

export async function createDispute(input: {
  orderId: string;
  buyerPharmacyId: string;
  sellerPharmacyId: string;
  description: string;
  reportedBy: string;
  lineItems: Array<{
    productId: string;
    productName: string;
    quantityOrdered: number;
    quantityReceived: number;
    quantityDisputed: number;
    unitPrice: number;
    notes?: string;
  }>;
}) {
  return (prisma as any).wholesaleDispute.create({
    data: {
      orderId: input.orderId,
      buyerPharmacyId: input.buyerPharmacyId,
      sellerPharmacyId: input.sellerPharmacyId,
      description: input.description,
      reportedBy: input.reportedBy,
      lineItems: {
        create: input.lineItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.quantityReceived,
          quantityDisputed: item.quantityDisputed,
          unitPrice: item.unitPrice,
          notes: item.notes ?? null,
        })),
      },
    },
    include: { lineItems: true },
  });
}

export async function listDisputes(
  pharmacyId: string,
  role: 'buyer' | 'seller',
) {
  const where = role === 'buyer'
    ? { buyerPharmacyId: pharmacyId }
    : { sellerPharmacyId: pharmacyId };

  return (prisma as any).wholesaleDispute.findMany({
    where,
    include: { lineItems: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function resolveDispute(
  disputeId: string,
  resolution: string,
  resolvedBy: string,
) {
  const dispute = await (prisma as any).wholesaleDispute.findUnique({
    where: { id: disputeId },
    select: { id: true },
  });

  if (!dispute) {
    throw Object.assign(new Error('Dispute not found'), { status: 404 });
  }

  return (prisma as any).wholesaleDispute.update({
    where: { id: disputeId },
    data: {
      status: 'RESOLVED',
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
    },
    include: { lineItems: true },
  });
}
