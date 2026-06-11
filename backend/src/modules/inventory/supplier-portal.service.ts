/**
 * Supplier Portal Service
 *
 * Handles tokenized order-confirmation pages for wholesalers who are NOT on APOTEKH.
 * When a retail pharmacy submits a stock order and provides a supplier phone number,
 * we generate a unique token and send the supplier a WhatsApp link they can open in
 * any browser -- no account required.
 *
 * NOTE: prisma.supplierPortalToken / prisma.supplierPortalLineItem are cast to (prisma as any)
 * until the user runs `npx prisma generate` to regenerate the Prisma client with the new models.
 */

import { prisma } from '../../lib/prisma';

// Shorthand -- remove after running prisma generate
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// -- Types -------------------------------------------------------------------

export type CreatePortalTokenInput = {
  stockOrderId: string;
  pharmacyId: string;
  pharmacyName: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
};

export type ConfirmLineItem = {
  lineItemId: string;
  quantityConfirmed: number;
  unitPrice: number;
  available: boolean;
  notes?: string;
};

export type ConfirmOrderInput = {
  supplierNotes?: string;
  deliveryDate?: string;
  lineItems: ConfirmLineItem[];
};

type PortalLineItem = {
  id: string;
  stockOrderItemId: string;
};

// -- Token generation --------------------------------------------------------

export async function generatePortalToken(input: CreatePortalTokenInput) {
  const order = await prisma.stockOrder.findFirst({
    where: { id: input.stockOrderId, pharmacyId: input.pharmacyId },
    include: { items: true },
  });
  if (!order) throw Object.assign(new Error('Stock order not found'), { status: 404 });

  // Idempotent -- if a token already exists for this order, return it
  const existing = await db.supplierPortalToken.findUnique({
    where: { stockOrderId: input.stockOrderId },
    include: { lineItems: true },
  });
  if (existing) return existing;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const token = await db.supplierPortalToken.create({
    data: {
      stockOrderId: input.stockOrderId,
      pharmacyId: input.pharmacyId,
      pharmacyName: input.pharmacyName,
      supplierName: input.supplierName,
      supplierPhone: input.supplierPhone,
      supplierEmail: input.supplierEmail,
      expiresAt,
      lineItems: {
        create: order.items.map((item) => ({
          stockOrderItemId: item.id,
          productName: item.productName,
          genericName: item.genericName,
          strength: item.strength,
          dosageForm: item.dosageForm,
          quantityRequested: item.quantityOrdered,
        })),
      },
    },
    include: { lineItems: true },
  });

  return token;
}

// -- Portal data (public -- no auth) -----------------------------------------

export async function getPortalByToken(token: string) {
  const record = await db.supplierPortalToken.findUnique({
    where: { token },
    include: { lineItems: true },
  });
  if (!record) throw Object.assign(new Error('Order link not found'), { status: 404 });

  if (record.status === 'EXPIRED' || record.expiresAt < new Date()) {
    await db.supplierPortalToken.update({
      where: { id: record.id },
      data: { status: 'EXPIRED' },
    });
    throw Object.assign(new Error('This order link has expired'), { status: 410 });
  }

  if (record.status === 'PENDING') {
    await db.supplierPortalToken.update({
      where: { id: record.id },
      data: { status: 'VIEWED', viewedAt: new Date() },
    });
    record.status = 'VIEWED';
    record.viewedAt = new Date();
  }

  return record;
}

// -- Confirm order ------------------------------------------------------------

