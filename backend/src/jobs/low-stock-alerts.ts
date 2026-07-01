import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';
import { alertAlreadySentToday, lowStockReport } from '../modules/inventory/inventory.service';
import { isSmsConfigured, sendLowStockAlert } from '../services/sms.service';

export async function runLowStockAlerts(): Promise<{ queued: number }> {
  const pharmacies = await prisma.pharmacy.findMany({
    select: { id: true, name: true },
  });

  let queued = 0;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  for (const pharmacy of pharmacies) {
    const products = await lowStockReport(pharmacy.id);
    if (products.length === 0) continue;

    // Fetch all today's IN_APP alerts for this pharmacy in one query
    const sentToday = await prisma.alertLog.findMany({
      where: {
        pharmacyId: pharmacy.id,
        channel: 'IN_APP',
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
      select: { referenceId: true },
    });
    const sentIds = new Set(sentToday.map((a) => a.referenceId));

    const toCreate = products.filter((p) => !sentIds.has(p.id));
    if (toCreate.length === 0) continue;

    await prisma.alertLog.createMany({
      data: toCreate.map((product) => ({
        pharmacyId: pharmacy.id,
        referenceId: product.id,
        referenceType: 'PRODUCT_LOW_STOCK',
        alertType: 'LOW_STOCK',
        channel: 'IN_APP',
        recipient: pharmacy.name,
        status: 'QUEUED',
        metadata: {
          productName: (product as any).brandName || product.name,
          currentStock: product.currentStock ?? 0,
          reorderLevel: product.reorderLevel,
          shortage: product.shortage,
        },
      })),
    });

    queued += toCreate.length;

    // ── SMS alert to pharmacy owner ───────────────────────────────────────────
    if (isSmsConfigured() && toCreate.length > 0) {
      try {
        const owner = await prisma.user.findFirst({
          where: { pharmacyId: pharmacy.id, role: 'OWNER' },
          select: { phone: true },
        });
        if (owner?.phone) {
          const productNames = toCreate.map((p) => (p as any).brandName || p.name);
          await sendLowStockAlert(owner.phone, pharmacy.name, productNames);
        }
      } catch (smsErr) {
        console.error('[low-stock-alerts] SMS send failed (non-fatal)', smsErr);
      }
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
