import cron from 'node-cron';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

async function submitVfdEvent(event: { id: string; reference_number: string; total_amount: string | number; pharmacy_id: string }) {
  const vfdUrl = process.env.VFD_API_URL;
  const vfdToken = process.env.VFD_API_TOKEN;

  if (!vfdUrl || !vfdToken) {
    return { ok: false, error: 'VFD_NOT_CONFIGURED' };
  }

  const response = await fetch(vfdUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vfdToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: event.id,
      referenceNumber: event.reference_number,
      totalAmount: Number(event.total_amount),
      pharmacyId: event.pharmacy_id,
    }),
  });

  if (!response.ok) {
    return { ok: false, error: await response.text() };
  }

  const payload: { reference?: string } = (await response.json().catch(() => ({}))) as { reference?: string };
  return { ok: true, reference: payload.reference ?? `VFD-${event.reference_number}` };
}

export async function runVfdRetryJob() {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    reference_number: string;
    total_amount: string | number;
    pharmacy_id: string;
  }>>(Prisma.sql`
    SELECT "id", "reference_number", "total_amount", "pharmacy_id"
    FROM "dispensing_events"
    WHERE "vfd_status" = 'PENDING'
    ORDER BY "created_at" ASC
    LIMIT 100
  `);

  let retried = 0;
  let succeeded = 0;

  for (const row of rows) {
    retried += 1;
    const result = await submitVfdEvent(row);
    if (result.ok) {
      succeeded += 1;
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "dispensing_events"
        SET "vfd_status" = 'SUBMITTED', "vfd_reference" = ${result.reference}, "updated_at" = NOW()
        WHERE "id" = ${row.id}
      `);
    }
  }

  return { retried, succeeded };
}

export function registerVfdRetryJob() {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  return cron.schedule('*/15 * * * *', () => {
    void runVfdRetryJob();
  }, { timezone: 'Africa/Nairobi' });
}
