import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import {
  createPharmacy,
  createProductAndBatch,
  createUser,
  disconnectTestDb,
  login,
} from './helpers';

describe('dispensing returns flow', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "feature_telemetry" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
        "pharmacy_id" TEXT NOT NULL,
        "feature_key" TEXT NOT NULL,
        "event_type" TEXT NOT NULL,
        "metadata" JSONB,
        "created_by" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "feature_telemetry_pkey" PRIMARY KEY ("id")
      )
    `);
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('lists completed dispensings and processes a dedicated return back to stock', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const seeded = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: owner.user.id,
      quantity: 10,
      sellingPrice: 2500,
    });
    const auth = await login(owner.user.email, owner.password);

    const checkout = await request(app)
      .post('/api/v1/dispensing/checkout')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        paymentMethod: 'CASH',
        items: [{ productId: seeded.product.id, quantity: 2, unitPrice: 2500 }],
      });

    expect(checkout.status).toBe(201);

    const listing = await request(app)
      .get(`/api/v1/dispensing/events?search=${checkout.body.data.referenceNumber}`)
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`);

    expect(listing.status).toBe(200);
    expect(listing.body.data).toHaveLength(1);
    expect(listing.body.data[0].referenceNumber).toBe(checkout.body.data.referenceNumber);
    expect(listing.body.data[0].status).toBe('COMPLETED');

    const beforeReturn = await prisma.batch.findUnique({ where: { id: seeded.batch.id } });
    expect(beforeReturn?.quantityRemaining).toBe(8);

    const returned = await request(app)
      .post(`/api/v1/dispensing/returns/${checkout.body.data.id}`)
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        reason: 'Customer returned the full sale unopened.',
      });

    expect(returned.status).toBe(200);
    expect(returned.body.data.status).toBe('VOIDED');
    expect(returned.body.data.source).toBe('RETURN');

    const afterReturn = await prisma.batch.findUnique({ where: { id: seeded.batch.id } });
    expect(afterReturn?.quantityRemaining).toBe(10);

    const telemetry = await prisma.$queryRaw<Array<{ feature_key: string; event_type: string }>>`
      SELECT "feature_key", "event_type"
      FROM "feature_telemetry"
      WHERE "pharmacy_id" = ${pharmacy.id} AND "feature_key" = 'dispensing_returns'
    `;
    expect(telemetry[0]).toEqual({
      feature_key: 'dispensing_returns',
      event_type: 'USED',
    });
  }, 120000);
});
