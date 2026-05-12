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

describe('dispensing prescription photo upload', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('stores an optional prescription photo on checkout without breaking dispensing', async () => {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "dispensing_events"
      ADD COLUMN IF NOT EXISTS "prescription_photo_path" TEXT
    `);

    const pharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const seeded = await createProductAndBatch({ pharmacyId: pharmacy.id, userId: owner.user.id, sellingPrice: 2500 });
    const auth = await login(owner.user.email, owner.password);

    const checkout = await request(app)
      .post('/api/v1/dispensing/checkout')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .field('checkout', JSON.stringify({
        paymentMethod: 'CASH',
        items: [{ productId: seeded.product.id, quantity: 1, unitPrice: 2500 }],
      }))
      .attach('prescriptionPhoto', Buffer.from('fake-image'), 'prescription.jpg');

    expect(checkout.status).toBe(201);
    expect(checkout.body.data.prescriptionPhotoPath).toMatch(/^uploads\/prescriptions\//);

    const storedRows = await prisma.$queryRaw<Array<{ prescription_photo_path: string | null }>>`
      SELECT "prescription_photo_path"
      FROM "dispensing_events"
      WHERE "id" = ${checkout.body.data.id}
      LIMIT 1
    `;

    expect(storedRows[0]?.prescription_photo_path).toBe(checkout.body.data.prescriptionPhotoPath);
  }, 120000);
});
