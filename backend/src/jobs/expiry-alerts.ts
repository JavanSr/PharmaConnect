import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';
import { alertAlreadySentToday } from '../modules/inventory/inventory.service';
import { isSmsConfigured, sendExpiryAlert } from '../services/sms.service';

// ── Expiry alert thresholds (days before expiry) ──────────────────────────────
// Formula: daysUntilExpiry = Math.ceil((expiryDate - today) / 86_400_000)
//
// Threshold  Urgency    Action
// ─────────  ─────────  ──────────────────────────────────────────────────
//  30 days   INFO       Monitor — begin FEFO prioritisation
//  21 days   CAUTION    Review — verify batch is being dispensed first
//  14 days   WARNING    Escalate — contact supplier about return/credit
//   7 days   URGENT     Flag at counter — dispenser must be notified
//   1 day    CRITICAL   Remove from shelf if no sale expected today
//  <0 days   EXPIRED    Already expired — pull immediately, log disposal
// Primary thresholds match the UI urgency levels. 90/60/3 removed — too noisy with no action attached.
const EXPIRY_ALERT_WINDOWS = [30, 21, 14, 7, 1];

export function expiryUrgency(days: number): string {
  if (days < 0)    return 'EXPIRED';
  if (days <= 1)   return 'CRITICAL';
  if (days <= 7)   return 'URGENT';
  if (days <= 14)  return 'WARNING';
  if (days <= 21)  return 'CAUTION';
  if (days <= 30)  return 'INFO';
  return 'MONITOR';
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export async function runExpiryAlerts(): Promise<{ queued: number }> {
  const now = new Date();
  const today = startOfDay(now);
  const batches = await prisma.batch.findMany({
    where: {
      quantityRemaining: { gt: 0 },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          brandName: true,
        },
      },
      pharmacy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  let queued = 0;

  for (const batch of batches) {
    const expiry = startOfDay(batch.expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    const shouldAlert = daysUntilExpiry < 0 || EXPIRY_ALERT_WINDOWS.includes(daysUntilExpiry);

    if (!shouldAlert) {
      continue;
    }

    const existing = await alertAlreadySentToday(batch.pharmacyId, batch.id, 'SMS');
    if (existing) {
      continue;
    }

    await prisma.alertLog.create({
      data: {
        pharmacyId: batch.pharmacyId,
        referenceId: batch.id,
        referenceType: 'BATCH_EXPIRY',
        alertType: daysUntilExpiry < 0 ? 'EXPIRED' : `EXPIRY_${daysUntilExpiry}_DAY`,
        channel: 'SMS',
        recipient: batch.pharmacy.name,
        status: 'QUEUED',
        metadata: {
          productId: batch.productId,
          productName: batch.product.brandName || batch.product.name,
          batchNumber: batch.batchNumber,
          quantityRemaining: batch.quantityRemaining,
          expiryDate: batch.expiryDate.toISOString(),
          daysUntilExpiry,
          urgency: expiryUrgency(daysUntilExpiry),
        },
      },
    });

    queued += 1;

    // ── SMS alert to pharmacy owner ───────────────────────────────────────────
    if (isSmsConfigured()) {
      try {
        const owner = await prisma.user.findFirst({
          where: { pharmacyId: batch.pharmacyId, role: 'OWNER' },
          select: { phone: true },
        });
        if (owner?.phone) {
          const productName = batch.product.brandName || batch.product.name;
          await sendExpiryAlert(owner.phone, batch.pharmacy.name, [productName]);
        }
      } catch (smsErr) {
        console.error('[expiry-alerts] SMS send failed (non-fatal)', smsErr);
      }
    }
  }

  return { queued };
}

export function registerExpiryAlertsJob(): ScheduledTask {
  return cron.schedule('0 6 * * *', async () => {
    try {
      const result = await runExpiryAlerts();
      console.log(`[expiry-alerts] queued ${result.queued} alerts`);
    } catch (error) {
      console.error('[expiry-alerts] failed', error);
    }
  }, {
    timezone: 'Africa/Nairobi',
  });
}