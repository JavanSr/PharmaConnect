import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole } from '../../middleware/auth';
import type { AuthRequest } from '../../middleware/auth';
import { requirePermission, canAccessHybridDashboards } from '../../middleware/permissions';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import { APP_ROLES } from '../../types/roles';
import { ensurePaymentMethodConfig, PAYMENT_METHOD_CONFIG_KEY } from './payment-method-config';
import { mapUserRoleToMembershipRole } from '../auth/pharmacy-membership.service';
import { trackFeatureTelemetry } from '../telemetry/feature-telemetry.service';
import {
  buildSubscriptionCheckoutUrl,
  generateSubscriptionReference,
  getSubscriptionPrice,
  isSelfServiceTier,
  isSubscriptionWebhookConfigured,
  subscriptionProviderName,
} from '../subscription/subscription-payments.service';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

const uid = (req: AuthRequest) => req.user!.userId;
function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}
const jsonValueSchema: z.ZodType = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(jsonValueSchema),
]));
const pharmacySettingValueSchema = z.record(jsonValueSchema);

settingsRouter.get('/subscription', async (req: AuthRequest, res, next) => {
  try {
    const pharmacy = await withPrismaRetry(() => prisma.pharmacy.findUnique({
      where: { id: pid(req) },
      select: {
        id: true,
        name: true,
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
      },
    }));

    if (!pharmacy) {
      res.status(404).json({ error: 'Pharmacy not found' });
      return;
    }

    const trialEndedByDate = pharmacy.status === 'TRIAL' && pharmacy.trialEndsAt < new Date();
    if (trialEndedByDate && pharmacy.trialActive) {
      void prisma.pharmacy.update({
        where: { id: pharmacy.id },
        data: { trialActive: false },
      }).catch((error) => console.error('[settings.subscription.trialExpireUpdateFailed]', error));
    }

    res.json({
      data: {
        ...pharmacy,
        trialActive: pharmacy.trialActive && !trialEndedByDate,
        dashboardAccess: canAccessHybridDashboards(req.user!.role, pharmacy),
      },
    });
  } catch (e) {
    next(e);
  }
});

const subscriptionPaymentRequestSelect = {
  id: true,
  pharmacyId: true,
  requestedTier: true,
  billingCycle: true,
  amount: true,
  paymentMethod: true,
  transactionRef: true,
  provider: true,
  providerReference: true,
  checkoutUrl: true,
  payerPhone: true,
  note: true,
  status: true,
  reviewedAt: true,
  reviewNote: true,
  paidUntil: true,
  createdAt: true,
} as const;

settingsRouter.get('/subscription/payment-requests', requireRole('OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const requests = await prisma.subscriptionPaymentRequest.findMany({
      where: { pharmacyId: pid(req) },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: subscriptionPaymentRequestSelect,
    });

    res.json({ data: requests });
  } catch (e) {
    next(e);
  }
});

settingsRouter.post('/subscription/payment-requests', requireRole('OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      requestedTier: z.enum(['ADDO', 'ESSENTIAL', 'ADDO_PLUS', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE']),
      billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
      amount: z.coerce.number().positive(),
      paymentMethod: z.string().trim().min(2).max(80),
      transactionRef: z.string().trim().min(3).max(120),
      payerPhone: z.string().trim().min(7).max(40).optional().or(z.literal('')),
      note: z.string().trim().max(500).optional().or(z.literal('')),
    }).parse(req.body);

    const request = await prisma.subscriptionPaymentRequest.create({
      data: {
        pharmacyId: pid(req),
        requestedBy: uid(req),
        requestedTier: data.requestedTier,
        billingCycle: data.billingCycle,
        amount: new Prisma.Decimal(data.amount),
        paymentMethod: data.paymentMethod,
        transactionRef: data.transactionRef,
        payerPhone: data.payerPhone || null,
        note: data.note || null,
      },
      select: subscriptionPaymentRequestSelect,
    });

    res.status(201).json({ data: request });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      res.status(409).json({ error: 'PAYMENT_REFERENCE_ALREADY_SUBMITTED' });
      return;
    }
    next(e);
  }
});

