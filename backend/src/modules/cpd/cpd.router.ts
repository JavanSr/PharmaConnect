import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import { z } from 'zod';
import { authenticate, assertUser, type AuthRequest } from '../../middleware/auth';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { prisma } from '../../lib/prisma';

export const cpdRouter = Router();
cpdRouter.use(authenticate);
cpdRouter.use(enforceTrialRestrictions);

function ensureCpdAccess(req: AuthRequest, res: Response) {
  const tier = req.user?.pharmacy?.subscriptionTier;
  const pharmacyType = req.user?.pharmacy?.pharmacyType;
  if (tier === 'WHOLESALE' || pharmacyType === 'WHOLESALE' || tier === 'ADDO' || pharmacyType === 'ADDO') {
    res.status(403).json({ error: 'TIER_INSUFFICIENT' });
    return false;
  }
  return true;
}

const uid = (req: AuthRequest) => assertUser(req).userId;

cpdRouter.get('/activities', async (req: AuthRequest, res, next) => {
  try {
    if (!ensureCpdAccess(req, res)) return;

    const rows = await prisma.$queryRaw<Array<{
      id: string;
      userId: string;
      activityType: string;
      title: string;
      provider: string | null;
      activityDate: Date;
      pointsClaimed: number;
      pointsApproved: number | null;
      certificate: string | null;
      sourceArticleId: string | null;
      notes: string | null;
      auto_logged: boolean | null;
      renewal_year: number | null;
      createdAt: Date;
    }>>`
      SELECT *
      FROM "cpd_activities"
      WHERE "userId" = ${uid(req)}
      ORDER BY "activityDate" DESC, "createdAt" DESC
      LIMIT 100
    `;

    res.json({
      data: rows.map((row) => ({
        ...row,
        activityDate: row.activityDate.toISOString(),
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

cpdRouter.post('/activities', async (req: AuthRequest, res, next) => {
  try {
    if (!ensureCpdAccess(req, res)) return;

    const payload = z.object({
      activityType: z.enum(['READING', 'WORKSHOP', 'CONFERENCE', 'ONLINE_COURSE', 'MENTORING', 'AUDIT', 'OTHER']),
      title: z.string().min(1),
      provider: z.string().optional(),
      activityDate: z.string(),
      pointsClaimed: z.coerce.number().int().min(1).max(20),
      sourceArticleId: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "cpd_activities" (
        "id",
        "userId",
        "activityType",
        "title",
        "provider",
        "activityDate",
        "pointsClaimed",
        "sourceArticleId",
        "notes",
        "renewal_year",
        "auto_logged"
      )
      VALUES (
        ${randomUUID()},
        ${uid(req)},
        ${payload.activityType},
        ${payload.title},
        ${payload.provider ?? null},
        ${new Date(payload.activityDate)},
        ${payload.pointsClaimed},
        ${payload.sourceArticleId ?? null},
        ${payload.notes ?? null},
        ${new Date().getFullYear()},
        false
      )
      RETURNING "id"
    `;

    res.status(201).json({ data: { id: rows[0]?.id } });
  } catch (error) {
    next(error);
  }
});

cpdRouter.get('/summary', async (req: AuthRequest, res, next) => {
  try {
    if (!ensureCpdAccess(req, res)) return;

    const rows = await prisma.$queryRaw<Array<{
      total_points: number | null;
      total_activities: number | null;
      this_year_points: number | null;
      this_year_activities: number | null;
      auto_logged_points: number | null;
    }>>`
      SELECT
        COALESCE(SUM(COALESCE("pointsApproved", "pointsClaimed")), 0)::int AS total_points,
        COUNT(*)::int AS total_activities,
        COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM "activityDate") = EXTRACT(YEAR FROM NOW()) THEN COALESCE("pointsApproved", "pointsClaimed") ELSE 0 END), 0)::int AS this_year_points,
        COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM "activityDate") = EXTRACT(YEAR FROM NOW()) THEN 1 ELSE 0 END), 0)::int AS this_year_activities,
        COALESCE(SUM(CASE WHEN COALESCE("auto_logged", false) THEN COALESCE("pointsApproved", "pointsClaimed") ELSE 0 END), 0)::int AS auto_logged_points
      FROM "cpd_activities"
      WHERE "userId" = ${uid(req)}
    `;

    const activities = await prisma.$queryRaw<Array<{ activityType: string; pointsClaimed: number; pointsApproved: number | null }>>`
      SELECT "activityType", "pointsClaimed", "pointsApproved"
      FROM "cpd_activities"
      WHERE "userId" = ${uid(req)}
    `;

    const renewalYear = new Date().getFullYear();
    const renewalDeadline = new Date(`${renewalYear}-12-31T23:59:59.999Z`);
    const daysToRenewal = Math.ceil((renewalDeadline.getTime() - Date.now()) / 86_400_000);

    const pointsByType = Object.fromEntries(
      ['READING', 'WORKSHOP', 'CONFERENCE', 'ONLINE_COURSE', 'MENTORING', 'AUDIT', 'OTHER'].map((type) => [
        type,
        activities
          .filter((activity) => activity.activityType === type)
          .reduce((sum, activity) => sum + (activity.pointsApproved ?? activity.pointsClaimed ?? 0), 0),
      ]),
    );

    res.json({
      data: {
        totalPoints: rows[0]?.total_points ?? 0,
        totalActivities: rows[0]?.total_activities ?? 0,
        thisYearPoints: rows[0]?.this_year_points ?? 0,
        thisYearActivities: rows[0]?.this_year_activities ?? 0,
        autoLoggedPoints: rows[0]?.auto_logged_points ?? 0,
        renewalYear,
        daysToRenewal,
        renewalAlerts: {
          due60: daysToRenewal <= 60,
          due14: daysToRenewal <= 14,
        },
        pointsByType,
      },
    });
  } catch (error) {
    next(error);
  }
});
