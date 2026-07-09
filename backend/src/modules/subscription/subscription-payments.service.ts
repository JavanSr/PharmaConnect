import crypto from 'crypto';
import { BillingCycle, Prisma, SubscriptionTier } from '@prisma/client';

export const SELF_SERVICE_TIERS = [
  'ADDO',
  'ESSENTIAL',
  'ADDO_PLUS',
  'STANDARD',
  'PREMIUM',
  'WHOLESALE',
] as const satisfies readonly SubscriptionTier[];

export type SelfServiceTier = (typeof SELF_SERVICE_TIERS)[number];

// Discount ladder: MONTHLY = base · QUARTERLY = 3× (no discount, commitment-lite)
// SEMI_ANNUAL = 5.5× ("half a month free", ~8%) · ANNUAL = 10× ("2 months free", ~17%)
// Annual must always stay the best rate — don't flatten the gradient.
export const SUBSCRIPTION_PRICE_TABLE: Record<SelfServiceTier, Record<BillingCycle, number>> = {
  ADDO: { MONTHLY: 15_000, QUARTERLY: 45_000, SEMI_ANNUAL: 82_500, ANNUAL: 150_000 },
  ESSENTIAL: { MONTHLY: 39_000, QUARTERLY: 117_000, SEMI_ANNUAL: 214_500, ANNUAL: 390_000 },
  ADDO_PLUS: { MONTHLY: 45_000, QUARTERLY: 135_000, SEMI_ANNUAL: 247_500, ANNUAL: 450_000 },
  STANDARD: { MONTHLY: 55_000, QUARTERLY: 165_000, SEMI_ANNUAL: 302_500, ANNUAL: 550_000 },
  PREMIUM: { MONTHLY: 75_000, QUARTERLY: 225_000, SEMI_ANNUAL: 412_500, ANNUAL: 750_000 },
  WHOLESALE: { MONTHLY: 100_000, QUARTERLY: 300_000, SEMI_ANNUAL: 550_000, ANNUAL: 1_000_000 },
};

export function isSelfServiceTier(tier: string): tier is SelfServiceTier {
  return SELF_SERVICE_TIERS.some((candidate) => candidate === tier);
}

export function getSubscriptionPrice(tier: SelfServiceTier, billingCycle: BillingCycle): number {
  return SUBSCRIPTION_PRICE_TABLE[tier][billingCycle];
}

const CYCLE_DAYS: Record<BillingCycle, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  SEMI_ANNUAL: 182,
  ANNUAL: 365,
};

export function defaultPaidUntil(billingCycle: BillingCycle): Date {
  const paidUntil = new Date();
  paidUntil.setDate(paidUntil.getDate() + (CYCLE_DAYS[billingCycle] ?? 30));
  return paidUntil;
}

export function generateSubscriptionReference(): string {
  return `APTK-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function subscriptionProviderName(): string {
  return (process.env.SUBSCRIPTION_PAYMENT_PROVIDER || 'mobile_money').trim() || 'mobile_money';
}

export function isSubscriptionWebhookConfigured(): boolean {
  return Boolean((process.env.SUBSCRIPTION_PAYMENT_WEBHOOK_SECRET || '').trim());
}

export function buildSubscriptionCheckoutUrl(input: {
  reference: string;
  amount: number;
  tier: string;
  billingCycle: string;
  payerPhone?: string | null;
}): string | null {
  const template = (process.env.SUBSCRIPTION_PAYMENT_LINK_TEMPLATE || '').trim();
  if (!template) {
    return null;
  }

  const values: Record<string, string> = {
    reference: input.reference,
    amount: String(input.amount),
    tier: input.tier,
    billingCycle: input.billingCycle,
    payerPhone: input.payerPhone || '',
  };

  return template.replace(/\{(reference|amount|tier|billingCycle|payerPhone)\}/g, (_match, key: string) =>
    encodeURIComponent(values[key] ?? ''),
  );
}

export async function activateSubscriptionFromPayment(
  tx: Prisma.TransactionClient,
  input: {
    requestId: string;
    paidUntil?: Date;
    providerReference?: string | null;
    reviewNote?: string | null;
  },
) {
  const existing = await tx.subscriptionPaymentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      pharmacyId: true,
      status: true,
      requestedTier: true,
      billingCycle: true,
    },
  });

  if (!existing) {
    throw Object.assign(new Error('Payment request not found'), { status: 404 });
  }

  const paidUntil = input.paidUntil ?? defaultPaidUntil(existing.billingCycle);

  if (existing.status === 'CONFIRMED') {
    return tx.subscriptionPaymentRequest.findUniqueOrThrow({
      where: { id: existing.id },
    });
  }

  if (existing.status !== 'PENDING') {
    throw Object.assign(new Error('Payment request already reviewed'), { status: 409 });
  }

  // Conditional update: only flips PENDING → CONFIRMED. If a concurrent callback
  // or admin review won the race between our read and this write, count is 0 and
  // we must not double-confirm or double-extend.
  const updated = await tx.subscriptionPaymentRequest.updateMany({
    where: { id: existing.id, status: 'PENDING' },
    data: {
      status: 'CONFIRMED',
      reviewedBy: null,
      reviewedAt: new Date(),
      reviewNote: input.reviewNote || 'Confirmed automatically by payment provider.',
      providerReference: input.providerReference || undefined,
      paidUntil,
    },
  });

  if (updated.count === 0) {
    const current = await tx.subscriptionPaymentRequest.findUniqueOrThrow({
      where: { id: existing.id },
    });
    if (current.status === 'CONFIRMED') {
      return current;
    }
    throw Object.assign(new Error('Payment request already reviewed'), { status: 409 });
  }

  const request = await tx.subscriptionPaymentRequest.findUniqueOrThrow({
    where: { id: existing.id },
  });

  await tx.pharmacy.update({
    where: { id: existing.pharmacyId },
    data: {
      subscriptionTier: existing.requestedTier,
      billingCycle: existing.billingCycle,
      status: 'ACTIVE',
      trialActive: false,
      isActive: true,
      trialEndsAt: paidUntil,
      subscriptionUpdatedAt: new Date(),
      // Clear grace state when a payment is confirmed — pharmacy is fully active again.
      graceActivatedAt: null,
    },
  });

  return request;
}
