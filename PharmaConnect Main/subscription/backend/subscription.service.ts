// backend/src/modules/subscriptions/subscription.service.ts
//
// Business logic for subscription lifecycle management.
// Imported by subscription.router.ts — do not expose directly.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient, SubscriptionTier, SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { initiateDeposit, checkDepositStatus, PawapayWebhookPayload } from './pawapay.service';
import {
  sendSubscriptionActivatedEmail,
  sendSubscriptionRenewalFailedEmail,
} from '../email/email.triggers.subscription';

const prisma = new PrismaClient();

// ── Tier pricing (Tsh, monthly) ───────────────────────────────────────────────

export const TIER_PRICES: Record<SubscriptionTier, number> = {
  ADDO:       20_000,
  BASIC:      39_000,
  STANDARD:   55_000,
  PREMIUM:    75_000,
  WHOLESALE: 100_000,
  ENTERPRISE:      0,   // billed manually — contact sales
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  ADDO:       'ADDO',
  BASIC:      'Basic',
  STANDARD:   'Standard',
  PREMIUM:    'Premium',
  WHOLESALE:  'Wholesale',
  ENTERPRISE: 'Enterprise',
};

/** Grace period after a failed renewal: 7 days */
export const GRACE_PERIOD_DAYS = 7;

/** Free trial length in days */
export const TRIAL_DAYS = 14;

// ── Helpers ───────────────────────────────────────────────────────────────────

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Initiating a subscription payment ────────────────────────────────────────

export async function initiateSubscriptionPayment(opts: {
  pharmacyId:     string;
  tier:           SubscriptionTier;
  buyerPhone:     string;
  buyerName:      string;
  buyerEmail?:    string;
  billingMonths?: number;   // default 1
}): Promise<{
  paymentId:         string;
  paymentGatewayUrl?: string;
  amountTzs:         number;
}> {
  const { pharmacyId, tier, buyerPhone, buyerName, buyerEmail, billingMonths = 1 } = opts;

  if (tier === 'ENTERPRISE') {
    throw new Error('Enterprise plans are set up manually. Contact support@apotekh.co.tz');
  }

  const baseAmount  = TIER_PRICES[tier];
  const amountTzs   = baseAmount * billingMonths;
  const periodStart = new Date();
  const periodEnd   = addMonths(periodStart, billingMonths);

  // Create the Subscription record in PENDING state
  const subscription = await prisma.subscription.create({
    data: {
      pharmacyId,
      tier,
      status:            'ACTIVE',    // will revert to expired if payment never lands
      amountTzs,
      billingCycleMonths: billingMonths,
      periodStart,
      periodEnd,
    },
  });

  // Create the SubscriptionPayment record
  const payment = await prisma.subscriptionPayment.create({
    data: {
      subscriptionId: subscription.id,
      pharmacyId,
      amountTzs,
      status:         'PENDING',
      phoneNumber:    buyerPhone,
    },
  });

  // Initiate PawaPay deposit — customer receives USSD prompt on their phone
  const deposit = await initiateDeposit({
    paymentId:   payment.id,   // our UUID becomes PawaPay's depositId
    amountTzs,
    phone:       buyerPhone,
    description: `APOTEKH ${TIER_LABELS[tier]}`,
  });

  if (deposit.status === 'REJECTED') {
    // Clean up the pending records so the user can try again
    await prisma.subscriptionPayment.delete({ where: { id: payment.id } });
    await prisma.subscription.delete({ where: { id: subscription.id } });
    throw new Error(`Payment rejected by network: ${deposit.rejectionReason ?? 'unknown reason'}`);
  }

  // Persist the PawaPay depositId (same as payment.id — stored for clarity)
  await prisma.subscriptionPayment.update({
    where: { id: payment.id },
    data:  { selcomOrderId: deposit.depositId },   // reusing selcomOrderId column
  });

  return {
    paymentId: payment.id,
    amountTzs,
  };
}

// ── Webhook handler (PawaPay callback) ───────────────────────────────────────