settingsRouter.post('/subscription/checkout', requireRole('OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      requestedTier: z.string().trim(),
      billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
      payerPhone: z.string().trim().min(7).max(40),
    }).parse(req.body);

    if (!isSelfServiceTier(data.requestedTier)) {
      throw Object.assign(new Error('This tier is not available for self-service checkout'), {
        status: 400,
        code: 'TIER_NOT_SELF_SERVICE',
      });
    }

    const amount = getSubscriptionPrice(data.requestedTier, data.billingCycle);
    const reference = generateSubscriptionReference();
    const provider = subscriptionProviderName();
    const checkoutUrl = buildSubscriptionCheckoutUrl({
      reference,
      amount,
      tier: data.requestedTier,
      billingCycle: data.billingCycle,
      payerPhone: data.payerPhone,
    });

    const request = await prisma.subscriptionPaymentRequest.create({
      data: {
        pharmacyId: pid(req),
        requestedBy: uid(req),
        requestedTier: data.requestedTier,
        billingCycle: data.billingCycle,
        amount: new Prisma.Decimal(amount),
        paymentMethod: 'SELF_SERVICE_CHECKOUT',
        transactionRef: reference,
        provider,
        checkoutUrl,
        payerPhone: data.payerPhone,
        note: isSubscriptionWebhookConfigured()
          ? 'Self-service checkout awaiting provider confirmation.'
          : 'Self-service checkout created, but provider webhook secret is not configured.',
      },
      select: subscriptionPaymentRequestSelect,
    });

    res.status(201).json({
      data: {
        request,
        provider,
        providerReady: isSubscriptionWebhookConfigured(),
        checkoutUrl,
        instructions: checkoutUrl
          ? 'Open the payment link and complete payment. Access activates after provider confirmation.'
          : 'Use the reference with your configured payment provider. Access activates after provider confirmation.',
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      res.status(409).json({ error: 'PAYMENT_REFERENCE_ALREADY_SUBMITTED' });
      return;
    }
    next(e);
  }
});

settingsRouter.use(enforceTrialRestrictions);

settingsRouter.patch('/subscription/vfd', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    const updated = await prisma.pharmacy.update({
      where: { id: pid(req) },
      data: { vfdEnabled: enabled },
      select: {
        id: true,
        vfdEnabled: true,
      },
    });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

const pharmacySettingKeySchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9._-]+$/i);

settingsRouter.get('/config/:key', requirePermission('settings.manage_subscription'), async (req: AuthRequest, res, next) => {
  try {
    const key = pharmacySettingKeySchema.parse(req.params.key);
    const setting = key === PAYMENT_METHOD_CONFIG_KEY
      ? await ensurePaymentMethodConfig(pid(req), uid(req))
      : await prisma.pharmacySetting.findUnique({
          where: {
            pharmacyId_key: {
              pharmacyId: pid(req),
              key,
            },
          },
          select: {
            id: true,
            key: true,
            value: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    res.json({
      data: setting ?? {
        key,
        value: null,
      },
    });
  } catch (e) {
    next(e);
  }
});

settingsRouter.put('/config/:key', requirePermission('settings.manage_subscription'), async (req: AuthRequest, res, next) => {
  try {
    const key = pharmacySettingKeySchema.parse(req.params.key);
    const payload = z.object({
      value: pharmacySettingValueSchema,
    }).parse(req.body);
    const value = payload.value as Prisma.InputJsonObject;

    const setting = await prisma.pharmacySetting.upsert({
      where: {
        pharmacyId_key: {
          pharmacyId: pid(req),
          key,
        },
      },
      update: {
        value,
      },
      create: {
        pharmacyId: pid(req),
        key,
        value,
        createdBy: uid(req),
      },
      select: {
        id: true,
        key: true,
        value: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (key === PAYMENT_METHOD_CONFIG_KEY) {
      const methods = Array.isArray((payload.value as Record<string, unknown>).methods)
        ? ((payload.value as Record<string, unknown>).methods as unknown[])
        : [];
      await trackFeatureTelemetry({
        pharmacyId: pid(req),
        userId: uid(req),
        featureKey: 'payment_methods',
        eventType: 'ACTIVATED',
        metadata: {
          methodCount: methods.length,
        },
      });
    }

    res.json({ data: setting });
  } catch (e) {
    next(e);
  }
});

settingsRouter.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: uid(req) },
      include: { pharmacy: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { password: _pw, ...safe } = user;
    res.json({ data: safe });
  } catch (e) {
    next(e);
  }
});

settingsRouter.put('/profile', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().min(7).optional(),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({ where: { id: uid(req) }, data });
    const { password: _pw, ...safe } = user;
    res.json({ data: safe });
  } catch (e) {
    next(e);
  }
});

settingsRouter.post('/change-password', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: uid(req) } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: uid(req) },
      data: {
        password: hashed,
        lastPasswordChangeAt: new Date(),
        mustChangePassword: false,
      },
    });
    res.json({ data: { message: 'Password changed successfully' } });
  } catch (e) {
    next(e);
  }
});

