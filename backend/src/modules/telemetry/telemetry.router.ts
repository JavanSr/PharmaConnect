import { Router } from 'express';
import { z } from 'zod';
import { authenticate, assertUser, type AuthRequest } from '../../middleware/auth';
import { trackFeatureTelemetry } from './feature-telemetry.service';

export const telemetryRouter = Router();
telemetryRouter.use(authenticate);

const trackSchema = z.object({
  featureKey: z.string().min(1).max(100),
  eventType:  z.enum(['ACTIVATED', 'USED']).default('USED'),
  metadata:   z.record(z.unknown()).optional(),
});

telemetryRouter.post('/track', async (req: AuthRequest, res, next) => {
  try {
    const { featureKey, eventType, metadata } = trackSchema.parse(req.body);
    const { userId, pharmacyId } = assertUser(req);
    if (!pharmacyId) { res.status(400).json({ error: 'No pharmacy context' }); return; }

    await trackFeatureTelemetry({ pharmacyId, userId, featureKey, eventType, metadata });
    res.json({ data: { tracked: true } });
  } catch (e) { next(e); }
});
