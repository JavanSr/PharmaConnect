import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import { signAccess } from '../src/lib/jwt';
import { createPharmacy, createProductAndBatch, createUser, disconnectTestDb } from './helpers';

describe('forecasting', () => {
  it('returns moving-average stockout forecasts for standard tier pharmacies', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'STANDARD' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const seeded = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: owner.user.id,
      quantity: 20,
      sellingPrice: 1500,
      name: 'Forecast Product',
    });

    await prisma.stockMovement.createMany({
      data: [
        {
          pharmacyId: pharmacy.id,
          productId: seeded.product.id,
          batchId: seeded.batch.id,
          userId: owner.user.id,
          type: 'DISPENSED',
          quantity: 5,
          notes: 'dispensed day 1',
          createdAt: new Date(Date.now() - 3 * 86_400_000),
        },
        {
          pharmacyId: pharmacy.id,
          productId: seeded.product.id,
          batchId: seeded.batch.id,
          userId: owner.user.id,
          type: 'DISPENSED',
          quantity: 5,
          notes: 'dispensed day 2',
          createdAt: new Date(Date.now() - 1 * 86_400_000),
        },
      ],
    });

    await prisma.batch.update({
      where: { id: seeded.batch.id },
      data: { quantityRemaining: 10 },
    });

    const token = signAccess({
      userId: owner.user.id,
      role: owner.user.role,
      pharmacyId: pharmacy.id,
    });

    const response = await request(app)
      .get('/api/v1/forecasting/stockout?lookbackDays=10&leadTimeDays=14')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      productName: 'Forecast Product',
      currentStock: 10,
      avgDailyDemand: 1,
      leadTimeDays: 14,
      status: 'RISK',
    });
    expect(response.body.data[0].daysUntilStockout).toBe(10);
  });

  it('keeps seasonality and dead-stock behind premium tier access', async () => {
    const standard = await createPharmacy({ subscriptionTier: 'STANDARD' });
    const premium = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: standard.id, role: 'OWNER' });

    await prisma.pharmacyMembership.create({
      data: {
        userId: owner.user.id,
        pharmacyId: premium.id,
        role: 'OWNER',
        active: true,
        validFrom: new Date(),
        createdBy: owner.user.id,
      },
    });

    const standardToken = signAccess({
      userId: owner.user.id,
      role: owner.user.role,
      pharmacyId: standard.id,
    });
    const premiumToken = signAccess({
      userId: owner.user.id,
      role: owner.user.role,
      pharmacyId: premium.id,
    });

    const denied = await request(app)
      .get('/api/v1/forecasting/seasonality')
      .set('Authorization', `Bearer ${standardToken}`);

    expect(denied.status).toBe(403);
    expect(denied.body.error).toBe('TIER_INSUFFICIENT');

    const allowed = await request(app)
      .get('/api/v1/forecasting/regional')
      .set('Authorization', `Bearer ${premiumToken}`);

    expect(allowed.status).toBe(200);
    expect(allowed.body.data).toMatchObject({
      status: 'disabled',
    });
  });
});

afterAll(async () => {
  await disconnectTestDb();
});
