import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { requireTier } from '../../middleware/tier';
import { enforceTrialRestrictions } from '../../middleware/trial';
import {
  getDeadStock,
  getRegionalForecastStub,
  getSeasonalitySeries,
  getStockoutForecast,
} from './forecasting.service';
import { trackFeatureTelemetry } from '../telemetry/feature-telemetry.service';

export const forecastingRouter = Router();
forecastingRouter.use(authenticate);
forecastingRouter.use(enforceTrialRestrictions);
forecastingRouter.use(requirePermission('analytics.view_dashboard'));

function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}

forecastingRouter.get('/stockout', requireTier('STANDARD'), async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      lookbackDays: z.coerce.number().int().min(7).max(180).optional(),
      leadTimeDays: z.coerce.number().int().min(1).max(120).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }).parse(req.query);

    await trackFeatureTelemetry({
      pharmacyId: pid(req),
      userId: req.user!.userId,
      featureKey: 'forecasting',
      eventType: 'USED',
      metadata: {
        report: 'stockout',
        lookbackDays: query.lookbackDays ?? null,
        leadTimeDays: query.leadTimeDays ?? null,
      },
    });

    res.json({
      data: await getStockoutForecast({
        pharmacyId: pid(req),
        lookbackDays: query.lookbackDays,
        leadTimeDays: query.leadTimeDays,
        limit: query.limit,
      }),
    });
  } catch (error) {
    next(error);
  }
});

forecastingRouter.get('/seasonality', requireTier('PREMIUM'), async (req: AuthRequest, res, next) => {
  try {
    await trackFeatureTelemetry({
      pharmacyId: pid(req),
      userId: req.user!.userId,
      featureKey: 'forecasting',
      eventType: 'USED',
      metadata: {
        report: 'seasonality',
      },
    });
    res.json({ data: await getSeasonalitySeries(pid(req)) });
  } catch (error) {
    next(error);
  }
});

forecastingRouter.get('/dead-stock', requireTier('PREMIUM'), async (req: AuthRequest, res, next) => {
  try {
    const { limit } = z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }).parse(req.query);

    await trackFeatureTelemetry({
      pharmacyId: pid(req),
      userId: req.user!.userId,
      featureKey: 'forecasting',
      eventType: 'USED',
      metadata: {
        report: 'dead_stock',
        limit: limit ?? null,
      },
    });

    res.json({ data: await getDeadStock(pid(req), limit) });
  } catch (error) {
    next(error);
  }
});

forecastingRouter.get('/regional', requireTier('PREMIUM'), async (_req: AuthRequest, res) => {
  res.json({ data: getRegionalForecastStub() });
});
