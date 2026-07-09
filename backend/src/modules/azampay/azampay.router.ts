/**
 * AzamPay router — two endpoints:
 *
 *   POST /api/v1/azampay/initiate  — authenticated, called by frontend checkout
 *   POST /api/v1/azampay/callback  — public, called by AzamPay on payment confirmation
 */

import crypto from 'crypto';
import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, type AuthRequest } from '../../middleware/auth';
import { activateSubscriptionFromPayment } from '../subscription/subscription-payments.service';
import {
  initiateAzamPayCheckout,
  isAzamPayConfigured,
} from './azampay.service';

export const azamPayRouter = Router();

// STK pushes ring a real person's phone — cap re-initiation attempts per pharmacy.
const initiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_PAYMENT_ATTEMPTS' },
  keyGenerator: (req) => {
    const r = req as AuthRequest;
    return `azampay-initiate:${r.user?.pharmacyId ?? r.user?.userId ?? 'anonymous'}`;
  },
});

/**
 * Callback authentication. Set AZAMPAY_CALLBACK_SECRET and register the callback
 * URL in the AzamPay dashboard as:
 *   https://<backend>/api/v1/azampay/callback?secret=<AZAMPAY_CALLBACK_SECRET>
 * (an `x-callback-secret` header is also accepted). Without the secret configured,
 * anyone who learns a pending APTK reference could forge a "success" POST.
 */
function callbackSecretConfigured(): boolean {
  return Boolean((process.env.AZAMPAY_CALLBACK_SECRET || '').trim());
}

