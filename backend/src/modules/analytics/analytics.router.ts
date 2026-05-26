import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import type { AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { requireTier } from '../../middleware/tier';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { prisma } from '../../lib/prisma';
import {
  ANALYTICS_COMPARE_METRICS,
  ANALYTICS_COMPARE_RANGES,
  getAnalyticsFeatureSet,
  getAnalyticsSummary,
  getCompareSeries,
} from './analytics.service';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);
analyticsRouter.use(enforceTrialRestrictions);

// ── Grace mode: daily revenue only (no permission check needed) ───────────────
// This route is declared before requirePermission so the owner can reach it
// without needing an explicit analytics permission grant.
analyticsRouter.get('/daily-revenue', async (req: AuthRequest, res, next) => {
  try {
    const pharmacyId = req.user?.pharmacyId;
    if (!pharmacyId) {
      res.status(400).json({ error: 'Pharmacy context required' });
      return;
    }

    // Today's window in UTC (good enough for Dodoma — TZ offset handled client-side).
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Yesterday for comparison
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setUTCMilliseconds(-1);

    const [todayRows, yesterdayRows] = await Promise.all([
      prisma.$queryRaw<Array<{ total: string | null; count: bigint }>>`
        SELECT
          SUM(total_amount)  AS total,
          COUNT(*)           AS count
        FROM dispensing_events
        WHERE pharmacy_id = ${pharmacyId}
          AND created_at >= ${todayStart}
          AND created_at <= ${todayEnd}
          AND status != 'VOIDED'
      `,
      prisma.$queryRaw<Array<{ total: string | null; count: bigint }>>`
        SELECT
          SUM(total_amount)  AS total,
          COUNT(*)           AS count
        FROM dispensing_events
        WHERE pharmacy_id = ${pharmacyId}
          AND created_at >= ${yesterdayStart}
          AND created_at <= ${yesterdayEnd}
          AND status != 'VOIDED'
      `,
    ]);

    const todayRevenue = Number(todayRows[0]?.total ?? 0);
    const todayCount   = Number(todayRows[0]?.count ?? 0);
    const yesterdayRevenue = Number(yesterdayRows[0]?.total ?? 0);

    const change = yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : null;

    res.json({
      data: {
        todayRevenue,
        todayCount,
        yesterdayRevenue,
        change,          // percentage change vs yesterday, null if no yesterday data
        date: todayStart.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Grace mode restriction for all other analytics routes ─────────────────────
analyticsRouter.use((req: AuthRequest, res, next) => {
  if (req.graceMode) {
    res.status(402).json({
      error: 'GRACE_FEATURE_LOCKED',
      message: 'Only daily revenue is available during grace access. Renew your subscription to unlock full analytics.',
      subscribeUrl: '/settings/subscription',
    });
    return;
  }
  next();
});

analyticsRouter.use(requirePermission('analytics.view_dashboard'));

const pid = (req: AuthRequest): string => {
  const id = req.user?.pharmacyId;
  if (!id) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return id;
};

analyticsRouter.get('/features', async (req: AuthRequest, res) => {
  res.json({
    data: getAnalyticsFeatureSet(req.user!.pharmacy?.subscriptionTier ?? null),
  });
});

analyticsRouter.get('/summary', async (req: AuthRequest, res, next) => {
  try {
    res.json({
      success: true,
      data: await getAnalyticsSummary(pid(req)),
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/overview', async (req: AuthRequest, res, next) => {
  try {
    const { from, to } = z.object({
      from: z.string().optional(),
      to:   z.string().optional(),
    }).parse(req.query);

    const dateFilter = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };

    const pharmacyId = pid(req);
    const [
      totalProducts,
      dispensingResult,
      movements,
      lowStockCount,
      expiryCount,
    ] = await Promise.all([
      prisma.product.count({ where: { pharmacyId, isActive: true } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count
        FROM dispensing_events
        WHERE pharmacy_id = ${pharmacyId}
          AND (${from ?? null}::timestamptz IS NULL OR created_at >= ${from ? new Date(from) : null})
          AND (${to ?? null}::timestamptz IS NULL OR created_at <= ${to ? new Date(to) : null})
      `,
      prisma.stockMovement.findMany({
        where: {
          pharmacyId,
          ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
        },
        select: { type: true, quantity: true, createdAt: true },
      }),
      prisma.product.count({
        where: {
          pharmacyId,
          isActive: true,
          batches: { none: { pharmacyId, quantityRemaining: { gt: 0 } } },
        },
      }),
      prisma.batch.count({
        where: {
          pharmacyId,
          quantityRemaining: { gt: 0 },
          expiryDate: { lte: new Date(Date.now() + 30 * 86400000) },
        },
      }),
    ]);

    const dispensed = movements
      .filter(m => m.type === 'DISPENSED')
      .reduce((s, m) => s + m.quantity, 0);

    const received = movements
      .filter(m => m.type === 'RECEIVED')
      .reduce((s, m) => s + m.quantity, 0);

    const dispensingCount = Number(dispensingResult[0]?.count ?? 0);

    res.json({
      data: {
        totalProducts,
        patientCount: 0,
        dispensingCount,
        totalPatients: 0,
        totalDispensings: dispensingCount,
        dispensedUnits: dispensed,
        receivedUnits: received,
        lowStockCount,
        expiryCount,
      },
    });
  } catch (e) { next(e); }
});

analyticsRouter.post('/compare', requireTier('STANDARD'), async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      metric: z.enum(ANALYTICS_COMPARE_METRICS),
      range: z.enum(ANALYTICS_COMPARE_RANGES),
      pharmacyIds: z.array(z.string().uuid()).min(1),
    }).parse(req.body);

    const memberships = await prisma.pharmacyMembership.findMany({
      where: {
        userId: req.user!.userId,
        active: true,
        OR: [
          { validFrom: null },
          { validFrom: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          },
        ],
      },
      select: {
        pharmacyId: true,
      },
    });

    const membershipIds = new Set(memberships.map((membership) => membership.pharmacyId));
    const hasForeignPharmacy = payload.pharmacyIds.some((pharmacyId) => !membershipIds.has(pharmacyId));
    if (hasForeignPharmacy) {
      res.status(403).json({ error: 'PHARMACY_SCOPE_INVALID' });
      return;
    }

    res.json({
      data: await getCompareSeries({
        pharmacyIds: payload.pharmacyIds,
        metric: payload.metric,
        range: payload.range,
      }),
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/movements-trend', async (req: AuthRequest, res, next) => {
  try {
    const { days = '30' } = req.query as Record<string, string>;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    const movements = await prisma.stockMovement.findMany({
      where: { pharmacyId: pid(req), createdAt: { gte: since } },
      select: { type: true, quantity: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const byDate: Record<string, { date: string; dispensed: number; received: number }> = {};
    for (const m of movements) {
      const date = m.createdAt.toISOString().slice(0, 10);
      if (!byDate[date]) byDate[date] = { date, dispensed: 0, received: 0 };
      if (m.type === 'DISPENSED') byDate[date].dispensed += m.quantity;
      if (m.type === 'RECEIVED')  byDate[date].received  += m.quantity;
    }

    res.json({ data: Object.values(byDate) });
  } catch (e) { next(e); }
});
