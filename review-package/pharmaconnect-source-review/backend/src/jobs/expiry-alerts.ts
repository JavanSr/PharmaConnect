import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';
import { alertAlreadySentToday } from '../modules/inventory/inventory.service';

const EXPIRY_ALERT_WINDOWS = [90, 60, 30, 14, 7, 3, 1];

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
          productName: batch.product.name,
          batchNumber: batch.batchNumber,
          quantityRemaining: batch.quantityRemaining,
          expiryDate: batch.expiryDate.toISOString(),
          daysUntilExpiry,
        },
      },
    });

    queued += 1;
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
