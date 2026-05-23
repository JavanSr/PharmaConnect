import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { sendWelcomeEmail } from '../../lib/email';
import { activateSubscriptionFromPayment, defaultPaidUntil } from '../subscription/subscription-payments.service';

export const founderRouter = Router();
founderRouter.use(authenticate);
founderRouter.use(requireRole('SUPER_ADMIN'));

const subscriptionPaymentSelect = {
  id: true,
  pharmacyId: true,
  requestedTier: true,
  billingCycle: true,
  amount: true,
  paymentMethod: true,
  transactionRef: true,
  provider: true,
  providerReference: true,
  checkoutUrl: true,
  payerPhone: true,
  note: true,
  status: true,
  reviewedAt: true,
  reviewNote: true,
  paidUntil: true,
  createdAt: true,
  pharmacy: {
    select: {
      name: true,
      region: true,
      subscriptionTier: true,
      status: true,
      trialActive: true,
      trialEndsAt: true,
    },
  },
  requester: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
} as const;

founderRouter.get('/registrations', async (_req: AuthRequest, res, next) => {
  try {
    const pharmacies = await prisma.pharmacy.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        region: true,
        pharmacyType: true,
        subscriptionTier: true,
        status: true,
        trialActive: true,
        trialStartsAt: true,
        trialEndsAt: true,
        isActive: true,
        createdAt: true,
        memberships: {
          where: { role: 'OWNER', active: true },
          take: 1,
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                emailVerifiedAt: true,
              },
            },
          },
        },
      },
    });

    const rows = pharmacies.map(p => {
      const ownerUser = p.memberships[0]?.user ?? null;
      return {
        id: p.id,
        name: p.name,
        region: p.region,
        pharmacyType: p.pharmacyType,
        tier: p.subscriptionTier,
        status: p.status,
        trialActive: p.trialActive,
        trialStartsAt: p.trialStartsAt,
        trialEndsAt: p.trialEndsAt,
        isActive: p.isActive,
        createdAt: p.createdAt,
        owner: ownerUser
          ? {
              name: `${ownerUser.firstName} ${ownerUser.lastName}`,
              email: ownerUser.email,
              emailVerified: Boolean(ownerUser.emailVerifiedAt),
            }
          : null,
      };
    });

    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

founderRouter.get('/subscription-payments', async (req: AuthRequest, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED']).optional(),
    }).parse(req.query);

    const requests = await prisma.subscriptionPaymentRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: subscriptionPaymentSelect,
    });

    res.json({ data: requests });
  } catch (error) {
    next(error);
  }
});

