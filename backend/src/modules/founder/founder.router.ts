import { Router } from 'express';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { sendWelcomeEmail } from '../../lib/email';

export const founderRouter = Router();
founderRouter.use(authenticate);
founderRouter.use(requireRole('SUPER_ADMIN'));

founderRouter.get('/registrations', async (_req: AuthRequest, res, next) => {
  try {
    const pharmacies = await prisma.pharmacy.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        region: true,
        pharmacyType: true,
        subscriptionTier: true,
        status: true,
        trialActive: true,
        createdAt: true,
        memberships: {
          where: { role: 'OWNER', active: true },
          take: 1,
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                emailVerifiedAt: true,
              },
            },
          },
        },
      },
    });

    const rows = pharmacies.map(p => {
      const ownerUser = p.memberships[0]?.user ?? null;
      return {
        id: p.id,
        name: p.name,
        region: p.region,
        pharmacyType: p.pharmacyType,
        tier: p.subscriptionTier,
        status: p.status,
        trialActive: p.trialActive,
        createdAt: p.createdAt,
        owner: ownerUser
          ? {
              name: `${ownerUser.firstName} ${ownerUser.lastName}`,
              email: ownerUser.email,
              emailVerified: Boolean(ownerUser.emailVerifiedAt),
            }
          : null,
      };
    });

    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

founderRouter.post('/registrations/:pharmacyId/verify-owner', async (req: AuthRequest, res, next) => {
  try {
    const { pharmacyId } = req.params;

    const membership = await prisma.pharmacyMembership.findFirst({
      where: {
        pharmacyId,
        role: 'OWNER',
        active: true,
      },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            emailVerifiedAt: true,
          },
        },
        pharmacy: {
          select: {
            id: true,
            name: true,
            region: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (!membership) {
      throw Object.assign(new Error('Owner account not found for this pharmacy'), { status: 404 });
    }

    const verifiedAt = membership.user.emailVerifiedAt ?? new Date();
    const user = await prisma.user.update({
      where: { id: membership.user.id },
      data: {
        emailVerifiedAt: verifiedAt,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerifiedAt: true,
      },
    });

    if (!membership.user.emailVerifiedAt) {
      sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        pharmacyName: membership.pharmacy.name,
        region: membership.pharmacy.region,
        tier: membership.pharmacy.subscriptionTier,
      }).catch(err => console.error('[founder.verify-owner] welcome email failed:', err));
    }

    res.json({
      data: {
        pharmacy: membership.pharmacy,
        owner: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          emailVerified: Boolean(user.emailVerifiedAt),
          emailVerifiedAt: user.emailVerifiedAt,
        },
        verifiedBy: req.user?.email ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

founderRouter.get('/stats', async (_req: AuthRequest, res, next) => {
  try {
    const [
      totalPharmacies,
      activePharmacies,
      totalUsers,
      tierBreakdown,
      statusBreakdown,
      recentPharmacies,
      recentOverrides,
      totalDispensings,
      totalBatches,
    ] = await Promise.all([
      prisma.pharmacy.count(),
      prisma.pharmacy.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.pharmacy.groupBy({ by: ['subscriptionTier'], _count: { id: true } }),
      prisma.pharmacy.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.pharmacy.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, region: true, subscriptionTier: true, status: true, createdAt: true },
      }),
      prisma.overrideLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          pharmacyId: true,
          alertType: true,
          reason: true,
          createdAt: true,
          pharmacy: { select: { name: true } },
        },
      }),
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM dispensing_events`,
      prisma.batch.count(),
    ]);
    const dispensingCount = Number(totalDispensings[0]?.count ?? 0);

    res.json({
      data: {
        pharmacies: { total: totalPharmacies, active: activePharmacies },
        users: { total: totalUsers },
        tierBreakdown: Object.fromEntries(tierBreakdown.map(r => [r.subscriptionTier, r._count.id])),
        statusBreakdown: Object.fromEntries(statusBreakdown.map(r => [r.status, r._count.id])),
        recentPharmacies,
        recentOverrides,
        activity: { totalDispensings: dispensingCount, totalBatches },
      },
    });
  } catch (error) {
    next(error);
  }
});
