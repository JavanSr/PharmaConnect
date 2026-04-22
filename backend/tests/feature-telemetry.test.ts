import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import {
  createPharmacy,
  createUser,
  disconnectTestDb,
  login,
} from './helpers';

describe('feature telemetry', () => {
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

  it('records activation and usage events for tracked features', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const auth = await login(owner.user.email, owner.password);

    const settingsResponse = await request(app)
      .put('/api/v1/settings/config/payment.methods')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        value: {
          version: 1,
          methods: [
            { code: 'CASH', type: 'CASH', label: 'Cash', active: true, phoneNumber: '', note: 'Always enabled for offline fallback.' },
            { code: 'AIRTEL_MONEY', type: 'MOBILE_MONEY', label: 'Airtel Money', active: true, phoneNumber: '+255700000001', note: 'Owner till' },
          ],
        },
      });

    expect(settingsResponse.status).toBe(200);

    const forecastingResponse = await request(app)
      .get('/api/v1/forecasting/stockout')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`);

    expect(forecastingResponse.status).toBe(200);

    const rows = await prisma.$queryRaw<Array<{
      feature_key: string;
      event_type: string;
      created_by: string;
    }>>`
      SELECT "feature_key", "event_type", "created_by"
      FROM "feature_telemetry"
      WHERE "pharmacy_id" = ${pharmacy.id}
      ORDER BY "created_at" ASC
    `;

    expect(rows).toEqual(expect.arrayContaining([
      {
        feature_key: 'payment_methods',
        event_type: 'ACTIVATED',
        created_by: owner.user.id,
      },
      {
        feature_key: 'forecasting',
        event_type: 'USED',
        created_by: owner.user.id,
      },
    ]));
  }, 120000);
});