export async function handlePawapayWebhook(payload: PawapayWebhookPayload): Promise<void> {
  const { depositId, status, correspondent, payer } = payload;

  // PawaPay depositId === our payment.id
  const payment = await prisma.subscriptionPayment.findUnique({
    where:   { id: depositId },
    include: { subscription: true },
  });

  if (!payment) {
    console.warn(`[subscription] PawaPay webhook for unknown depositId: ${depositId}`);
    return;
  }

  // Ignore duplicate callbacks for already-finalised payments
  if (payment.status === 'PAID' || payment.status === 'FAILED') {
    console.info(`[subscription] Ignoring duplicate webhook for payment ${depositId} (already ${payment.status})`);
    return;
  }

  if (status === 'COMPLETED') {
    // ── Payment succeeded ──────────────────────────────────────────────────

    await prisma.$transaction(async (tx) => {
      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status:        'PAID',
          paymentMethod: correspondent,                     // e.g. "VODACOM_TZA"
          phoneNumber:   payer.address.value ?? payment.phoneNumber,
          paidAt:        new Date(),
        },
      });

      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data:  { status: 'ACTIVE' },
      });

      await tx.pharmacy.update({
        where: { id: payment.pharmacyId },
        data: {
          subscriptionTier:   payment.subscription.tier,
          subscriptionStatus: 'ACTIVE',
          currentPeriodStart: payment.subscription.periodStart,
          currentPeriodEnd:   payment.subscription.periodEnd,
          gracePeriodEndsAt:  null,
        },
      });
    });

    // Confirmation email (fire-and-forget)
    const owner   = await prisma.user.findFirst({ where: { pharmacyId: payment.pharmacyId, role: 'OWNER' } });
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: payment.pharmacyId } });
    if (owner && pharmacy) {
      const cycle = payment.subscription.billingCycleMonths;
      sendSubscriptionActivatedEmail({
        to:              owner.email,
        name:            owner.name,
        pharmacyName:    pharmacy.name,
        planName:        `${TIER_LABELS[payment.subscription.tier]} ${cycle === 1 ? 'Monthly' : cycle === 3 ? 'Quarterly' : 'Annual'}`,
        nextBillingDate: formatDate(payment.subscription.periodEnd),
      }).catch(console.error);
    }

  } else {
    // ── Payment failed ─────────────────────────────────────────────────────

    await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status:        'FAILED',
        failureReason: payload.failureReason?.failureCode ?? 'FAILED',
      },
    });

    const owner   = await prisma.user.findFirst({ where: { pharmacyId: payment.pharmacyId, role: 'OWNER' } });
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: payment.pharmacyId } });
    if (owner && pharmacy) {
      sendSubscriptionRenewalFailedEmail({
        to:           owner.email,
        name:         owner.name,
        pharmacyName: pharmacy.name,
        amount:       `Tsh ${payment.amountTzs.toLocaleString()}`,
      }).catch(console.error);
    }
  }
}

// ── Fetch current subscription state for the authenticated pharmacy ───────────

