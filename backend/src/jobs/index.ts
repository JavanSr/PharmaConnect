import cron from 'node-cron';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { AlertChannel, ComplianceStatus, UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import redisClient from '../lib/redis';
import { logger } from '../lib/logger';
import { SmsService } from '../services/sms.service';
import { EmailService } from '../services/email.service';
import { VfdService } from '../services/vfd.service';

const smsService = new SmsService();
const emailService = new EmailService();
const vfdService = new VfdService();

const EAT_TIMEZONE = 'Africa/Nairobi';
const EXPIRY_ALERT_DAYS = [90, 60, 30, 7, 1] as const;

// ─── Expiry Alert Job ─────────────────────────────────────────────────────────

/**
 * Daily at 06:00 EAT — Check for batches expiring in [1,7,30,60,90] days.
 * Send SMS to Pharmacist In-Charge and Owner.
 * Log to AlertLog (prevent duplicate same-day alerts).
 */
async function runExpiryAlerts(days: number): Promise<void> {
  logger.info(`Jobs: Running expiry alerts for ${days} day(s)...`);
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(today);
  const secondsUntilEndOfDay = Math.max(
    1,
    Math.floor((todayEnd.getTime() - Date.now()) / 1000)
  );

  const targetDate = startOfDay(addDays(today, days));
  const targetDateEnd = endOfDay(addDays(today, days));

  try {
      const batches = await prisma.batch.findMany({
        where: {
          expiryDate: {
            gte: targetDate,
            lte: targetDateEnd,
          },
          quantityRemaining: { gt: 0 },
        },
        include: {
          product: true,
          pharmacy: {
            include: {
              users: {
                where: {
                  role: {
                    in: [UserRole.PHARMACIST_IN_CHARGE, UserRole.OWNER],
                  },
                  isActive: true,
                },
              },
            },
          },
        },
      });

      for (const batch of batches) {
        const dedupeKey = `alert:expiry:${batch.id}:${days}:${today.toISOString().split('T')[0]}`;
        const [alreadySent, existingAlert] = await Promise.all([
          redisClient.get(dedupeKey),
          prisma.alertLog.findFirst({
            where: {
              type: 'BATCH_EXPIRY',
              targetId: batch.id,
              channel: AlertChannel.SMS,
              pharmacyId: batch.pharmacyId,
              sentAt: { gte: today, lte: todayEnd },
            },
          }),
        ]);

        if (alreadySent || existingAlert) {
          logger.debug(
            `Jobs: Expiry alert already sent today for batch ${batch.id} (${days}d)`
          );
          continue;
        }

        const recipients = batch.pharmacy.users
          .filter((u) => u.isActive)
          .map((u) => u.email);

        if (recipients.length === 0) {
          logger.warn(`Jobs: No recipients for pharmacy ${batch.pharmacyId}`);
          continue;
        }

        const message = `[PharmaConnect] EXPIRY: ${batch.product.name} (Batch: ${batch.batchNumber}) at ${batch.pharmacy.name} expires in ${days} day(s). Qty: ${batch.quantityRemaining} ${batch.product.unitOfMeasure}.`;

        // Log to AlertLog
        await prisma.alertLog.create({
          data: {
            type: 'BATCH_EXPIRY',
            targetId: batch.id,
            channel: AlertChannel.SMS,
            pharmacyId: batch.pharmacyId,
            metadata: {
              daysUntilExpiry: days,
              batchNumber: batch.batchNumber,
              productName: batch.product.name,
              quantity: batch.quantityRemaining,
            },
          },
        });

        // Send SMS (we don't have phone numbers in User model, so send to emails via SMS alert)
        // In production, User model would have a phone field; log this as a warning
        logger.warn(
          `Jobs: User model has no phone field. Sending expiry alert email instead for batch ${batch.id}`
        );

        for (const email of recipients) {
          try {
            await emailService.sendEmail(
              email,
              `Expiry Alert: ${batch.product.name} expires in ${days} day(s) — ${batch.pharmacy.name}`,
              `<p><strong>[PharmaConnect]</strong> ${message}</p>`
            );
          } catch (err) {
            logger.error(`Jobs: Failed to send expiry alert to ${email}:`, err);
          }
        }

        await redisClient.setex(dedupeKey, secondsUntilEndOfDay, '1');

        logger.info(
          `Jobs: Expiry alert sent for batch ${batch.id} (${batch.product.name}, ${days}d)`
        );
      }
  } catch (err) {
    logger.error(`Jobs: Error processing expiry alerts for ${days} days:`, err);
  }

  logger.info(`Jobs: Expiry alerts completed for ${days} day(s)`);
}

// ─── Compliance Alert Job ─────────────────────────────────────────────────────

/**
 * Daily at 06:00 EAT — Check for compliance items expiring in [90,60,30,14,7,3,1] days
 * or already expired. Send SMS + Email + In-app. Log to ComplianceAlert.
 */
async function runComplianceAlerts(): Promise<void> {
  logger.info('Jobs: Running compliance alerts...');
  const ALERT_DAYS = [90, 60, 30, 14, 7, 3, 1];
  const today = startOfDay(new Date());

  for (const days of ALERT_DAYS) {
    const targetDate = startOfDay(addDays(today, days));
    const targetDateEnd = endOfDay(addDays(today, days));

    try {
      const items = await prisma.complianceItem.findMany({
        where: {
          expiryDate: {
            gte: targetDate,
            lte: targetDateEnd,
          },
          status: { not: ComplianceStatus.EXPIRED },
        },
        include: {
          pharmacy: {
            include: {
              users: {
                where: {
                  role: { in: [UserRole.PHARMACIST_IN_CHARGE, UserRole.OWNER] },
                  isActive: true,
                },
              },
            },
          },
        },
      });

      for (const item of items) {
        const dedupeKey = `alert:compliance:${item.id}:${days}:${today.toISOString().split('T')[0]}`;
        const alreadySent = await redisClient.get(dedupeKey);
        if (alreadySent) continue;

        // Log ComplianceAlert for each channel
        for (const channel of [AlertChannel.SMS, AlertChannel.EMAIL, AlertChannel.IN_APP]) {
          await prisma.complianceAlert.create({
            data: {
              complianceItemId: item.id,
              channel,
              daysBeforeExpiry: days,
              delivered: false,
            },
          });
        }

        const recipients = item.pharmacy.users.map((u) => u.email);

        for (const email of recipients) {
          try {
            await emailService.sendComplianceAlertEmail(
              email,
              item.name,
              days,
              item.pharmacy.name
            );

            // Mark email alert as delivered
            await prisma.complianceAlert.updateMany({
              where: {
                complianceItemId: item.id,
                channel: AlertChannel.EMAIL,
                delivered: false,
              },
              data: { delivered: true, deliveredAt: new Date() },
            });
          } catch (err) {
            logger.error(`Jobs: Failed compliance email to ${email}:`, err);
          }
        }

        const secondsUntilEndOfDay = Math.floor(
          (endOfDay(today).getTime() - Date.now()) / 1000
        );
        await redisClient.setex(dedupeKey, secondsUntilEndOfDay, '1');

        logger.info(
          `Jobs: Compliance alert sent for ${item.name} (${item.pharmacy.name}, ${days}d)`
        );
      }
    } catch (err) {
      logger.error(`Jobs: Error in compliance alerts for ${days} days:`, err);
    }
  }

  // Also handle already-expired items
  try {
    const expiredItems = await prisma.complianceItem.findMany({
      where: {
        expiryDate: { lt: today },
        status: { not: ComplianceStatus.EXPIRED },
      },
      include: {
        pharmacy: {
          include: {
            users: {
              where: {
                role: { in: [UserRole.PHARMACIST_IN_CHARGE, UserRole.OWNER] },
                isActive: true,
              },
            },
          },
        },
      },
    });

    for (const item of expiredItems) {
      const dedupeKey = `alert:compliance:expired:${item.id}:${today.toISOString().split('T')[0]}`;
      const alreadySent = await redisClient.get(dedupeKey);
      if (alreadySent) continue;

      for (const channel of [AlertChannel.SMS, AlertChannel.EMAIL, AlertChannel.IN_APP]) {
        await prisma.complianceAlert.create({
          data: {
            complianceItemId: item.id,
            channel,
            daysBeforeExpiry: 0,
            delivered: false,
          },
        });
      }

      const recipients = item.pharmacy.users.map((u) => u.email);
      for (const email of recipients) {
        try {
          await emailService.sendComplianceAlertEmail(email, item.name, 0, item.pharmacy.name);
        } catch (err) {
          logger.error(`Jobs: Failed expired compliance email to ${email}:`, err);
        }
      }

      const secondsUntilEndOfDay = Math.floor(
        (endOfDay(today).getTime() - Date.now()) / 1000
      );
      await redisClient.setex(dedupeKey, secondsUntilEndOfDay, '1');
    }
  } catch (err) {
    logger.error('Jobs: Error processing expired compliance items:', err);
  }

  logger.info('Jobs: Compliance alerts completed');
}

// ─── Update Compliance Statuses Job ──────────────────────────────────────────

/**
 * Nightly — Recompute GREEN/AMBER/RED/EXPIRED for all compliance items.
 * GREEN: > 90 days
 * AMBER: 31–90 days
 * RED: 1–30 days
 * EXPIRED: <= 0 days
 */
async function updateComplianceStatuses(): Promise<void> {
  logger.info('Jobs: Updating compliance statuses...');
  const today = startOfDay(new Date());

  try {
    const allItems = await prisma.complianceItem.findMany({
      select: { id: true, expiryDate: true },
    });

    const updates: Array<{ id: string; status: ComplianceStatus }> = [];

    for (const item of allItems) {
      const daysUntilExpiry = Math.floor(
        (item.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let newStatus: ComplianceStatus;
      if (daysUntilExpiry <= 0) {
        newStatus = ComplianceStatus.EXPIRED;
      } else if (daysUntilExpiry <= 30) {
        newStatus = ComplianceStatus.RED;
      } else if (daysUntilExpiry <= 90) {
        newStatus = ComplianceStatus.AMBER;
      } else {
        newStatus = ComplianceStatus.GREEN;
      }

      updates.push({ id: item.id, status: newStatus });
    }

    // Batch updates using Promise.all for performance
    await Promise.all(
      updates.map(({ id, status }) =>
        prisma.complianceItem.update({
          where: { id },
          data: { status },
        })
      )
    );

    logger.info(`Jobs: Updated ${updates.length} compliance item statuses`);
  } catch (err) {
    logger.error('Jobs: Error updating compliance statuses:', err);
  }
}

// ─── Weekly Digest Job ────────────────────────────────────────────────────────

/**
 * Mondays at 07:00 EAT — Send weekly digest to all active subscribers.
 */
async function runWeeklyDigest(): Promise<void> {
  logger.info('Jobs: Running weekly digest...');

  try {
    const [subscribers, articles] = await Promise.all([
      prisma.subscriber.findMany({
        where: { isActive: true },
        select: { email: true },
      }),
      prisma.article.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: {
            gte: addDays(new Date(), -7),
          },
        },
        include: {
          author: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      }),
    ]);

    const subscriberEmails = subscribers.map((s) => s.email);
    const articleSummaries = articles.map((a) => ({
      title: a.title,
      slug: a.slug,
      category: a.category,
      readingTimeMinutes: a.readingTimeMinutes,
      featuredImage: a.featuredImage ?? undefined,
      authorName: a.author
        ? `${a.author.firstName} ${a.author.lastName}`
        : undefined,
    }));

    await emailService.sendWeeklyDigest(subscriberEmails, articleSummaries);
    logger.info(
      `Jobs: Weekly digest sent to ${subscriberEmails.length} subscribers with ${articleSummaries.length} articles`
    );
  } catch (err) {
    logger.error('Jobs: Error running weekly digest:', err);
  }
}

// ─── VFD Queue Processor ──────────────────────────────────────────────────────

/**
 * Every 5 minutes — Retry QUEUED VFD receipts.
 */
async function processVfdQueue(): Promise<void> {
  logger.debug('Jobs: Processing VFD queue...');

  try {
    const queuedIds = await vfdService.getQueuedEventIds();

    if (queuedIds.length === 0) {
      logger.debug('Jobs: VFD queue is empty');
      return;
    }

    logger.info(`Jobs: Found ${queuedIds.length} queued VFD receipts to retry`);

    for (const dispensingEventId of queuedIds) {
      try {
        const result = await vfdService.retryQueuedReceipt(dispensingEventId);

        if (result.status === 'SUCCESS' && result.receiptNumber) {
          // Update the dispensing event with the receipt number
          await prisma.dispensingEvent.update({
            where: { id: dispensingEventId },
            data: {
              vfdReceiptNumber: result.receiptNumber,
              vfdStatus: 'SUCCESS',
            },
          });

          logger.info(
            `Jobs: VFD receipt generated for event ${dispensingEventId}: ${result.receiptNumber}`
          );
        }
      } catch (err) {
        logger.error(`Jobs: Failed to retry VFD receipt for event ${dispensingEventId}:`, err);
        // Will retry on next run
      }
    }
  } catch (err) {
    logger.error('Jobs: Error processing VFD queue:', err);
  }
}

// ─── Job Initialization ───────────────────────────────────────────────────────

export function initJobs(): void {
  logger.info('Jobs: Initializing scheduled jobs...');

  // Expiry alerts: daily at 06:00 EAT
  cron.schedule(
    '0 6 * * *',
    async () => {
      try {
        for (const days of EXPIRY_ALERT_DAYS) {
          await runExpiryAlerts(days);
        }
      } catch (err) {
        logger.error('Jobs: Unhandled error in expiry alerts job:', err);
      }
    },
    { timezone: EAT_TIMEZONE }
  );

  // Compliance alerts: daily at 06:00 EAT
  cron.schedule(
    '0 6 * * *',
    async () => {
      try {
        await runComplianceAlerts();
      } catch (err) {
        logger.error('Jobs: Unhandled error in compliance alerts job:', err);
      }
    },
    { timezone: EAT_TIMEZONE }
  );

  // Update compliance statuses: nightly at 00:00 EAT
  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        await updateComplianceStatuses();
      } catch (err) {
        logger.error('Jobs: Unhandled error in compliance status update job:', err);
      }
    },
    { timezone: EAT_TIMEZONE }
  );

  // Weekly digest: Mondays at 07:00 EAT
  cron.schedule(
    '0 7 * * 1',
    async () => {
      try {
        await runWeeklyDigest();
      } catch (err) {
        logger.error('Jobs: Unhandled error in weekly digest job:', err);
      }
    },
    { timezone: EAT_TIMEZONE }
  );

  // VFD queue processor: every 5 minutes
  cron.schedule(
    '*/5 * * * *',
    async () => {
      try {
        await processVfdQueue();
      } catch (err) {
        logger.error('Jobs: Unhandled error in VFD queue processor:', err);
      }
    },
    { timezone: EAT_TIMEZONE }
  );

  logger.info('Jobs: All scheduled jobs initialized successfully');
}

export {
  runExpiryAlerts,
  runComplianceAlerts,
  updateComplianceStatuses,
  runWeeklyDigest,
  processVfdQueue,
};

export default initJobs;
