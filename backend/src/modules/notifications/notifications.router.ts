import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { getNotificationPreference, upsertNotificationPreference } from '../../services/NotificationService';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

const uid = (req: AuthRequest) => req.user!.userId;
function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}

notificationsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      unreadOnly: z.coerce.boolean().optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }).parse(req.query);

    const notifications = await prisma.notification.findMany({
      where: {
        pharmacyId: pid(req),
        OR: [
          { userId: uid(req) },
          { userId: null },
        ],
        ...(query.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        pharmacyId: pid(req),
        OR: [
          { userId: uid(req) },
          { userId: null },
        ],
        isRead: false,
      },
    });

    res.json({
      data: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.body,
        readStatus: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        type: notification.type,
        metadata: notification.metadata,
      })),
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/read-all', async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        pharmacyId: pid(req),
        OR: [
          { userId: uid(req) },
          { userId: null },
        ],
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        pharmacyId: pid(req),
        OR: [
          { userId: uid(req) },
          { userId: null },
        ],
      },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: {
        isRead: true,
        readAt: notification.readAt ?? new Date(),
      },
    });

    res.json({
      data: {
        id: updated.id,
        readStatus: updated.isRead,
        readAt: updated.readAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get(
  '/preferences/:alertType',
  requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'),
  async (req: AuthRequest, res, next) => {
    try {
      const preference = await getNotificationPreference(pid(req), uid(req), req.params.alertType);
      res.json({ data: preference });
    } catch (error) {
      next(error);
    }
  },
);

notificationsRouter.put(
  '/preferences/:alertType',
  requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'),
  async (req: AuthRequest, res, next) => {
    try {
      const payload = z.object({
        inAppEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
        whatsappEnabled: z.boolean().optional(),
      }).parse(req.body);

      const preference = await upsertNotificationPreference({
        pharmacyId: pid(req),
        userId: uid(req),
        alertType: req.params.alertType,
        ...payload,
      });

      res.json({ data: preference });
    } catch (error) {
      next(error);
    }
  },
);
