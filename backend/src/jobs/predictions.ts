import cron from 'node-cron';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma';

export async function runPredictionsJob() {
  const pharmacies = await prisma.pharmacy.findMany({
    select: { id: true },
  });

  let created = 0;

  for (const pharmacy of pharmacies) {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        pharmacyId: pharmacy.id,
        isActive: true,
        batches: {
          none: { quantityRemaining: { gt: 0 } },
        },
      },
      select: { id: true, name: true },
      take: 10,
    });

    await prisma.$executeRaw`
      DELETE FROM "predictions"
      WHERE "pharmacy_id" = ${pharmacy.id}
        AND "prediction_type" = 'RESTOCK'
    `;

    for (const product of lowStockProducts) {
      created += 1;
      await prisma.$executeRaw`
        INSERT INTO "predictions" ("id", "pharmacy_id", "prediction_type", "subject_type", "subject_id", "horizon_days", "payload")
        VALUES (
          ${randomUUID()},
          ${pharmacy.id},
          'RESTOCK',
          'PRODUCT',
          ${product.id},
          30,
          ${JSON.stringify({ productName: product.name, recommendation: 'Reorder now' })}::jsonb
        )
      `;
    }
  }

  return { created };
}

export function registerPredictionsJob() {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  return cron.schedule('15 5 * * *', () => {
    void runPredictionsJob();
  }, { timezone: 'Africa/Nairobi' });
}
