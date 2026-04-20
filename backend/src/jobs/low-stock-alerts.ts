import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';
import { alertAlreadySentToday, lowStockReport } from '../modules/inventory/inventory.service';

export async function runLowStockAlerts(): Promise<{ queued: number }> {
  const pharmacies = await prisma.pharmacy.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  let queued = 0;

  for (const pharmacy of pharmacies) {
    const products = await lowStockReport(pharmacy.id);
    for (const product of products) {
      const existing = await alertAlreadySentToday(pharmacy.id, product.id, 'IN_APP');
      if (existing) {
        continue;
      }

      await prisma.alertLog.create({
        data: {
          pharmacyId: pharmacy.id,
          referenceId: product.id,
          referenceType: 'PRODUCT_LOW_STOCK',
          alertType: 'LOW_STOCK',
          channel: 'IN_APP',
          recipient: pharmacy.name,
          status: 'QUEUED',
          metadata: {
            productName: product.name,
            currentStock: product.currentStock ?? 0,
            reorderLevel: product.reorderLevel,
            shortage: product.shortage,
          },
        },
      });

      queued += 1;
    }
  }

  return { queued };
}

export function registerLowStockAlertsJob(): ScheduledTask {
  return cron.schedule('0 6 * * *', async () => {
    try {
      const result = await runLowStockAlerts();
      console.log(`[low-stock-alerts] queued ${result.queued} alerts`);
    } catch (error) {
      console.error('[low-stock-alerts] failed', error);
    }
  }, {
    timezone: 'Africa/Nairobi',
  });
}