settingsRouter.get('/team', requirePermission('settings.manage_team'), async (req: AuthRequest, res, next) => {
  try {
    const memberships = await prisma.pharmacyMembership.findMany({
      where: {
        pharmacyId: pid(req),
        active: true,
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
            mustChangePassword: true,
            lastLogin: true,
            createdAt: true,
          },
        },
      },
      orderBy: { user: { firstName: 'asc' } },
    });
    res.json({
      data: memberships.map((membership) => ({
        ...membership.user,
        role: membership.role,
      })),
    });
  } catch (e) {
    next(e);
  }
});

settingsRouter.post('/team/invite', requirePermission('settings.manage_team'), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(7).optional(),
      role: z.enum(APP_ROLES),
      password: z.string().min(8),
      mustChangePassword: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    const hashed = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        role: data.role,
        password: hashed,
        pharmacyId: pid(req),
        mustChangePassword: data.mustChangePassword ?? true,
        lastPasswordChangeAt: new Date(),
      },
    });
    await prisma.pharmacyMembership.create({
      data: {
        userId: user.id,
        pharmacyId: pid(req),
        role: mapUserRoleToMembershipRole(data.role),
        active: true,
        validFrom: new Date(),
        createdBy: uid(req),
      },
    });
    const { password: _pw, ...safe } = user;
    res.status(201).json({ data: { ...safe, role: mapUserRoleToMembershipRole(data.role) } });
  } catch (e) {
    next(e);
  }
});

settingsRouter.patch('/team/:id/role', requirePermission('settings.manage_team'), async (req: AuthRequest, res, next) => {
  try {
    const { role } = z.object({ role: z.enum(APP_ROLES) }).parse(req.body);
    const membership = await prisma.pharmacyMembership.findFirst({
      where: {
        userId: req.params.id,
        pharmacyId: pid(req),
      },
    });
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || !membership) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    await prisma.pharmacyMembership.update({
      where: { userId_pharmacyId: { userId: req.params.id, pharmacyId: pid(req) } },
      data: { role: mapUserRoleToMembershipRole(role) },
    });
    const { password: _pw, ...safe } = updated;
    res.json({ data: { ...safe, role: mapUserRoleToMembershipRole(role) } });
  } catch (e) {
    next(e);
  }
});

settingsRouter.patch('/team/:id/deactivate', requireRole('OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id === uid(req)) {
      res.status(400).json({ error: 'Cannot deactivate your own account' });
      return;
    }
    const membership = await prisma.pharmacyMembership.findFirst({
      where: {
        userId: req.params.id,
        pharmacyId: pid(req),
      },
    });
    if (!membership) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await prisma.pharmacyMembership.update({
      where: { userId_pharmacyId: { userId: req.params.id, pharmacyId: pid(req) } },
      data: { active: false },
    });
    res.json({ data: { message: 'User deactivated' } });
  } catch (e) {
    next(e);
  }
});
