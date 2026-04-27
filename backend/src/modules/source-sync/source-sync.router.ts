import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import * as svc from './source-sync.service';

export const sourceSyncRouter = Router();
sourceSyncRouter.use(authenticate);
sourceSyncRouter.use(requireRole('SUPER_ADMIN'));

sourceSyncRouter.get('/runs', async (req: AuthRequest, res, next) => {
  try {
    const { limit } = z.object({ limit: z.coerce.number().optional() }).parse(req.query);
    res.json({ data: await svc.listSourceSyncRuns(limit) });
  } catch (error) {
    next(error);
  }
});

sourceSyncRouter.post('/runs', async (req: AuthRequest, res, next) => {
  try {
    res.status(201).json({
      data: await svc.runSourceSyncCheck(req.user?.userId ?? null),
    });
  } catch (error) {
    next(error);
  }
});