export async function confirmOrder(token: string, input: ConfirmOrderInput) {
  const record = await db.supplierPortalToken.findUnique({
    where: { token },
    include: { lineItems: true },
  });
  if (!record) throw Object.assign(new Error('Order link not found'), { status: 404 });
  if (record.expiresAt < new Date()) throw Object.assign(new Error('Order link expired'), { status: 410 });
  if (record.status === 'CONFIRMED' || record.status === 'REJECTED') {
    throw Object.assign(new Error('Order already responded to'), { status: 409 });
  }

  const confirmedCount = input.lineItems.filter((l) => l.available && l.quantityConfirmed > 0).length;
  const totalCount = (record.lineItems as PortalLineItem[]).length;
  const newStatus = confirmedCount === 0
    ? 'REJECTED'
    : confirmedCount < totalCount
      ? 'PARTIALLY_CONFIRMED'
      : 'CONFIRMED';

  await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txdb = tx as any;

    for (const line of input.lineItems) {
      await txdb.supplierPortalLineItem.update({
        where: { id: line.lineItemId },
        data: {
          quantityConfirmed: line.available ? line.quantityConfirmed : 0,
          unitPrice: line.available && line.unitPrice ? line.unitPrice : null,
          available: line.available,
          notes: line.notes ?? null,
        },
      });

      if (line.available && line.unitPrice) {
        const portalLine = (record.lineItems as PortalLineItem[]).find((l: PortalLineItem) => l.id === line.lineItemId);
        if (portalLine) {
          await tx.stockOrderItem.update({
            where: { id: portalLine.stockOrderItemId },
            data: { expectedUnitCost: line.unitPrice },
          });
        }
      }
    }

    await txdb.supplierPortalToken.update({
      where: { id: record.id },
      data: {
        status: newStatus,
        supplierNotes: input.supplierNotes ?? null,
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
        respondedAt: new Date(),
      },
    });

    const statusLabel =
      newStatus === 'CONFIRMED' ? 'confirmed'
      : newStatus === 'PARTIALLY_CONFIRMED' ? 'partially confirmed'
      : 'rejected';

    await tx.notification.create({
      data: {
        pharmacyId: record.pharmacyId,
        type: 'SUPPLIER_PORTAL_RESPONSE',
        title: `${record.supplierName} ${statusLabel} your order`,
        body: input.supplierNotes
          ? `${record.supplierName} ${statusLabel} the order. Note: "${input.supplierNotes}"`
          : `${record.supplierName} ${statusLabel} your purchase order.`,
        metadata: {
          stockOrderId: record.stockOrderId,
          supplierPortalTokenId: record.id,
          status: newStatus,
          deliveryDate: input.deliveryDate ?? null,
        },
      },
    });
  });

  return { status: newStatus };
}

// -- Reject order -------------------------------------------------------------

export async function rejectOrder(token: string, reason?: string) {
  const record = await db.supplierPortalToken.findUnique({ where: { token } });
  if (!record) throw Object.assign(new Error('Order link not found'), { status: 404 });
  if (record.expiresAt < new Date()) throw Object.assign(new Error('Order link expired'), { status: 410 });
  if (record.status === 'CONFIRMED' || record.status === 'REJECTED') {
    throw Object.assign(new Error('Order already responded to'), { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txdb = tx as any;

    await txdb.supplierPortalToken.update({
      where: { id: record.id },
      data: { status: 'REJECTED', supplierNotes: reason ?? null, respondedAt: new Date() },
    });

    await tx.notification.create({
      data: {
        pharmacyId: record.pharmacyId,
        type: 'SUPPLIER_PORTAL_RESPONSE',
        title: `${record.supplierName} rejected your order`,
        body: reason
          ? `${record.supplierName} rejected your purchase order. Reason: "${reason}"`
          : `${record.supplierName} rejected your purchase order.`,
        metadata: {
          stockOrderId: record.stockOrderId,
          supplierPortalTokenId: record.id,
          status: 'REJECTED',
        },
      },
    });
  });

  return { status: 'REJECTED' };
}

// -- WhatsApp link builder ----------------------------------------------------

export function buildWhatsAppLink(
  token: string,
  orderNumber: string,
  pharmacyName: string,
  supplierPhone?: string,
): { text: string; link: string } {
  const baseUrl = process.env.BACKEND_URL ?? process.env.RAILWAY_STATIC_URL ?? 'https://api.apotekh.co.tz';
  const portalUrl = `${baseUrl}/supplier-portal/${token}`;

  const text =
    `*APOTEKH Purchase Order -- ${orderNumber}*\n` +
    `From: ${pharmacyName}\n\n` +
    `Please review and confirm this order:\n${portalUrl}\n\n` +
    `The link is valid for 14 days. No account needed -- just open the link.`;

  const encoded = encodeURIComponent(text);
  const phone = supplierPhone?.replace(/\D/g, '');
  const link = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

  return { text, link };
}
