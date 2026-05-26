// backend/src/modules/subscriptions/subscription.router.ts
//
// Mount this router in backend/src/index.ts:
//   import subscriptionRouter from './modules/subscriptions/subscription.router';
//   app.use('/subscriptions', subscriptionRouter);
//
// Webhook URL to register with Selcom: https://api.apotekh.co.tz/subscriptions/webhook/selcom
// ─────────────────────────────────────────────────────────────────────────────

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';     // adjust path to your auth middleware
import { requireRole }  from '../../middleware/requireRole';       // adjust if named differently
import {
  initiateSubscriptionPayment,
  handlePawapayWebhook,
  getSubscriptionSummary,
  adminActivatePlan,
  TIER_PRICES,
  TIER_LABELS,
} from './subscription.service';
import { SubscriptionTier }   from '@prisma/client';

const router = express.Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const initiateSchema = z.object({
  tier:          z.nativeEnum(SubscriptionTier),
  buyerPhone:    z.string().regex(/^255\d{9}$/, 'Phone must be in format 255XXXXXXXXX'),
  buyerEmail:    z.string().email().optional(),
  billingMonths: z.number().int().min(1).max(12).default(1),
});

const adminActivateSchema = z.object({
  pharmacyId:    z.string().min(1),
  tier:          z.nativeEnum(SubscriptionTier),
  billingMonths: z.number().int().min(1).max(12).default(1),
  note:          z.string().optional(),
});

// ── GET /subscriptions/plans — public, returns tier pricing ──────────────────

router.get('/plans', (_req: Request, res: Response) => {
  const plans = (Object.keys(TIER_PRICES) as SubscriptionTier[]).map((tier) => ({
    tier,
    label:     TIER_LABELS[tier],
    amountTzs: TIER_PRICES[tier],
    perMonth:  TIER_PRICES[tier],
    contactSales: tier === 'ENTERPRISE',
  }));
  res.json({ data: plans });
});

// ── GET /subscriptions/me — authenticated: current subscription state ─────────

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pharmacyId = req.pharmacy.id;
    const summary    = await getSubscriptionSummary(pharmacyId);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

// ── POST /subscriptions/initiate — start a payment ───────────────────────────

router.post('/initiate', authenticate, requireRole(['OWNER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = initiateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { tier, buyerPhone, buyerEmail, billingMonths } = parse.data;

    const result = await initiateSubscriptionPayment({
      pharmacyId:  req.pharmacy.id,
      tier,
      buyerPhone,
      buyerEmail,
      buyerName:   req.user.name,
      billingMonths,
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ── POST /subscriptions/webhook/pawapay — PawaPay payment callback ────────────
//
// PawaPay POSTs a JSON body when a deposit reaches a final state (COMPLETED or FAILED).
// No special signature verification is needed by default — the bearer token
// on outbound requests is sufficient. If you enable signed callbacks in the
// PawaPay dashboard, add RFC-9421 signature verification here.
//
// Register this callback URL in the PawaPay dashboard:
//   https://api.apotekh.co.tz/subscriptions/webhook/pawapay
//
// Whitelist PawaPay production IPs in Railway firewall (optional but recommended):
//   18.192.208.15, 18.195.113.136, 3.72.212.107, 54.73.125.42, 54.155.38.214, 54.73.130.113

router.post('/webhook/pawapay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as import('./pawapay.service').PawapayWebhookPayload;

    if (!payload.depositId || !payload.status) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    await handlePawapayWebhook(payload);

    // PawaPay expects a 200 response — anything else triggers retries
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[subscription] PawaPay webhook error:', err);
    res.status(200).json({ received: true }); // always 200 to stop retries
    next(err);
  }
});

// ── POST /subscriptions/admin/activate — manual activation (SUPER_ADMIN only) ─

router.post(
  '/admin/activate',
  authenticate,
  requireRole(['SUPER_ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parse = adminActivateSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ error: parse.error.flatten() });
      }

      await adminActivatePlan(parse.data);
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /subscriptions/admin/list — list all subscriptions (SUPER_ADMIN) ──────

router.get(
  '/admin/list',
  authenticate,
  requireRole(['SUPER_ADMIN']),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const subscriptions = await prisma.subscription.findMany({
        include: { pharmacy: { select: { id: true, name: true, subscriptionStatus: true } } },
        orderBy: { createdAt: 'desc' },
        take:    200,
      });
      res.json({ data: subscriptions });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