function callbackSecretOk(req: Request): boolean {
  const expected = (process.env.AZAMPAY_CALLBACK_SECRET || '').trim();
  if (!expected) return true; // not configured — allowed, but logged loudly below
  const provided = String(req.query.secret ?? req.headers['x-callback-secret'] ?? '');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── POST /azampay/initiate ────────────────────────────────────────────────────
// Called by the frontend when user clicks "Pay via mobile money".
// Looks up the pending checkout request by reference and triggers STK push.
azamPayRouter.post('/initiate', authenticate, initiateLimiter, async (req: AuthRequest, res, next) => {
  try {
    if (!isAzamPayConfigured()) {
      res.status(503).json({ error: 'AZAMPAY_NOT_CONFIGURED' });
      return;
    }

    const { reference } = z.object({
      reference: z.string().trim().min(5),
    }).parse(req.body);

    // Find the pending checkout request
    const paymentRequest = await prisma.subscriptionPaymentRequest.findFirst({
      where: {
        transactionRef: reference,
        status: 'PENDING',
        paymentMethod: 'SELF_SERVICE_CHECKOUT',
      },
      select: {
        id: true,
        amount: true,
        payerPhone: true,
        transactionRef: true,
        pharmacyId: true,
      },
    });

    if (!paymentRequest) {
      res.status(404).json({ error: 'CHECKOUT_NOT_FOUND' });
      return;
    }

    // Only the owning pharmacy (or SUPER_ADMIN) may re-trigger the STK push —
    // knowing a reference must not let another account ring someone's phone.
    // 404 (not 403) so foreign references are indistinguishable from unknown ones.
    if (req.user?.role !== 'SUPER_ADMIN' && paymentRequest.pharmacyId !== req.user?.pharmacyId) {
      res.status(404).json({ error: 'CHECKOUT_NOT_FOUND' });
      return;
    }

    if (!paymentRequest.payerPhone) {
      res.status(400).json({ error: 'NO_PAYER_PHONE' });
      return;
    }

    const result = await initiateAzamPayCheckout({
      phone: paymentRequest.payerPhone,
      amount: Number(paymentRequest.amount),
      reference: paymentRequest.transactionRef,
    });

    // Store AzamPay's transactionId on the request for callback matching
    if (result.transactionId) {
      await prisma.subscriptionPaymentRequest.update({
        where: { id: paymentRequest.id },
        data: { providerReference: result.transactionId },
      });
    }

    if (!result.success) {
      res.status(502).json({
        error: 'AZAMPAY_CHECKOUT_FAILED',
        message: result.message,
      });
      return;
    }

    res.json({
      data: {
        success: true,
        message: result.message,
        transactionId: result.transactionId,
        instructions: 'A payment request has been sent to your phone. Enter your mobile money PIN to confirm.',
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── POST /azampay/callback ────────────────────────────────────────────────────
// Called by AzamPay when payment succeeds or fails. Public — no auth.
// AzamPay POSTs JSON with reference (our externalId), transactionStatus, etc.
azamPayRouter.post('/callback', async (req, res) => {
  try {
    // Authenticate the callback before touching anything. Forged requests get 401
    // (only legitimate AzamPay calls carry the registered secret, so 401 here
    // never interferes with real payment confirmations).
    if (!callbackSecretOk(req)) {
      console.warn('[azampay] callback rejected — missing/invalid callback secret', {
        ip: req.ip,
        reference: (req.body as Record<string, unknown>)?.reference,
      });
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    if (!callbackSecretConfigured()) {
      console.warn(
        '[azampay] AZAMPAY_CALLBACK_SECRET is not set — the payment callback is UNAUTHENTICATED. ' +
        'Set it and re-register the callback URL with ?secret=<value> in the AzamPay dashboard.',
      );
    }

    // AzamPay callback payload varies slightly by provider; capture all fields
    const body = req.body as Record<string, unknown>;

    console.info('[azampay] callback received', {
      reference: body.reference ?? body.externalId,
      transactionId: body.transactionId ?? body.transId,
      status: body.transactionStatus ?? body.paymentStatus ?? body.success,
    });

    // Normalise fields across MNO providers
    const reference = (body.reference ?? body.externalId ?? '') as string;
    const transactionId = (body.transactionId ?? body.transId ?? '') as string;
    const succeeded =
      body.transactionStatus === 'SUCCESS' ||
      body.paymentStatus === 'SUCCESS' ||
      body.success === true ||
      body.success === 'true' ||
      String(body.message ?? '').toLowerCase().includes('success');

    if (!reference) {
      console.warn('[azampay] callback missing reference — ignoring');
      res.json({ received: true }); // always 200 so AzamPay doesn't retry forever
      return;
    }

    if (!succeeded) {
      console.info('[azampay] callback — payment not successful', { reference, body });
      res.json({ received: true });
      return;
    }

    // Find the matching payment request
    const paymentRequest = await prisma.subscriptionPaymentRequest.findFirst({
      where: {
        transactionRef: reference,
        status: 'PENDING',
      },
      select: { id: true, pharmacyId: true, amount: true },
    });

    if (!paymentRequest) {
      console.warn('[azampay] callback — no matching PENDING request for reference', reference);
      res.json({ received: true });
      return;
    }

    // When the callback carries an amount, it must match what we asked for —
    // a confirmed 1,000 TZS payment must not activate a 75,000 TZS subscription.
    const callbackAmount = Number(body.amount ?? body.Amount ?? NaN);
    if (Number.isFinite(callbackAmount) && callbackAmount > 0) {
      const expectedAmount = Number(paymentRequest.amount);
      if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
        console.warn('[azampay] callback amount mismatch — NOT activating', {
          reference,
          expected: expectedAmount,
          received: callbackAmount,
        });
        res.json({ received: true });
        return;
      }
    }

    // Activate the subscription
    await prisma.$transaction(async (tx) => {
      await activateSubscriptionFromPayment(tx, {
        requestId: paymentRequest.id,
        providerReference: transactionId || undefined,
        reviewNote: `Confirmed automatically by AzamPay. Transaction ID: ${transactionId}`,
      });
    });

    // Notify the pharmacy owner in-app
    await prisma.notification.create({
      data: {
        pharmacyId: paymentRequest.pharmacyId,
        type: 'SUBSCRIPTION_ACTIVATED',
        title: 'Subscription activated',
        body: 'Your payment was confirmed and your subscription is now active. Thank you!',
        metadata: { reference, transactionId },
      },
    }).catch((err) => console.error('[azampay] notification create failed', err));

    console.info('[azampay] subscription activated', {
      pharmacyId: paymentRequest.pharmacyId,
      reference,
      transactionId,
    });

    res.json({ received: true, activated: true });
  } catch (err) {
    console.error('[azampay] callback error', err);
    // Still return 200 — don't cause AzamPay to retry a payment that may have activated
    res.json({ received: true, error: true });
  }
});
