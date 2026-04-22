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

describe('controlled drugs register', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('lists completed controlled-drug dispensings', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const seeded = await createProductAndBatch({ pharmacyId: pharmacy.id, userId: owner.user.id, sellingPrice: 2500 });
    await prisma.product.update({
      where: { id: seeded.product.id },
      data: { drugClass: 'CONTROLLED' },
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

    const register = await request(app)
      .get('/api/v1/dispensing/controlled-register')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`);

    expect(register.status).toBe(200);
    expect(register.body.data).toHaveLength(1);
    expect(register.body.data[0].productName).toBe(seeded.product.name);
    expect(register.body.data[0].drugClass).toBe('CONTROLLED');
    expect(register.body.data[0].quantity).toBe(2);
  }, 120000);
});
