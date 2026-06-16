import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { sendWelcomeEmail } from '../../lib/email';
import { activateSubscriptionFromPayment, defaultPaidUntil } from '../subscription/subscription-payments.service';

export const founderRouter = Router();
founderRouter.use(authenticate);
founderRouter.use(requireRole('SUPER_ADMIN'));

// Seed/demo pharmacies to exclude from all founder views.
// These are created by `npm run db:seed` and should never appear in founder analytics or registrations.
const SEED_LICENCE_NUMBERS = ['PH-AR-2024-001'];
const SEED_EXCLUDE_FILTER = {
  NOT: { licenceNumber: { in: SEED_LICENCE_NUMBERS } },
} as const;

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
      where: SEED_EXCLUDE_FILTER,
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
      tier: z.enum(['ADDO', 'BASIC', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE']),
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
        subscriptionTier: tier as import('@prisma/client').SubscriptionTier,
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
      prisma.pharmacy.count({ where: SEED_EXCLUDE_FILTER }),
      prisma.pharmacy.count({ where: { isActive: true, ...SEED_EXCLUDE_FILTER } }),
      prisma.user.count({ where: { pharmacy: SEED_EXCLUDE_FILTER } }),
      prisma.pharmacy.groupBy({ by: ['subscriptionTier'], where: SEED_EXCLUDE_FILTER, _count: { id: true } }),
      prisma.pharmacy.groupBy({ by: ['status'], where: SEED_EXCLUDE_FILTER, _count: { id: true } }),
      prisma.pharmacy.findMany({
        where: SEED_EXCLUDE_FILTER,
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
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM dispensing_transactions`,
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

// ── /founder/analytics — platform-wide owner analytics ──────────────────────────
founderRouter.get('/analytics', async (req: AuthRequest, res, next) => {
  try {
    const { days: daysParam } = z.object({
      days: z.coerce.number().int().min(7).max(365).optional().default(30),
    }).parse(req.query);

    const now = new Date();
    const since = new Date(now.getTime() - daysParam * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totals,
      revenueByDay,
      revenueByPaymentMethod,
      topPharmacies,
      topProducts,
      overridesByType,
      recentOverrides,
    ] = await Promise.all([

      // ── Revenue totals ─────────────────────────────────────────────────────
      prisma.$queryRaw<Array<{
        total_all: string; count_all: bigint;
        total_30d: string; count_30d: bigint;
        total_7d:  string; count_7d:  bigint;
        total_mtd: string; count_mtd: bigint;
      }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(total_amount), 0)::text                                              AS total_all,
          COUNT(*)::bigint                                                                   AS count_all,
          COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${since}), 0)::text        AS total_30d,
          COUNT(*) FILTER (WHERE created_at >= ${since})::bigint                            AS count_30d,
          COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${sevenDaysAgo}), 0)::text AS total_7d,
          COUNT(*) FILTER (WHERE created_at >= ${sevenDaysAgo})::bigint                     AS count_7d,
          COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${monthStart}), 0)::text   AS total_mtd,
          COUNT(*) FILTER (WHERE created_at >= ${monthStart})::bigint                       AS count_mtd
        FROM dispensing_transactions
        WHERE status = 'COMPLETED'
      `).catch(() => [{ total_all: '0', count_all: 0n, total_30d: '0', count_30d: 0n, total_7d: '0', count_7d: 0n, total_mtd: '0', count_mtd: 0n }]),

      // ── Revenue by day ─────────────────────────────────────────────────────
      prisma.$queryRaw<Array<{ day: string; revenue: string; count: bigint }>>(Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS day,
          COALESCE(SUM(total_amount), 0)::text                  AS revenue,
          COUNT(*)::bigint                                       AS count
        FROM dispensing_transactions
        WHERE created_at >= ${since} AND status = 'COMPLETED'
        GROUP BY day
        ORDER BY day ASC
      `).catch(() => []),

      // ── Revenue by payment method ──────────────────────────────────────────
      prisma.$queryRaw<Array<{ method: string; revenue: string; count: bigint }>>(Prisma.sql`
        SELECT
          payment_method                       AS method,
          COALESCE(SUM(total_amount), 0)::text AS revenue,
          COUNT(*)::bigint                     AS count
        FROM dispensing_transactions
        WHERE created_at >= ${since} AND status != 'VOIDED'
        GROUP BY payment_method
        ORDER BY SUM(total_amount) DESC
      `).catch(() => []),

      // ── Top 10 pharmacies by revenue ───────────────────────────────────────
      prisma.$queryRaw<Array<{ pharmacy_id: string; pharmacy_name: string; tier: string; dispensing_count: bigint; revenue: string }>>(Prisma.sql`
        SELECT
          de.pharmacy_id,
          p.name              AS pharmacy_name,
          p."subscriptionTier" AS tier,
          COUNT(*)::bigint    AS dispensing_count,
          COALESCE(SUM(de.total_amount), 0)::text AS revenue
        FROM dispensing_transactions de
        JOIN pharmacies p ON p.id = de.pharmacy_id
        WHERE de.created_at >= ${since} AND de.status = 'COMPLETED'
        GROUP BY de.pharmacy_id, p.name, p."subscriptionTier"
        ORDER BY SUM(de.total_amount) DESC
        LIMIT 10
      `).catch(() => []),

      // ── Top 10 products by quantity dispensed ─────────────────────────────
      prisma.$queryRaw<Array<{ product_name: string; total_qty: bigint; dispense_count: bigint; revenue: string }>>(Prisma.sql`
        SELECT
          (item->>'productName')                                                AS product_name,
          SUM((item->>'quantity')::int)::bigint                                 AS total_qty,
          COUNT(*)::bigint                                                       AS dispense_count,
          COALESCE(SUM((item->>'unitPrice')::numeric * (item->>'quantity')::int), 0)::text AS revenue
        FROM dispensing_transactions,
             JSONB_ARRAY_ELEMENTS(items) AS item
        WHERE created_at >= ${since} AND status = 'COMPLETED'
          AND (item->>'productName') IS NOT NULL
        GROUP BY product_name
        ORDER BY total_qty DESC
        LIMIT 10
      `).catch(() => []),

      // ── Clinical override breakdown by alert type ──────────────────────────
      prisma.overrideLog.groupBy({
        by: ['alertType'],
        _count: { id: true },
        where: { createdAt: { gte: since } },
        orderBy: { _count: { id: 'desc' } },
      }).catch(() => []),

      // ── Most recent 10 overrides ───────────────────────────────────────────
      prisma.overrideLog.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, alertType: true, reason: true, createdAt: true,
          pharmacyId: true,
          pharmacy: { select: { name: true } },
        },
      }).catch(() => []),
    ]);

    const t = totals[0] ?? { total_all: '0', count_all: 0n, total_30d: '0', count_30d: 0n, total_7d: '0', count_7d: 0n, total_mtd: '0', count_mtd: 0n };

    res.json({
      data: {
        windowDays: daysParam,
        revenue: {
          allTime:       { total: parseFloat(t.total_all), count: Number(t.count_all) },
          window:        { total: parseFloat(t.total_30d), count: Number(t.count_30d) },
          last7d:        { total: parseFloat(t.total_7d),  count: Number(t.count_7d)  },
          monthToDate:   { total: parseFloat(t.total_mtd), count: Number(t.count_mtd) },
        },
        revenueByDay: revenueByDay.map(r => ({
          day: r.day,
          revenue: parseFloat(r.revenue),
          count: Number(r.count),
        })),
        revenueByPaymentMethod: revenueByPaymentMethod.map(r => ({
          method: r.method,
          revenue: parseFloat(r.revenue),
          count: Number(r.count),
        })),
        topPharmacies: topPharmacies.map(r => ({
          pharmacyId: r.pharmacy_id,
          name: r.pharmacy_name,
          tier: r.tier,
          dispensingCount: Number(r.dispensing_count),
          revenue: parseFloat(r.revenue),
        })),
        topProducts: topProducts.map(r => ({
          productName: r.product_name,
          totalQty: Number(r.total_qty),
          dispenseCount: Number(r.dispense_count),
          revenue: parseFloat(r.revenue),
        })),
        clinicalOverrides: {
          byType: overridesByType.map(r => ({ alertType: r.alertType, count: r._count.id })),
          recent: recentOverrides.map(r => ({
            id: r.id,
            alertType: r.alertType,
            reason: r.reason,
            pharmacyId: r.pharmacyId,
            pharmacyName: r.pharmacy?.name ?? null,
            createdAt: r.createdAt.toISOString(),
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── /founder/growth — MRR, trial pipeline, churn signals, activation, geography ──
founderRouter.get('/growth', async (_req: AuthRequest, res, next) => {
  try {
    const TIER_MRR: Record<string, number> = {
      ADDO: 15_000,
      BASIC: 39_000,
      STANDARD: 55_000,
      PREMIUM: 75_000,
      WHOLESALE: 100_000,
      ENTERPRISE: 0,
    };

    const now = new Date();
    const weekAgo          = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo    = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo  = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000);
    const threeDaysMs      = 3 * 24 * 60 * 60 * 1000;
    const monthStart       = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd     = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      paidPharmacies,
      trialPharmacies,
      gracePharmacies,
      newThisMonth,
      convertedEver,
      regionBreakdown,
      recentlyActive,
      // MRR movement — confirmed payments this week
      confirmedThisWeek,
      // Churn — pharmacies that entered grace this week
      graceEnteredThisWeek,
      // Churn rate MoM — grace entries per month
      graceThisMonthCount,
      graceLastMonthCount,
      // Churn base — paid pharmacies at start of each month
      paidAtMonthStart,
      paidAtLastMonthStart,
      // Avg days to convert — all-time confirmed payments (first per pharmacy)
      confirmedAllTime,
    ] = await Promise.all([
      // Paid (ACTIVE, not trialing)
      prisma.pharmacy.findMany({
        where: { status: 'ACTIVE', trialActive: false, isActive: true },
        select: { subscriptionTier: true },
      }),
      // Currently trialing
      prisma.pharmacy.findMany({
        where: { status: { in: ['TRIAL', 'ACTIVE'] }, trialActive: true, isActive: true },
        select: {
          id: true, name: true, region: true, subscriptionTier: true,
          trialStartsAt: true, trialEndsAt: true, createdAt: true,
        },
      }),
      // Grace mode
      prisma.pharmacy.findMany({
        where: { status: 'GRACE', isActive: true },
        select: { id: true, name: true, region: true, subscriptionTier: true, graceActivatedAt: true },
      }),
      // New signups this month
      prisma.pharmacy.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Ever paid (converted from trial)
      prisma.pharmacy.count({ where: { status: 'ACTIVE', trialActive: false } }),
      // By region
      prisma.pharmacy.groupBy({ by: ['region'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      // Pharmacies with dispensing activity in last 14 days
      prisma.$queryRaw<Array<{ pharmacy_id: string }>>`
        SELECT DISTINCT pharmacy_id FROM dispensing_transactions
        WHERE created_at >= ${fourteenDaysAgo}
      `,
      // Payments confirmed this week (for WoW MRR movement)
      prisma.subscriptionPaymentRequest.findMany({
        where: { status: 'CONFIRMED', reviewedAt: { gte: weekAgo } },
        orderBy: [{ pharmacyId: 'asc' }, { reviewedAt: 'desc' }],
        select: { pharmacyId: true, requestedTier: true },
      }),
      // Pharmacies that entered grace this week (churned MRR)
      prisma.pharmacy.findMany({
        where: { graceActivatedAt: { gte: weekAgo } },
        select: { subscriptionTier: true },
      }),
      // Grace entries this calendar month (churn rate numerator)
      prisma.pharmacy.count({ where: { graceActivatedAt: { gte: monthStart, lte: now } } }),
      // Grace entries last calendar month
      prisma.pharmacy.count({ where: { graceActivatedAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      // Paid pharmacies active at start of this month (churn denominator)
      prisma.pharmacy.count({
        where: { trialActive: false, status: { notIn: ['TRIAL'] }, subscriptionUpdatedAt: { lt: monthStart } },
      }),
      // Paid pharmacies active at start of last month
      prisma.pharmacy.count({
        where: { trialActive: false, status: { notIn: ['TRIAL'] }, subscriptionUpdatedAt: { lt: lastMonthStart } },
      }),
      // First confirmed payment per pharmacy — for avg days to convert
      prisma.subscriptionPaymentRequest.findMany({
        where: { status: 'CONFIRMED', reviewedAt: { not: null } },
        orderBy: [{ pharmacyId: 'asc' }, { reviewedAt: 'asc' }],
        select: { pharmacyId: true, reviewedAt: true },
        take: 2000,
      }),
    ]);

    // ── MRR ──────────────────────────────────────────────────────────────────
    const mrr = paidPharmacies.reduce((sum, p) => sum + (TIER_MRR[p.subscriptionTier] ?? 0), 0);
    const mrrByTier: Record<string, number> = {};
    for (const p of paidPharmacies) {
      const tier = p.subscriptionTier;
      mrrByTier[tier] = (mrrByTier[tier] ?? 0) + (TIER_MRR[tier] ?? 0);
    }

    // ── MRR movement (WoW) ────────────────────────────────────────────────────
    // Deduplicate to most-recent confirmation this week per pharmacy
    const latestThisWeek: Record<string, string> = {};
    for (const p of confirmedThisWeek) {
      if (!latestThisWeek[p.pharmacyId]) latestThisWeek[p.pharmacyId] = p.requestedTier;
    }
    const thisWeekPharmacyIds = Object.keys(latestThisWeek);

    // Fetch each pharmacy's previous confirmed tier (before this week)
    const prevTiers: Record<string, string> = {};
    if (thisWeekPharmacyIds.length > 0) {
      const prevPayments = await prisma.subscriptionPaymentRequest.findMany({
        where: {
          pharmacyId: { in: thisWeekPharmacyIds },
          status: 'CONFIRMED',
          reviewedAt: { lt: weekAgo },
        },
        orderBy: [{ pharmacyId: 'asc' }, { reviewedAt: 'desc' }],
        select: { pharmacyId: true, requestedTier: true },
      });
      for (const p of prevPayments) {
        if (!prevTiers[p.pharmacyId]) prevTiers[p.pharmacyId] = p.requestedTier;
      }
    }

    let newMrr = 0, expansionMrr = 0, contractionMrr = 0;
    for (const [pharmacyId, newTier] of Object.entries(latestThisWeek)) {
      const prevTier = prevTiers[pharmacyId];
      if (!prevTier) {
        // No prior payment — first-time activation
        newMrr += TIER_MRR[newTier] ?? 0;
      } else {
        const diff = (TIER_MRR[newTier] ?? 0) - (TIER_MRR[prevTier] ?? 0);
        if (diff > 0) expansionMrr += diff;
        else if (diff < 0) contractionMrr += Math.abs(diff);
      }
    }
    const churnedMrr = graceEnteredThisWeek.reduce(
      (sum, p) => sum + (TIER_MRR[p.subscriptionTier] ?? 0), 0
    );
    const quickDenom = churnedMrr + contractionMrr;
    const quickRatio = quickDenom > 0
      ? Math.round(((newMrr + expansionMrr) / quickDenom) * 100) / 100
      : null; // null = no churn, shown as ∞ in UI

    // ── Avg days to convert ───────────────────────────────────────────────────
    // First confirmed payment per pharmacy
    const firstPaymentByPharmacy: Record<string, Date> = {};
    for (const p of confirmedAllTime) {
      if (!firstPaymentByPharmacy[p.pharmacyId] && p.reviewedAt) {
        firstPaymentByPharmacy[p.pharmacyId] = p.reviewedAt;
      }
    }
    const pharmaciesForConvert = await prisma.pharmacy.findMany({
      where: { id: { in: Object.keys(firstPaymentByPharmacy) } },
      select: { id: true, trialStartsAt: true },
    });
    const daysArr = pharmaciesForConvert
      .map(ph => {
        const paid = firstPaymentByPharmacy[ph.id];
        if (!paid || !ph.trialStartsAt) return null;
        const d = (paid.getTime() - (ph.trialStartsAt as Date).getTime()) / 86_400_000;
        return d >= 0 && d <= 180 ? d : null;
      })
      .filter((d): d is number => d !== null);
    const avgDaysToConvert = daysArr.length > 0
      ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length)
      : null;

    // ── Churn rate MoM ─────────────────────────────────────────────────────────
    const churnRateThisMonth = paidAtMonthStart > 0
      ? Math.round((graceThisMonthCount / paidAtMonthStart) * 1000) / 10 : 0;
    const churnRateLastMonth = paidAtLastMonthStart > 0
      ? Math.round((graceLastMonthCount / paidAtLastMonthStart) * 1000) / 10 : 0;

    // ── Trial pipeline ────────────────────────────────────────────────────────
    const totalEverTrialed = await prisma.pharmacy.count({ where: { createdAt: { not: undefined } } });
    const conversionRate = totalEverTrialed > 0 ? Math.round((convertedEver / totalEverTrialed) * 100) : 0;
    const expiringSoon = trialPharmacies.filter(p =>
      p.trialEndsAt && new Date(p.trialEndsAt) <= sevenDaysFromNow && new Date(p.trialEndsAt) > now
    );

    // ── Churn signals ─────────────────────────────────────────────────────────
    const activePharmacyIds = new Set(recentlyActive.map((r: { pharmacy_id: string }) => r.pharmacy_id));
    const allActivePharmacies = await prisma.pharmacy.findMany({
      where: { status: 'ACTIVE', isActive: true, trialActive: false, createdAt: { lte: fourteenDaysAgo } },
      select: { id: true, name: true, region: true, subscriptionTier: true },
    });
    const darkPharmacies = allActivePharmacies.filter(p => !activePharmacyIds.has(p.id));

    // ── Activation health (new last 30 days) ──────────────────────────────────
    const newPharmacies = await prisma.pharmacy.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { id: true, name: true, createdAt: true },
    });

    let activatedCount = 0;
    let dispensedCount = 0;
    for (const p of newPharmacies) {
      const activationDeadline = new Date(new Date(p.createdAt).getTime() + threeDaysMs);
      const [firstBatch, firstDispensing] = await Promise.all([
        prisma.batch.findFirst({
          where: { pharmacyId: p.id, createdAt: { lte: activationDeadline } },
          select: { id: true },
        }),
        prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM dispensing_transactions WHERE pharmacy_id = ${p.id} LIMIT 1
        `,
      ]);
      if (firstBatch) activatedCount++;
      if (firstDispensing.length > 0) dispensedCount++;
    }

    const activationRate = newPharmacies.length > 0
      ? Math.round((activatedCount / newPharmacies.length) * 100) : 0;
    const dispensingRate = newPharmacies.length > 0
      ? Math.round((dispensedCount / newPharmacies.length) * 100) : 0;
    const stuckCount = newPharmacies.length - activatedCount;

    res.json({
      data: {
        mrr: { total: mrr, byTier: mrrByTier, arr: mrr * 12, paidCount: paidPharmacies.length },
        mrrMovement: { newMrr, expansionMrr, contractionMrr, churnedMrr },
        quickRatio,
        trials: {
          active: trialPharmacies.length,
          expiringSoon: expiringSoon.map(p => ({
            id: p.id, name: p.name, tier: p.subscriptionTier,
            trialEndsAt: p.trialEndsAt, daysLeft: p.trialEndsAt
              ? Math.ceil((new Date(p.trialEndsAt).getTime() - now.getTime()) / 86400000)
              : null,
          })),
          conversionRate,
          convertedEver,
          newThisMonth,
          avgDaysToConvert,
        },
        churn: {
          graceCount: gracePharmacies.length,
          gracePharmacies: gracePharmacies.map(p => ({
            id: p.id, name: p.name, tier: p.subscriptionTier,
            graceSince: p.graceActivatedAt,
          })),
          darkCount: darkPharmacies.length,
          darkPharmacies: darkPharmacies.slice(0, 10).map(p => ({
            id: p.id, name: p.name, tier: p.subscriptionTier,
          })),
          churnRateThisMonth,
          churnRateLastMonth,
        },
        activation: {
          newLast30Days: newPharmacies.length,
          stockWithin3Days: activatedCount,
          activationRate,
          dispensingRate,
          stuckCount,
        },
        geography: regionBreakdown.map(r => ({ region: r.region || 'Unknown', count: r._count.id })),
      },
    });
  } catch (error) {
    next(error);
  }
});
