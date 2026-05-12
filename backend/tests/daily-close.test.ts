import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import {
  createPharmacy,
  createUser,
  disconnectTestDb,
  login,
} from './helpers';

describe('daily close reconciliation', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('requires a note when variance exceeds TZS 5000', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const auth = await login(owner.user.email, owner.password);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "dispensing_events" (
        "pharmacy_id",
        "dispensed_by",
        "reference_number",
        "payment_method",
        "subtotal_amount",
        "discount_amount",
        "total_amount",
        "items",
        "status",
        "vfd_status",
        "created_at"
      )
      VALUES (
        '${pharmacy.id}',
        '${owner.user.id}',
        'TEST-DAILY-CLOSE-${Date.now()}',
        'CASH',
        10000,
        0,
        10000,
        '[]'::jsonb,
        'COMPLETED',
        'NOT_ENABLED',
        NOW()
      )
    `);

    const withoutNote = await request(app)
      .post('/api/v1/dispensing/daily-close')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({ actualCashCounted: 2000 });

    expect(withoutNote.status).toBe(400);
    expect(withoutNote.body.error).toBe('VARIANCE_NOTE_REQUIRED');

    const withNote = await request(app)
      .post('/api/v1/dispensing/daily-close')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({ actualCashCounted: 2000, notes: 'Till was short after change float recount.' });

    expect(withNote.status).toBe(201);
    expect(withNote.body.data.expectedCash).toBe(10000);
    expect(withNote.body.data.discrepancy).toBe(-8000);
    expect(withNote.body.data.totalSales).toBe(1);
    expect(withNote.body.data.totalRevenueTzs).toBe(10000);
    expect(withNote.body.data.itemsDispensed).toBe(0);
    expect(withNote.body.data.paymentBreakdown).toEqual([
      { paymentMethod: 'CASH', salesCount: 1, totalAmount: 10000 },
    ]);

    const duplicate = await request(app)
      .post('/api/v1/dispensing/close-day')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({ actualCashCounted: 2000, notes: 'Second close attempt.' });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe('DAILY_CLOSE_ALREADY_EXISTS');
  }, 120000);
});
