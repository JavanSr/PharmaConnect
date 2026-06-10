import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import * as svc from './review.service';

export const reviewRouter = Router();
reviewRouter.use(authenticate);
reviewRouter.use(requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'));

function viewer(req: AuthRequest) {
  return req.user!;
}

reviewRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const filters = z
      .object({
        status: z.enum(['DRAFT', 'IMPORTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'RETIRED']).optional(),
        entityType: z.string().trim().optional(),
        reviewerType: z.enum(['PLATFORM_PHARMACIST', 'TMDA_REFERENCE']).optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(req.query);

    res.json(await svc.listReviewQueue(viewer(req), filters));
  } catch (error) {
    next(error);
  }
});

reviewRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.getReviewQueueEntry(viewer(req), req.params.id) });
  } catch (error) {
    next(error);
  }
});

reviewRouter.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const payload = z
      .object({
        status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'RETIRED']),
        reviewerType: z.enum(['PLATFORM_PHARMACIST', 'TMDA_REFERENCE']).optional(),
        notes: z.string().trim().max(4000).optional(),
        proposedPayload: z.unknown().optional(),
      })
      .parse(req.body);

    res.json({ data: await svc.updateReviewQueueEntry(viewer(req), req.params.id, payload) });
  } catch (error) {
    next(error);
  }
});
