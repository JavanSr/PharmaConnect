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

  it('blocks a dispenser from calling the direct stock adjustment route', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const auth = await login(dispenser.user.email, dispenser.password);
    const { product, batch } = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: dispenser.user.id,
      quantity: 15,
    });

    const response = await request(app)
      .post('/api/v1/inventory/movements/adjust')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        productId: product.id,
        batchId: batch.id,
        type: 'ADJUSTED',
        quantity: 2,
        notes: 'Trying to reduce stock directly',
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('APPROVAL_WORKFLOW_REQUIRED');

    const unchangedBatch = await prisma.batch.findUnique({ where: { id: batch.id } });
    expect(unchangedBatch?.quantityRemaining).toBe(15);
  });

  it('blocks direct owner stock adjustment so changes only happen on approval', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const auth = await login(owner.user.email, owner.password);
    const { product, batch } = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: owner.user.id,
      quantity: 12,
    });

    const response = await request(app)
      .post('/api/v1/inventory/movements/adjust')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        productId: product.id,
        batchId: batch.id,
        type: 'ADJUSTED',
        quantity: 2,
        notes: 'Owner stock count correction attempt',
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('APPROVAL_WORKFLOW_REQUIRED');

    const unchangedBatch = await prisma.batch.findUnique({ where: { id: batch.id } });
    expect(unchangedBatch?.quantityRemaining).toBe(12);
  });

  it('lets an owner review pending suggestions and applies the approved stock change', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const ownerAuth = await login(owner.user.email, owner.password);
    const dispenserAuth = await login(dispenser.user.email, dispenser.password);
    const { product, batch } = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: owner.user.id,
      quantity: 18,
    });

    const suggestionResponse = await request(app)
      .post('/api/v1/inventory/adjustment-suggestions')
      .set('Authorization', `Bearer ${dispenserAuth.body.data.accessToken}`)
      .field('productId', product.id)
      .field('batchId', batch.id)
      .field('quantityDelta', '-6')
      .field('reason', 'COUNT_VARIANCE')
      .field('note', 'Shelf count is short by six packs.');

    expect(suggestionResponse.status).toBe(201);

    const listResponse = await request(app)
      .get('/api/v1/inventory/adjustment-suggestions')
      .query({ status: 'PENDING' })
      .set('Authorization', `Bearer ${ownerAuth.body.data.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].id).toBe(suggestionResponse.body.data.id);

    const reviewResponse = await request(app)
      .patch(`/api/v1/inventory/adjustment-suggestions/${suggestionResponse.body.data.id}/review`)
      .set('Authorization', `Bearer ${ownerAuth.body.data.accessToken}`)
      .send({
        status: 'PARTIAL',
        approvedQuantityDelta: -2,
        reviewNote: 'Approve only the visibly damaged packs.',
      });

    expect(reviewResponse.status).toBe(200);
    expect(reviewResponse.body.data.status).toBe('PARTIAL');
    expect(reviewResponse.body.data.approvedQuantityDelta).toBe(-2);
    expect(reviewResponse.body.data.reviewedBy).toBe(owner.user.id);
    expect(reviewResponse.body.data.reviewedAt).toBeTruthy();

    const updatedBatch = await prisma.batch.findUnique({ where: { id: batch.id } });
    expect(updatedBatch?.quantityRemaining).toBe(16);

    const movement = await prisma.stockMovement.findFirst({
      where: {
        pharmacyId: pharmacy.id,
        productId: product.id,
        batchId: batch.id,
        userId: owner.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(movement?.type).toBe('ADJUSTED');
    expect(movement?.quantity).toBe(2);
    expect(movement?.notes).toContain(suggestionResponse.body.data.id);
  });

  it('blocks a dispenser from the owner review queue endpoints', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const dispenserAuth = await login(dispenser.user.email, dispenser.password);
    const { product } = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: owner.user.id,
      quantity: 9,
    });

    const suggestion = await prisma.stockAdjustmentSuggestion.create({
      data: {
        pharmacyId: pharmacy.id,
        productId: product.id,
        quantityDelta: -1,
        reason: 'DAMAGED',
        createdBy: dispenser.user.id,
      },
    });

    const listResponse = await request(app)
      .get('/api/v1/inventory/adjustment-suggestions')
      .query({ status: 'PENDING' })
      .set('Authorization', `Bearer ${dispenserAuth.body.data.accessToken}`);

    expect(listResponse.status).toBe(403);
    expect(listResponse.body.error).toBe('ROLE_INSUFFICIENT');

    const reviewResponse = await request(app)
      .patch(`/api/v1/inventory/adjustment-suggestions/${suggestion.id}/review`)
      .set('Authorization', `Bearer ${dispenserAuth.body.data.accessToken}`)
      .send({
        status: 'APPROVED',
      });

    expect(reviewResponse.status).toBe(403);
    expect(reviewResponse.body.error).toBe('ROLE_INSUFFICIENT');
  });
});
