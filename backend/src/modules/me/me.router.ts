import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import { issueAuthTokens, listAccessiblePharmacies } from '../auth/pharmacy-membership.service';

export const meRouter = Router();
meRouter.use(authenticate);

const activeMembershipWhere = (userId: string, pharmacyId: string) => ({
  userId,
  pharmacyId,
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
});

meRouter.get('/pharmacies', async (req: AuthRequest, res, next) => {
  try {
    const memberships = await listAccessiblePharmacies(req.user!.userId);
    res.json({
      data: memberships.map((membership) => ({
        ...membership,
        selected: membership.pharmacyId === req.user!.pharmacyId,
      })),
    });
  } catch (error) {
    next(error);
  }
});

meRouter.post('/pharmacies/:id/select', async (req: AuthRequest, res, next) => {
  try {
    const pharmacyId = z.string().uuid().parse(req.params.id);
    const membership = await withPrismaRetry(() => prisma.pharmacyMembership.findFirst({
      where: activeMembershipWhere(req.user!.userId, pharmacyId),
      select: {
        pharmacyId: true,
        pharmacy: {
          select: {
            id: true,
            name: true,
            licenceNumber: true,
            address: true,
            region: true,
            pharmacyType: true,
            subscriptionTier: true,
            billingCycle: true,
            status: true,
            trialActive: true,
            trialStartsAt: true,
            trialEndsAt: true,
            isHybrid: true,
            hybridAddonActive: true,
            vfdEnabled: true,
            userLimit: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    }));

    if (!membership) {
      res.status(403).json({ error: 'PHARMACY_MEMBERSHIP_REQUIRED' });
      return;
    }

    await withPrismaRetry(() => prisma.user.update({
      where: { id: req.user!.userId },
      data: { pharmacyId: pharmacyId },
    }));

    const { accessToken, refreshToken } = await issueAuthTokens({
      userId: req.user!.userId,
      role: req.user!.role,
      pharmacyId,
    });

    res.json({
      data: {
        accessToken,
        refreshToken,
        pharmacy: membership.pharmacy,
      },
    });
  } catch (error) {
    next(error);
  }
});
