"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initJobs = initJobs;
exports.runExpiryAlerts = runExpiryAlerts;
exports.runComplianceAlerts = runComplianceAlerts;
exports.updateComplianceStatuses = updateComplianceStatuses;
exports.runWeeklyDigest = runWeeklyDigest;
exports.processVfdQueue = processVfdQueue;
const node_cron_1 = __importDefault(require("node-cron"));
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../lib/prisma"));
const redis_1 = __importDefault(require("../lib/redis"));
const logger_1 = require("../lib/logger");
const sms_service_1 = require("../services/sms.service");
const email_service_1 = require("../services/email.service");
const vfd_service_1 = require("../services/vfd.service");
const smsService = new sms_service_1.SmsService();
const emailService = new email_service_1.EmailService();
const vfdService = new vfd_service_1.VfdService();
const EAT_TIMEZONE = 'Africa/Nairobi';
const EXPIRY_ALERT_DAYS = [90, 60, 30, 7, 1];
// ─── Expiry Alert Job ─────────────────────────────────────────────────────────
/**
 * Daily at 06:00 EAT — Check for batches expiring in [1,7,30,60,90] days.
 * Send SMS to Pharmacist In-Charge and Owner.
 * Log to AlertLog (prevent duplicate same-day alerts).
 */
async function runExpiryAlerts(days) {
    logger_1.logger.info(`Jobs: Running expiry alerts for ${days} day(s)...`);
    const today = (0, date_fns_1.startOfDay)(new Date());
    const todayEnd = (0, date_fns_1.endOfDay)(today);
    const secondsUntilEndOfDay = Math.max(1, Math.floor((todayEnd.getTime() - Date.now()) / 1000));
    const targetDate = (0, date_fns_1.startOfDay)((0, date_fns_1.addDays)(today, days));
    const targetDateEnd = (0, date_fns_1.endOfDay)((0, date_fns_1.addDays)(today, days));
    try {
        const batches = await prisma_1.default.batch.findMany({
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
                                    in: [client_1.UserRole.PHARMACIST_IN_CHARGE, client_1.UserRole.OWNER],
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
                redis_1.default.get(dedupeKey),
                prisma_1.default.alertLog.findFirst({
                    where: {
                        type: 'BATCH_EXPIRY',
                        targetId: batch.id,
                        channel: client_1.AlertChannel.SMS,
                        pharmacyId: batch.pharmacyId,
                        sentAt: { gte: today, lte: todayEnd },
                    },
                }),
            ]);
            if (alreadySent || existingAlert) {
                logger_1.logger.debug(`Jobs: Expiry alert already sent today for batch ${batch.id} (${days}d)`);
                continue;
            }
            const recipients = batch.pharmacy.users
                .filter((u) => u.isActive)
                .map((u) => u.email);
            if (recipients.length === 0) {
                logger_1.logger.warn(`Jobs: No recipients for pharmacy ${batch.pharmacyId}`);
                continue;
            }
            const message = `[PharmaConnect] EXPIRY: ${batch.product.name} (Batch: ${batch.batchNumber}) at ${batch.pharmacy.name} expires in ${days} day(s). Qty: ${batch.quantityRemaining} ${batch.product.unitOfMeasure}.`;
            // Log to AlertLog
            await prisma_1.default.alertLog.create({
                data: {
                    type: 'BATCH_EXPIRY',
                    targetId: batch.id,
                    channel: client_1.AlertChannel.SMS,
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
            logger_1.logger.warn(`Jobs: User model has no phone field. Sending expiry alert email instead for batch ${batch.id}`);
            for (const email of recipients) {
                try {
                    await emailService.sendEmail(email, `Expiry Alert: ${batch.product.name} expires in ${days} day(s) — ${batch.pharmacy.name}`, `<p><strong>[PharmaConnect]</strong> ${message}</p>`);
                }
                catch (err) {
                    logger_1.logger.error(`Jobs: Failed to send expiry alert to ${email}:`, err);
                }
            }
            await redis_1.default.setex(dedupeKey, secondsUntilEndOfDay, '1');
            logger_1.logger.info(`Jobs: Expiry alert sent for batch ${batch.id} (${batch.product.name}, ${days}d)`);
        }
    }
    catch (err) {
        logger_1.logger.error(`Jobs: Error processing expiry alerts for ${days} days:`, err);
    }
    logger_1.logger.info(`Jobs: Expiry alerts completed for ${days} day(s)`);
}
// ─── Compliance Alert Job ─────────────────────────────────────────────────────
/**
 * Daily at 06:00 EAT — Check for compliance items expiring in [90,60,30,14,7,3,1] days
 * or already expired. Send SMS + Email + In-app. Log to ComplianceAlert.
 */
async function runComplianceAlerts() {
    logger_1.logger.info('Jobs: Running compliance alerts...');
    const ALERT_DAYS = [90, 60, 30, 14, 7, 3, 1];
    const today = (0, date_fns_1.startOfDay)(new Date());
    for (const days of ALERT_DAYS) {
        const targetDate = (0, date_fns_1.startOfDay)((0, date_fns_1.addDays)(today, days));
        const targetDateEnd = (0, date_fns_1.endOfDay)((0, date_fns_1.addDays)(today, days));
        try {
            const items = await prisma_1.default.complianceItem.findMany({
                where: {
                    expiryDate: {
                        gte: targetDate,
                        lte: targetDateEnd,
                    },
                    status: { not: client_1.ComplianceStatus.EXPIRED },
                },
                include: {
                    pharmacy: {
                        include: {
                            users: {
                                where: {
                                    role: { in: [client_1.UserRole.PHARMACIST_IN_CHARGE, client_1.UserRole.OWNER] },
                                    isActive: true,
                                },
                            },
                        },
                    },
                },
            });
            for (const item of items) {
                const dedupeKey = `alert:compliance:${item.id}:${days}:${today.toISOString().split('T')[0]}`;
                const alreadySent = await redis_1.default.get(dedupeKey);
                if (alreadySent)
                    continue;
                // Log ComplianceAlert for each channel
                for (const channel of [client_1.AlertChannel.SMS, client_1.AlertChannel.EMAIL, client_1.AlertChannel.IN_APP]) {
                    await prisma_1.default.complianceAlert.create({
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
                        await emailService.sendComplianceAlertEmail(email, item.name, days, item.pharmacy.name);
                        // Mark email alert as delivered
                        await prisma_1.default.complianceAlert.updateMany({
                            where: {
                                complianceItemId: item.id,
                                channel: client_1.AlertChannel.EMAIL,
                                delivered: false,
                            },
                            data: { delivered: true, deliveredAt: new Date() },
                        });
                    }
                    catch (err) {
                        logger_1.logger.error(`Jobs: Failed compliance email to ${email}:`, err);
                    }
                }
                const secondsUntilEndOfDay = Math.floor(((0, date_fns_1.endOfDay)(today).getTime() - Date.now()) / 1000);
                await redis_1.default.setex(dedupeKey, secondsUntilEndOfDay, '1');
                logger_1.logger.info(`Jobs: Compliance alert sent for ${item.name} (${item.pharmacy.name}, ${days}d)`);
            }
        }
        catch (err) {
            logger_1.logger.error(`Jobs: Error in compliance alerts for ${days} days:`, err);
        }
    }
    // Also handle already-expired items
    try {
        const expiredItems = await prisma_1.default.complianceItem.findMany({
            where: {
                expiryDate: { lt: today },
                status: { not: client_1.ComplianceStatus.EXPIRED },
            },
            include: {
                pharmacy: {
                    include: {
                        users: {
                            where: {
                                role: { in: [client_1.UserRole.PHARMACIST_IN_CHARGE, client_1.UserRole.OWNER] },
                                isActive: true,
                            },
                        },
                    },
                },
            },
        });
        for (const item of expiredItems) {
            const dedupeKey = `alert:compliance:expired:${item.id}:${today.toISOString().split('T')[0]}`;
            const alreadySent = await redis_1.default.get(dedupeKey);
            if (alreadySent)
                continue;
            for (const channel of [client_1.AlertChannel.SMS, client_1.AlertChannel.EMAIL, client_1.AlertChannel.IN_APP]) {
                await prisma_1.default.complianceAlert.create({
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
                }
                catch (err) {
                    logger_1.logger.error(`Jobs: Failed expired compliance email to ${email}:`, err);
                }
            }
            const secondsUntilEndOfDay = Math.floor(((0, date_fns_1.endOfDay)(today).getTime() - Date.now()) / 1000);
            await redis_1.default.setex(dedupeKey, secondsUntilEndOfDay, '1');
        }
    }
    catch (err) {
        logger_1.logger.error('Jobs: Error processing expired compliance items:', err);
    }
    logger_1.logger.info('Jobs: Compliance alerts completed');
}
// ─── Update Compliance Statuses Job ──────────────────────────────────────────
/**
 * Nightly — Recompute GREEN/AMBER/RED/EXPIRED for all compliance items.
 * GREEN: > 90 days
 * AMBER: 31–90 days
 * RED: 1–30 days
 * EXPIRED: <= 0 days
 */
async function updateComplianceStatuses() {
    logger_1.logger.info('Jobs: Updating compliance statuses...');
    const today = (0, date_fns_1.startOfDay)(new Date());
    try {
        const allItems = await prisma_1.default.complianceItem.findMany({
            select: { id: true, expiryDate: true },
        });
        const updates = [];
        for (const item of allItems) {
            const daysUntilExpiry = Math.floor((item.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            let newStatus;
            if (daysUntilExpiry <= 0) {
                newStatus = client_1.ComplianceStatus.EXPIRED;
            }
            else if (daysUntilExpiry <= 30) {
                newStatus = client_1.ComplianceStatus.RED;
            }
            else if (daysUntilExpiry <= 90) {
                newStatus = client_1.ComplianceStatus.AMBER;
            }
            else {
                newStatus = client_1.ComplianceStatus.GREEN;
            }
            updates.push({ id: item.id, status: newStatus });
        }
        // Batch updates using Promise.all for performance
        await Promise.all(updates.map(({ id, status }) => prisma_1.default.complianceItem.update({
            where: { id },
            data: { status },
        })));
        logger_1.logger.info(`Jobs: Updated ${updates.length} compliance item statuses`);
    }
    catch (err) {
        logger_1.logger.error('Jobs: Error updating compliance statuses:', err);
    }
}
// ─── Weekly Digest Job ────────────────────────────────────────────────────────
/**
 * Mondays at 07:00 EAT — Send weekly digest to all active subscribers.
 */
async function runWeeklyDigest() {
    logger_1.logger.info('Jobs: Running weekly digest...');
    try {
        const [subscribers, articles] = await Promise.all([
            prisma_1.default.subscriber.findMany({
                where: { isActive: true },
                select: { email: true },
            }),
            prisma_1.default.article.findMany({
                where: {
                    status: 'PUBLISHED',
                    publishedAt: {
                        gte: (0, date_fns_1.addDays)(new Date(), -7),
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
        logger_1.logger.info(`Jobs: Weekly digest sent to ${subscriberEmails.length} subscribers with ${articleSummaries.length} articles`);
    }
    catch (err) {
        logger_1.logger.error('Jobs: Error running weekly digest:', err);
    }
}
// ─── VFD Queue Processor ──────────────────────────────────────────────────────
/**
 * Every 5 minutes — Retry QUEUED VFD receipts.
 */
async function processVfdQueue() {
    logger_1.logger.debug('Jobs: Processing VFD queue...');
    try {
        const queuedIds = await vfdService.getQueuedEventIds();
        if (queuedIds.length === 0) {
            logger_1.logger.debug('Jobs: VFD queue is empty');
            return;
        }
        logger_1.logger.info(`Jobs: Found ${queuedIds.length} queued VFD receipts to retry`);
        for (const dispensingEventId of queuedIds) {
            try {
                const result = await vfdService.retryQueuedReceipt(dispensingEventId);
                if (result.status === 'SUCCESS' && result.receiptNumber) {
                    // Update the dispensing event with the receipt number
                    await prisma_1.default.dispensingEvent.update({
                        where: { id: dispensingEventId },
                        data: {
                            vfdReceiptNumber: result.receiptNumber,
                            vfdStatus: 'SUCCESS',
                        },
                    });
                    logger_1.logger.info(`Jobs: VFD receipt generated for event ${dispensingEventId}: ${result.receiptNumber}`);
                }
            }
            catch (err) {
                logger_1.logger.error(`Jobs: Failed to retry VFD receipt for event ${dispensingEventId}:`, err);
                // Will retry on next run
            }
        }
    }
    catch (err) {
        logger_1.logger.error('Jobs: Error processing VFD queue:', err);
    }
}
// ─── Job Initialization ───────────────────────────────────────────────────────
function initJobs() {
    logger_1.logger.info('Jobs: Initializing scheduled jobs...');
    // Expiry alerts: daily at 06:00 EAT
    node_cron_1.default.schedule('0 6 * * *', async () => {
        try {
            for (const days of EXPIRY_ALERT_DAYS) {
                await runExpiryAlerts(days);
            }
        }
        catch (err) {
            logger_1.logger.error('Jobs: Unhandled error in expiry alerts job:', err);
        }
    }, { timezone: EAT_TIMEZONE });
    // Compliance alerts: daily at 06:00 EAT
    node_cron_1.default.schedule('0 6 * * *', async () => {
        try {
            await runComplianceAlerts();
        }
        catch (err) {
            logger_1.logger.error('Jobs: Unhandled error in compliance alerts job:', err);
        }
    }, { timezone: EAT_TIMEZONE });
    // Update compliance statuses: nightly at 00:00 EAT
    node_cron_1.default.schedule('0 0 * * *', async () => {
        try {
            await updateComplianceStatuses();
        }
        catch (err) {
            logger_1.logger.error('Jobs: Unhandled error in compliance status update job:', err);
        }
    }, { timezone: EAT_TIMEZONE });
    // Weekly digest: Mondays at 07:00 EAT
    node_cron_1.default.schedule('0 7 * * 1', async () => {
        try {
            await runWeeklyDigest();
        }
        catch (err) {
            logger_1.logger.error('Jobs: Unhandled error in weekly digest job:', err);
        }
    }, { timezone: EAT_TIMEZONE });
    // VFD queue processor: every 5 minutes
    node_cron_1.default.schedule('*/5 * * * *', async () => {
        try {
            await processVfdQueue();
        }
        catch (err) {
            logger_1.logger.error('Jobs: Unhandled error in VFD queue processor:', err);
        }
    }, { timezone: EAT_TIMEZONE });
    logger_1.logger.info('Jobs: All scheduled jobs initialized successfully');
}
exports.default = initJobs;
//# sourceMappingURL=index.js.map