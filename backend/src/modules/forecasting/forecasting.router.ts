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

export const forecastingRouter = Router();
forecastingRouter.use(authenticate);
forecastingRouter.use(enforceTrialRestrictions);
forecastingRouter.use(requirePermission('analytics.view_dashboard'));

const pid = (req: AuthRequest) => req.user!.pharmacyId!;

forecastingRouter.get('/stockout', requireTier('STANDARD'), async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      lookbackDays: z.coerce.number().int().min(7).max(180).optional(),
      leadTimeDays: z.coerce.number().int().min(1).max(120).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }).parse(req.query);

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

    res.json({ data: await getDeadStock(pid(req), limit) });
  } catch (error) {
    next(error);
  }
});

forecastingRouter.get('/regional', requireTier('PREMIUM'), async (_req: AuthRequest, res) => {
  res.json({ data: getRegionalForecastStub() });
});