founderRouter.patch('/subscription-payments/:id/review', async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      status: z.enum(['CONFIRMED', 'REJECTED']),
      paidUntil: z.coerce.date().optional(),
      reviewNote: z.string().trim().max(500).optional().or(z.literal('')),
    }).parse(req.body);

    const existing = await prisma.subscriptionPaymentRequest.findUnique({
      where: { id: req.params.id },
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
    if (existing.status !== 'PENDING') {
      throw Object.assign(new Error('Payment request already reviewed'), { status: 409 });
    }

    const paidUntil = data.status === 'CONFIRMED'
      ? data.paidUntil ?? defaultPaidUntil(existing.billingCycle)
      : null;

    const updated = await prisma.$transaction(async (tx) => {
      if (data.status === 'CONFIRMED') {
        await activateSubscriptionFromPayment(tx, {
          requestId: existing.id,
          paidUntil: paidUntil ?? undefined,
          reviewNote: data.reviewNote || 'Confirmed by founder.',
        });
        await tx.subscriptionPaymentRequest.update({
          where: { id: existing.id },
          data: { reviewedBy: req.user!.userId },
        });
      } else {
        await tx.subscriptionPaymentRequest.update({
          where: { id: existing.id },
          data: {
            status: data.status,
            reviewedBy: req.user!.userId,
            reviewedAt: new Date(),
            reviewNote: data.reviewNote || null,
            paidUntil,
          },
        });
      }

      return tx.subscriptionPaymentRequest.findUniqueOrThrow({
        where: { id: existing.id },
        select: subscriptionPaymentSelect,
      });
    });

    console.info('[founder.subscription-payment-review]', {
      requestId: existing.id,
      pharmacyId: existing.pharmacyId,
      status: data.status,
      paidUntil,
      by: req.user?.email,
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

founderRouter.patch('/registrations/:pharmacyId/trial', async (req: AuthRequest, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const { extensionDays } = z.object({
      extensionDays: z.coerce.number().int().min(1).max(365),
    }).parse(req.body);

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, trialEndsAt: true },
    });

    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { status: 404 });
    }

    const base = pharmacy.trialEndsAt > new Date() ? pharmacy.trialEndsAt : new Date();
    const trialEndsAt = new Date(base);
    trialEndsAt.setDate(trialEndsAt.getDate() + extensionDays);

    const updated = await prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        status: 'TRIAL',
        trialActive: true,
        trialEndsAt,
        isActive: true,
        subscriptionUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        status: true,
        trialActive: true,
        trialStartsAt: true,
        trialEndsAt: true,
        isActive: true,
        subscriptionTier: true,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

founderRouter.patch('/registrations/:pharmacyId/suspend', async (req: AuthRequest, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const { reason } = z.object({
      reason: z.string().trim().max(500).optional(),
    }).parse(req.body);

    const updated = await prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        status: 'SUSPENDED',
        trialActive: false,
        isActive: false,
        subscriptionUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        status: true,
        trialActive: true,
        trialStartsAt: true,
        trialEndsAt: true,
        isActive: true,
        subscriptionTier: true,
      },
    });

    console.info('[founder.suspend-pharmacy]', {
      pharmacyId,
      founder: req.user?.email,
      reason: reason || null,
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

founderRouter.post('/registrations/:pharmacyId/verify-owner', async (req: AuthRequest, res, next) => {
  try {
    const { pharmacyId } = req.params;

    const membership = await prisma.pharmacyMembership.findFirst({
      where: {
        pharmacyId,
        role: 'OWNER',
        active: true,
      },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            emailVerifiedAt: true,
          },
        },
        pharmacy: {
          select: {
            id: true,
            name: true,
            region: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (!membership) {
      throw Object.assign(new Error('Owner account not found for this pharmacy'), { status: 404 });
    }

    const verifiedAt = membership.user.emailVerifiedAt ?? new Date();
    const user = await prisma.user.update({
      where: { id: membership.user.id },
      data: {
        emailVerifiedAt: verifiedAt,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerifiedAt: true,
      },
    });

    if (!membership.user.emailVerifiedAt) {
      sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        pharmacyName: membership.pharmacy.name,
        region: membership.pharmacy.region,
        tier: membership.pharmacy.subscriptionTier,
      }).catch(err => console.error('[founder.verify-owner] welcome email failed:', err));
    }

    res.json({
      data: {
        pharmacy: membership.pharmacy,
        owner: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          emailVerified: Boolean(user.emailVerifiedAt),
          emailVerifiedAt: user.emailVerifiedAt,
        },
        verifiedBy: req.user?.email ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

founderRouter.patch('/registrations/:pharmacyId/set-tier', async (req: AuthRequest, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const { tier, paidUntil, billingCycle } = z.object({
      tier: z.enum(['ADDO', 'ESSENTIAL', 'ADDO_PLUS', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE']),
      paidUntil: z.coerce.date().optional(),
      billingCycle: z.enum(['MONTHLY', 'ANNUAL']).optional(),
    }).parse(req.body);

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, name: true, subscriptionTier: true },
    });

    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { status: 404 });
    }

    const updated = await prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        subscriptionTier: tier,
        status: 'ACTIVE',
        trialActive: false,
        isActive: true,
        ...(billingCycle && { billingCycle }),
        ...(paidUntil && { trialEndsAt: paidUntil }),
        subscriptionUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        status: true,
        billingCycle: true,
        trialEndsAt: true,
        isActive: true,
      },
    });

    console.info('[founder.set-tier]', {
      pharmacyId,
      oldTier: pharmacy.subscriptionTier,
      newTier: tier,
      paidUntil: paidUntil ?? null,
      by: req.user?.email,
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

founderRouter.get('/pharmacies/search', async (req: AuthRequest, res, next) => {
  try {
    const { q } = z.object({ q: z.string().min(2).max(100) }).parse(req.query);

    const pharmacies = await prisma.pharmacy.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 20,
      select: {
        id: true,
        name: true,
        region: true,
        pharmacyType: true,
        subscriptionTier: true,
      },
    });

    res.json({ data: pharmacies });
  } catch (error) {
    next(error);
  }
});

founderRouter.get('/stats', async (_req: AuthRequest, res, next) => {
  try {
    const [
      totalPharmacies,
      activePharmacies,
      totalUsers,
      tierBreakdown,
      statusBreakdown,
      recentPharmacies,
      recentOverrides,
      totalDispensings,
      totalBatches,
    ] = await Promise.all([
      prisma.pharmacy.count(),
      prisma.pharmacy.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.pharmacy.groupBy({ by: ['subscriptionTier'], _count: { id: true } }),
      prisma.pharmacy.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.pharmacy.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, region: true, subscriptionTier: true, status: true, createdAt: true },
      }),
      prisma.overrideLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          pharmacyId: true,
          alertType: true,
          reason: true,
          createdAt: true,
          pharmacy: { select: { name: true } },
        },
      }),
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM dispensing_events`,
      prisma.batch.count(),
    ]);
    const dispensingCount = Number(totalDispensings[0]?.count ?? 0);

    res.json({
      data: {
        pharmacies: { total: totalPharmacies, active: activePharmacies },
        users: { total: totalUsers },
        tierBreakdown: Object.fromEntries(tierBreakdown.map(r => [r.subscriptionTier, r._count.id])),
        statusBreakdown: Object.fromEntries(statusBreakdown.map(r => [r.status, r._count.id])),
        recentPharmacies,
        recentOverrides,
        activity: { totalDispensings: dispensingCount, totalBatches },
      },
    });
  } catch (error) {
    next(error);
  }
});
