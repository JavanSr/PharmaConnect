import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { sendSubscriptionPaymentFailedEmail } from '../../lib/email';
import { activateSubscriptionFromPayment } from './subscription-payments.service';

export const subscriptionRouter = Router();

function readWebhookSecret(headerValue: unknown): string {
  if (Array.isArray(headerValue)) {
    return headerValue[0] ?? '';
  }
  return typeof headerValue === 'string' ? headerValue : '';
}

function timingSafeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyWebhookSecret(reqSecret: string): boolean {
  const configured = (process.env.SUBSCRIPTION_PAYMENT_WEBHOOK_SECRET || '').trim();
  if (!configured) {
    return false;
  }

  return timingSafeEqualText(reqSecret, configured);
}

subscriptionRouter.post('/webhook', async (req, res, next) => {
  try {
    const headerSecret = readWebhookSecret(req.headers['x-apotekh-webhook-secret']);
    const bearerSecret = readWebhookSecret(req.headers.authorization).replace(/^Bearer\s+/i, '');
    if (!verifyWebhookSecret(headerSecret || bearerSecret)) {
      res.status(process.env.SUBSCRIPTION_PAYMENT_WEBHOOK_SECRET ? 401 : 503).json({
        error: process.env.SUBSCRIPTION_PAYMENT_WEBHOOK_SECRET
          ? 'WEBHOOK_UNAUTHORIZED'
          : 'SUBSCRIPTION_WEBHOOK_NOT_CONFIGURED',
      });
      return;
    }

    const payload = z.object({
      transactionRef: z.string().trim().min(3).max(120),
      status: z.enum(['PAID', 'CONFIRMED', 'SUCCESS', 'FAILED', 'CANCELLED', 'REJECTED']),
      amount: z.coerce.number().positive().optional(),
      providerReference: z.string().trim().max(120).optional(),
      pharmacyId: z.string().uuid().optional(),
      paidAt: z.coerce.date().optional(),
      paidUntil: z.coerce.date().optional(),
      message: z.string().trim().max(500).optional(),
    }).parse(req.body);

    const matches = await prisma.subscriptionPaymentRequest.findMany({
      where: {
        transactionRef: payload.transactionRef,
        ...(payload.pharmacyId ? { pharmacyId: payload.pharmacyId } : {}),
      },
      take: 2,
      select: {
        id: true,
        pharmacyId: true,
        amount: true,
        status: true,
        transactionRef: true,
        pharmacy: {
          select: {
            name: true,
          },
        },
        requester: {
          select: {
            firstName: true,
            email: true,
          },
        },
      },
    });

    if (matches.length === 0) {
      res.status(404).json({ error: 'PAYMENT_REFERENCE_NOT_FOUND' });
      return;
    }

    if (matches.length > 1) {
      res.status(409).json({ error: 'PAYMENT_REFERENCE_AMBIGUOUS' });
      return;
    }

    const request = matches[0];
    const isPaid = ['PAID', 'CONFIRMED', 'SUCCESS'].includes(payload.status);
    if (!isPaid) {
      const shouldNotifyFailure = request.status === 'PENDING';
      const updated = request.status === 'PENDING'
        ? await prisma.subscriptionPaymentRequest.update({
            where: { id: request.id },
            data: {
              status: 'REJECTED',
              reviewedAt: new Date(),
              reviewNote: payload.message || `Payment provider returned ${payload.status}.`,
              providerReference: payload.providerReference || undefined,
            },
        })
        : await prisma.subscriptionPaymentRequest.findUniqueOrThrow({ where: { id: request.id } });

      if (shouldNotifyFailure) {
        void sendSubscriptionPaymentFailedEmail({
          to: request.requester.email,
          firstName: request.requester.firstName,
          pharmacyName: request.pharmacy.name,
          reference: request.transactionRef,
          amount: Number(request.amount).toLocaleString(),
          reason: payload.message || `Payment provider returned ${payload.status}.`,
        }).catch((error) => console.error('[subscription.paymentFailedEmail.failed]', error));
      }

      res.json({ data: updated });
      return;
    }

    if (payload.amount != null && new Prisma.Decimal(payload.amount).lt(request.amount)) {
      res.status(422).json({ error: 'PAYMENT_AMOUNT_TOO_LOW' });
      return;
    }

    const updated = await prisma.$transaction((tx) =>
      activateSubscriptionFromPayment(tx, {
        requestId: request.id,
        paidUntil: payload.paidUntil,
        providerReference: payload.providerReference || null,
        reviewNote: payload.message || 'Confirmed automatically by payment provider.',
      }),
    );

    console.info('[subscription.webhook.confirmed]', {
      requestId: request.id,
      pharmacyId: request.pharmacyId,
      transactionRef: payload.transactionRef,
      providerReference: payload.providerReference ?? null,
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});
