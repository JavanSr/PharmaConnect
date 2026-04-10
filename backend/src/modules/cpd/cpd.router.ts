import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export const cpdRouter = Router();
cpdRouter.use(authenticate);

const uid = (req: AuthRequest) => req.user!.userId;

cpdRouter.get('/activities', async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [activities, total] = await Promise.all([
      prisma.cpdActivity.findMany({
        where: { userId: uid(req) },
        skip, take: parseInt(limit),
        orderBy: { activityDate: 'desc' },
        include: { article: { select: { id: true, title: true, slug: true } } },
      }),
      prisma.cpdActivity.count({ where: { userId: uid(req) } }),
    ]);
    res.json({ data: activities, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { next(e); }
});

cpdRouter.post('/activities', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      activityType: z.enum(['READING', 'WORKSHOP', 'CONFERENCE', 'ONLINE_COURSE', 'MENTORING', 'AUDIT', 'OTHER']),
      title: z.string().min(1),
      provider: z.string().optional(),
      activityDate: z.string(),
      pointsClaimed: z.coerce.number().int().min(1).max(20),
      sourceArticleId: z.string().optional(),
      notes: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const activity = await prisma.cpdActivity.create({
      data: {
        ...data,
        userId: uid(req),
        activityDate: new Date(data.activityDate),
      },
    });
    res.status(201).json({ data: activity });
  } catch (e) { next(e); }
});

cpdRouter.get('/summary', async (req: AuthRequest, res, next) => {
  try {
    const activities = await prisma.cpdActivity.findMany({
      where: { userId: uid(req) },
    });
    const currentYear = new Date().getFullYear();
    const thisYear = activities.filter(
      a => new Date(a.activityDate).getFullYear() === currentYear
    );
    res.json({
      data: {
        totalActivities: activities.length,
        totalPoints: activities.reduce((s, a) => s + a.pointsClaimed, 0),
        thisYearActivities: thisYear.length,
        thisYearPoints: thisYear.reduce((s, a) => s + a.pointsClaimed, 0),
        byType: Object.fromEntries(
          ['READING', 'WORKSHOP', 'CONFERENCE', 'ONLINE_COURSE', 'MENTORING', 'AUDIT', 'OTHER'].map(t => [
            t,
            activities.filter(a => a.activityType === t).reduce((s, a) => s + a.pointsClaimed, 0),
          ])
        ),
      },
    });
  } catch (e) { next(e); }
});
