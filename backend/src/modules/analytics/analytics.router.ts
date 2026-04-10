import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

const pid = (req: AuthRequest) => req.user!.pharmacyId!;

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

    const [
      totalProducts,
      totalPatients,
      totalDispensings,
      movements,
      lowStockCount,
      expiryCount,
    ] = await Promise.all([
      prisma.product.count({ where: { pharmacyId: pid(req), isActive: true } }),
      prisma.patient.count({ where: { pharmacyId: pid(req) } }),
      prisma.dispensing.count({
        where: {
          pharmacyId: pid(req),
          ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
        },
      }),
      prisma.stockMovement.findMany({
        where: {
          pharmacyId: pid(req),
          ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
        },
        select: { type: true, quantity: true, createdAt: true },
      }),
      prisma.product.count({
        where: {
          pharmacyId: pid(req),
          isActive: true,
          batches: { none: { quantityRemaining: { gt: 0 } } },
        },
      }),
      prisma.batch.count({
        where: {
          pharmacyId: pid(req),
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
        totalPatients,
        totalDispensings,
        dispensedUnits: dispensed,
        receivedUnits: received,
        lowStockCount,
        expiryCount,
      },
    });
  } catch (e) { next(e); }
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
