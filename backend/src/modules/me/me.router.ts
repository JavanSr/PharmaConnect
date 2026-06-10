import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import { issueAuthTokens, listAccessiblePharmacies } from '../auth/pharmacy-membership.service';
import { trackFeatureTelemetry } from '../telemetry/feature-telemetry.service';
import { sendFounderNotification } from '../../lib/email';

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
        selected: membership.pharmacyId === req.user?.pharmacyId,
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

    await trackFeatureTelemetry({
      pharmacyId,
      userId: req.user!.userId,
      featureKey: 'multi_pharmacy_selector',
      eventType: 'USED',
      metadata: {
        selectedPharmacyId: pharmacyId,
      },
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

// ── Add new outlet (OWNER only) ───────────────────────────────────────────────
//
// An existing owner creates a new ADDO or Retail pharmacy under their account.
// Checks whether adding one more outlet exceeds the owner's current tier limit.
// If it does, returns a 402 with the required upgrade tier so the UI can prompt.
// The new pharmacy starts a fresh 14-day trial. No new user account needed.

const TRIAL_DAYS = 14;

// Outlet limits per subscription tier (mirrors CLAUDE.md)
const OUTLET_LIMITS: Record<string, number> = {
  ADDO:       1,
  ESSENTIAL:  2,
  ADDO_PLUS:  2,
  STANDARD:   3,
  PREMIUM:    5,
  ENTERPRISE: 999,
};

// What tier to suggest when the current one is full
const TIER_UPGRADE: Record<string, string> = {
  ADDO:      'ESSENTIAL',
  ESSENTIAL: 'STANDARD',
  ADDO_PLUS: 'STANDARD',
  STANDARD:  'PREMIUM',
  PREMIUM:   'ENTERPRISE',
};

const TIER_PRICES: Record<string, number> = {
  ADDO: 15_000, ESSENTIAL: 39_000, ADDO_PLUS: 45_000,
  STANDARD: 55_000, PREMIUM: 75_000, ENTERPRISE: 0,
};

const ADDO_OUTLET_PRICE = 15_000;

const addOutletSchema = z.object({
  name:           z.string().trim().min(2, 'Name is required'),
  pharmacyType:   z.enum(['ADDO', 'RETAIL']),  // no hybrid, no wholesale
  region:         z.string().trim().min(1, 'Region is required'),
  address:        z.string().trim().min(2, 'Address is required'),
  licenceNumber:  z.string().trim().optional(),
  // Payment fields — required only for ADDO addon outlets
  paymentMethod:  z.string().trim().max(80).optional(),
  transactionRef: z.string().trim().max(120).optional(),
  payerPhone:     z.string().trim().max(40).optional().or(z.literal('')),
});

meRouter.post(
  '/pharmacies/add-outlet',
  requireRole('OWNER'),
  async (req: AuthRequest, res, next) => {
    try {
      const data   = addOutletSchema.parse(req.body);
      const userId = req.user!.userId;

      // ── Tier limit check ────────────────────────────────────────────────────
      // Count active pharmacies this owner belongs to as OWNER (includes SUSPENDED)
      const currentOutletCount = await prisma.pharmacyMembership.count({
        where: {
          userId,
          role:   'OWNER',
          active: true,
          pharmacy: { OR: [{ isActive: true }, { status: 'SUSPENDED' }] },
        },
      });

      // Use the currently selected pharmacy's tier as the account tier
      const currentTier = req.user!.pharmacy?.subscriptionTier ?? 'ADDO';
      const limit       = OUTLET_LIMITS[currentTier] ?? 1;

      // ── ADDO per-outlet addon path ──────────────────────────────────────────
      // ADDO owners at their 1-outlet limit can add more ADDOs at Tsh 15,000/month
      // each instead of upgrading tiers. Each new outlet is created SUSPENDED and
      // requires a confirmed payment to become active.
      // Exception: owners still in their trial add outlets normally (shared trial,
      // no payment required until trial ends).
      // Owner is in trial if ANY of their pharmacies still has an active trial.
      const trialCount = await prisma.pharmacyMembership.count({
        where: {
          userId,
          role:   'OWNER',
          active: true,
          pharmacy: { trialActive: true, status: 'TRIAL' },
        },
      });
      const ownerInTrial = trialCount > 0;

      if (currentTier === 'ADDO' && currentOutletCount >= limit && !ownerInTrial) {
        if (data.pharmacyType !== 'ADDO') {
          const upgradeTo    = TIER_UPGRADE[currentTier];
          const upgradePrice = upgradeTo ? TIER_PRICES[upgradeTo] ?? 0 : 0;
          res.status(402).json({
            error:        'OUTLET_LIMIT_REACHED',
            message:      'Adding a Retail Pharmacy requires upgrading your plan.',
            currentTier,
            currentCount: currentOutletCount,
            limit,
            upgradeTo:    upgradeTo ?? null,
            upgradePrice,
          });
          return;
        }
        if (!data.paymentMethod || !data.transactionRef) {
          res.status(400).json({
            error:   'PAYMENT_DETAILS_REQUIRED',
            message: 'Provide M-Pesa or bank transfer details to add another ADDO.',
          });
          return;
        }

        const licenceNumber = data.licenceNumber?.trim() || `PENDING-${Date.now()}`;
        const result = await withPrismaRetry(() => prisma.$transaction(async (tx) => {
          const pharmacy = await tx.pharmacy.create({
            data: {
              name:             data.name,
              licenceNumber,
              address:          data.address,
              region:           data.region,
              pharmacyType:     'ADDO',
              subscriptionTier: 'ADDO',
              status:           'SUSPENDED',
              trialActive:      false,
              trialStartsAt:    new Date(),
              trialEndsAt:      new Date(),
              isActive:         false,
            },
          });
          await tx.pharmacyMembership.create({
            data: {
              userId,
              pharmacyId: pharmacy.id,
              role:       'OWNER',
              active:     true,
              validFrom:  new Date(),
              createdBy:  userId,
            },
          });
          const paymentRequest = await tx.subscriptionPaymentRequest.create({
            data: {
              pharmacyId:     pharmacy.id,
              requestedBy:    userId,
              requestedTier:  'ADDO',
              billingCycle:   'MONTHLY',
              amount:         new Prisma.Decimal(ADDO_OUTLET_PRICE),
              paymentMethod:  data.paymentMethod!,
              transactionRef: data.transactionRef!,
              payerPhone:     data.payerPhone || null,
              note:           `Additional ADDO outlet: ${data.name}`,
            },
          });
          return { pharmacy, paymentRequest };
        }));

        sendFounderNotification({
          pharmacyName: result.pharmacy.name,
          ownerName:    req.user!.email,
          ownerEmail:   req.user!.email,
          region:       result.pharmacy.region,
          pharmacyType: result.pharmacy.pharmacyType,
          tier:         result.pharmacy.subscriptionTier,
        }).catch(() => {});

        res.status(201).json({
          data: {
            id:               result.pharmacy.id,
            name:             result.pharmacy.name,
            pharmacyType:     result.pharmacy.pharmacyType,
            region:           result.pharmacy.region,
            status:           result.pharmacy.status,
            pendingPayment:   true,
            paymentRequestId: result.paymentRequest.id,
          },
        });
        return;
      }

      // ── Standard tier limit block ────────────────────────────────────────────
      if (currentOutletCount >= limit) {
        const upgradeTo    = TIER_UPGRADE[currentTier];
        const upgradePrice = upgradeTo ? TIER_PRICES[upgradeTo] ?? 0 : 0;
        res.status(402).json({
          error:          'OUTLET_LIMIT_REACHED',
          message:        `Your ${currentTier} plan covers up to ${limit} location${limit === 1 ? '' : 's'}. Upgrade to add more.`,
          currentTier,
          currentCount:   currentOutletCount,
          limit,
          upgradeTo:      upgradeTo ?? null,
          upgradePrice,
        });
        return;
      }

      // ── Create the pharmacy ─────────────────────────────────────────────────
      // The new outlet shares the owner's existing trial end date so all locations
      // expire together. If the owner's trial has already ended (they're ACTIVE),
      // the new location joins their account immediately with no trial.
      const ownerPharmacy = await prisma.pharmacyMembership.findFirst({
        where: { userId, role: 'OWNER', active: true },
        orderBy: { createdAt: 'asc' }, // oldest = primary pharmacy
        select: {
          pharmacy: {
            select: { status: true, trialActive: true, trialEndsAt: true, subscriptionTier: true },
          },
        },
      });

      const primaryPharmacy  = ownerPharmacy?.pharmacy;
      const trialStartsAt    = new Date();
      const isOwnerInTrial   = primaryPharmacy?.trialActive && primaryPharmacy?.status === 'TRIAL';
      // Share the same trial expiry as the primary pharmacy, or fall back to a fresh 14 days
      const trialEndsAt      = isOwnerInTrial && primaryPharmacy?.trialEndsAt
        ? primaryPharmacy.trialEndsAt
        : new Date(trialStartsAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const newStatus        = isOwnerInTrial ? 'TRIAL' : 'ACTIVE';
      const newTrialActive   = isOwnerInTrial;

      const savedType     = data.pharmacyType as 'ADDO' | 'RETAIL';
      const tier          = data.pharmacyType === 'ADDO' ? 'ADDO' : 'ESSENTIAL';
      const licenceNumber = data.licenceNumber?.trim() || `PENDING-${Date.now()}`;

      const result = await withPrismaRetry(() => prisma.$transaction(async (tx) => {
        const pharmacy = await tx.pharmacy.create({
          data: {
            name:             data.name,
            licenceNumber,
            address:          data.address,
            region:           data.region,
            pharmacyType:     savedType,
            subscriptionTier: tier as any,
            status:           newStatus,
            trialActive:      newTrialActive,
            trialStartsAt,
            trialEndsAt,
            isActive:         true,
          },
        });
        await tx.pharmacyMembership.create({
          data: {
            userId,
            pharmacyId: pharmacy.id,
            role:       'OWNER',
            active:     true,
            validFrom:  new Date(),
            createdBy:  userId,
          },
        });
        return pharmacy;
      }));

      sendFounderNotification({
        pharmacyName: result.name,
        ownerName:    req.user!.email,
        ownerEmail:   req.user!.email,
        region:       result.region,
        pharmacyType: result.pharmacyType,
        tier:         result.subscriptionTier,
      }).catch(() => {});

      res.status(201).json({
        data: {
          id:           result.id,
          name:         result.name,
          pharmacyType: result.pharmacyType,
          region:       result.region,
          status:       result.status,
          trialEndsAt:  result.trialEndsAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
