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

describe('inventory adjustment suggestions', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('records a dispenser stock adjustment suggestion without changing stock', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const auth = await login(dispenser.user.email, dispenser.password);
    const { product, batch } = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: dispenser.user.id,
      quantity: 20,
    });

    const response = await request(app)
      .post('/api/v1/inventory/adjustment-suggestions')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .field('productId', product.id)
      .field('batchId', batch.id)
      .field('quantityDelta', '-3')
      .field('reason', 'OTHER')
      .field('note', 'Broken pack found during shelf count.')
      .attach('photo', Buffer.from('fake-image'), 'evidence.jpg');

    expect(response.status).toBe(201);
    expect(response.body.data.quantityDelta).toBe(-3);
    expect(response.body.data.reason).toBe('OTHER');
    expect(response.body.data.status).toBe('PENDING');
    expect(response.body.data.photoPath).toMatch(/^uploads\/stock-adjustment-suggestions\//);
    expect(response.body.data.createdBy).toBe(dispenser.user.id);

    const unchangedBatch = await prisma.batch.findUnique({ where: { id: batch.id } });
    expect(unchangedBatch?.quantityRemaining).toBe(20);
  });

  it('requires a note when the suggestion reason is OTHER', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const auth = await login(dispenser.user.email, dispenser.password);
    const { product } = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: dispenser.user.id,
      quantity: 10,
    });

    const response = await request(app)
      .post('/api/v1/inventory/adjustment-suggestions')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .field('productId', product.id)
      .field('quantityDelta', '-1')
      .field('reason', 'OTHER');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('NOTE_REQUIRED_FOR_OTHER_REASON');
  });
});