export async function getSubscriptionSummary(pharmacyId: string): Promise<{
  tier:               SubscriptionTier;
  status:             SubscriptionStatus;
  trialEndsAt:        Date | null;
  currentPeriodEnd:   Date | null;
  gracePeriodEndsAt:  Date | null;
  daysRemaining:      number | null;
  amountTzs:          number;
  latestPayments:     {
    id: string; amountTzs: number; status: PaymentStatus;
    paidAt: Date | null; paymentMethod: string | null;
  }[];
}> {
  const pharmacy = await prisma.pharmacy.findUniqueOrThrow({
    where: { id: pharmacyId },
    select: {
      subscriptionTier:   true,
      subscriptionStatus: true,
      trialEndsAt:        true,
      currentPeriodEnd:   true,
      gracePeriodEndsAt:  true,
    },
  });

  const now = new Date();
  let daysRemaining: number | null = null;

  if (pharmacy.subscriptionStatus === 'TRIALING' && pharmacy.trialEndsAt) {
    daysRemaining = Math.max(0, Math.ceil((pharmacy.trialEndsAt.getTime() - now.getTime()) / 86_400_000));
  } else if (pharmacy.subscriptionStatus === 'ACTIVE' && pharmacy.currentPeriodEnd) {
    daysRemaining = Math.max(0, Math.ceil((pharmacy.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000));
  }

  const latestPayments = await prisma.subscriptionPayment.findMany({
    where:   { pharmacyId },
    orderBy: { createdAt: 'desc' },
    take:    5,
    select:  { id: true, amountTzs: true, status: true, paidAt: true, paymentMethod: true },
  });

  return {
    tier:              pharmacy.subscriptionTier,
    status:            pharmacy.subscriptionStatus,
    trialEndsAt:       pharmacy.trialEndsAt,
    currentPeriodEnd:  pharmacy.currentPeriodEnd,
    gracePeriodEndsAt: pharmacy.gracePeriodEndsAt,
    daysRemaining,
    amountTzs:         TIER_PRICES[pharmacy.subscriptionTier],
    latestPayments,
  };
}

// ── Trial enforcement helper (call from middleware) ───────────────────────────

/**
 * Returns true if the pharmacy is allowed to access the platform.
 * Call this from your trial enforcement middleware on every authenticated request.
 *
 * Access is allowed when:
 *   - status is TRIALING and trial has not yet expired
 *   - status is ACTIVE
 *   - status is GRACE (read-only access — middleware should flag this)
 */
export async function checkSubscriptionAccess(pharmacyId: string): Promise<{
  allowed:    boolean;
  readOnly:   boolean;
  status:     SubscriptionStatus;
  daysLeft:   number;
}> {
  const pharmacy = await prisma.pharmacy.findUniqueOrThrow({
    where: { id: pharmacyId },
    select: {
      subscriptionStatus: true,
      trialEndsAt:        true,
      currentPeriodEnd:   true,
      gracePeriodEndsAt:  true,
    },
  });

  const now = new Date();

  switch (pharmacy.subscriptionStatus) {
    case 'TRIALING': {
      const ends = pharmacy.trialEndsAt ?? addDays(now, 0);
      const daysLeft = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / 86_400_000));
      if (ends < now) {
        // Trial expired — move pharmacy to EXPIRED
        await prisma.pharmacy.update({
          where: { id: pharmacyId },
          data: {
            subscriptionStatus: 'EXPIRED',
            gracePeriodEndsAt:  addDays(now, GRACE_PERIOD_DAYS),
          },
        });
        return { allowed: false, readOnly: false, status: 'EXPIRED', daysLeft: 0 };
      }
      return { allowed: true, readOnly: false, status: 'TRIALING', daysLeft };
    }

    case 'ACTIVE': {
      const ends = pharmacy.currentPeriodEnd ?? addDays(now, 30);
      const daysLeft = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / 86_400_000));
      if (ends < now) {
        // Subscription lapsed — enter grace period
        await prisma.pharmacy.update({
          where: { id: pharmacyId },
          data: {
            subscriptionStatus: 'GRACE',
            gracePeriodEndsAt:  addDays(now, GRACE_PERIOD_DAYS),
          },
        });
        return { allowed: true, readOnly: true, status: 'GRACE', daysLeft: GRACE_PERIOD_DAYS };
      }
      return { allowed: true, readOnly: false, status: 'ACTIVE', daysLeft };
    }

    case 'GRACE': {
      const ends = pharmacy.gracePeriodEndsAt ?? addDays(now, 0);
      const daysLeft = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / 86_400_000));
      if (ends < now) {
        await prisma.pharmacy.update({
          where: { id: pharmacyId },
          data: { subscriptionStatus: 'EXPIRED' },
        });
        return { allowed: false, readOnly: false, status: 'EXPIRED', daysLeft: 0 };
      }
      return { allowed: true, readOnly: true, status: 'GRACE', daysLeft };
    }

    case 'EXPIRED':
    case 'CANCELLED':
    default:
      return { allowed: false, readOnly: false, status: pharmacy.subscriptionStatus, daysLeft: 0 };
  }
}

// ── Admin: manually activate a plan (for Enterprise / Selcom fallback) ────────

export async function adminActivatePlan(opts: {
  pharmacyId:    string;
  tier:          SubscriptionTier;
  billingMonths: number;
  note?:         string;
}): Promise<void> {
  const { pharmacyId, tier, billingMonths } = opts;
  const now         = new Date();
  const periodEnd   = addMonths(now, billingMonths);

  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        pharmacyId,
        tier,
        status:             'ACTIVE',
        amountTzs:          TIER_PRICES[tier],
        billingCycleMonths: billingMonths,
        periodStart:        now,
        periodEnd,
      },
    });

    await tx.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        pharmacyId,
        amountTzs:      TIER_PRICES[tier],
        status:         'PAID',
        paymentMethod:  'MANUAL',
        paidAt:         now,
      },
    });

    await tx.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        subscriptionTier:   tier,
        subscriptionStatus: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd:   periodEnd,
        gracePeriodEndsAt:  null,
      },
    });
  });
}
