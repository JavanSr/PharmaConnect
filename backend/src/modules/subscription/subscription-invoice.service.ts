import { prisma } from '../../lib/prisma';

// ── Subscription Invoice Service ──────────────────────────────────────────────
// Generates subscription invoices when a pharmacy's subscription payment is confirmed.

function generateInvoiceNumber(pharmacyId: string): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  // 6-char uppercase hex derived from pharmacyId + current timestamp
  const raw = `${pharmacyId}${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) >>> 0;
  }
  const hex = hash.toString(16).toUpperCase().padStart(6, '0').slice(-6);
  return `INV-${yyyymm}-${hex}`;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));
}

function addOneYear(date: Date): Date {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

export async function generateSubscriptionInvoice(input: {
  pharmacyId: string;
  paymentRequestId?: string;
  tier: string;
  billingCycle: string;
  amount: number;
}): Promise<{ id: string; invoiceNumber: string }> {
  const now = new Date();

  let periodFrom: Date;
  let periodTo: Date;

  if (input.billingCycle === 'ANNUAL') {
    periodFrom = now;
    periodTo = addOneYear(now);
  } else {
    // MONTHLY — current calendar month
    periodFrom = startOfMonth(now);
    periodTo = endOfMonth(now);
  }

  const invoiceNumber = generateInvoiceNumber(input.pharmacyId);

  const invoice = await (prisma as any).subscriptionInvoice.create({
    data: {
      pharmacyId: input.pharmacyId,
      paymentRequestId: input.paymentRequestId ?? null,
      invoiceNumber,
      periodFrom,
      periodTo,
      tier: input.tier,
      billingCycle: input.billingCycle,
      subtotal: input.amount,
      status: 'ISSUED',
      issuedAt: now,
    },
    select: {
      id: true,
      invoiceNumber: true,
    },
  });

  return { id: invoice.id, invoiceNumber: invoice.invoiceNumber };
}

export async function getSubscriptionInvoice(invoiceId: string, pharmacyId: string) {
  const invoice = await (prisma as any).subscriptionInvoice.findFirst({
    where: {
      id: invoiceId,
      pharmacyId,
    },
  });

  if (!invoice) {
    throw Object.assign(new Error('Invoice not found'), { status: 404 });
  }

  return invoice;
}

export async function listSubscriptionInvoices(pharmacyId: string) {
  const invoices = await (prisma as any).subscriptionInvoice.findMany({
    where: { pharmacyId },
    orderBy: { createdAt: 'desc' },
  });

  return invoices;
}
