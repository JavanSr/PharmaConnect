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
          batches: { none: { quantityRemaining: { gt: 0 } } },
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

    res.json({
      data: {
        totalProducts,
        totalPatients: 0,
        totalDispensings: Number(dispensingResult[0]?.count ?? 0),
        dispensedUnits: dispensed,
        receivedUnits: received,
        lowStockCount,
        expiryCount,
      },
    });
  } catch (e) { next(e); }
});

analyticsRouter.post('/compare', requireTier('ENTERPRISE'), async (req: AuthRequest, res, next) => {
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
