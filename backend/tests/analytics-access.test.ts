import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import { signAccess } from '../src/lib/jwt';
import { createPharmacy, createUser, disconnectTestDb } from './helpers';

describe('analytics access controls', () => {
  it('rejects compare requests that include a pharmacy outside the caller memberships', async () => {
    const enterprise = await createPharmacy({ subscriptionTier: 'ENTERPRISE' });
    const foreign = await createPharmacy({ subscriptionTier: 'ENTERPRISE' });
    const owner = await createUser({ pharmacyId: enterprise.id, role: 'OWNER' });

    const token = signAccess({
      userId: owner.user.id,
      role: owner.user.role,
      pharmacyId: enterprise.id,
    });

    const response = await request(app)
      .post('/api/v1/analytics/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        metric: 'DISPENSED_UNITS',
        range: '30D',
        pharmacyIds: [enterprise.id, foreign.id],
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('PHARMACY_SCOPE_INVALID');
  });

  it('returns feature sets based on the active pharmacy tier, not the user', async () => {
    const addo = await createPharmacy({ subscriptionTier: 'ADDO', pharmacyType: 'ADDO' });
    const standard = await createPharmacy({ subscriptionTier: 'STANDARD' });
    const premium = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const enterprise = await createPharmacy({ subscriptionTier: 'ENTERPRISE' });
    const owner = await createUser({ pharmacyId: addo.id, role: 'OWNER' });

    await prisma.pharmacyMembership.createMany({
      data: [
        {
          userId: owner.user.id,
          pharmacyId: standard.id,
          role: 'OWNER',
          active: true,
          validFrom: new Date(),
          createdBy: owner.user.id,
        },
        {
          userId: owner.user.id,
          pharmacyId: premium.id,
          role: 'OWNER',
          active: true,
          validFrom: new Date(),
          createdBy: owner.user.id,
        },
        {
          userId: owner.user.id,
          pharmacyId: enterprise.id,
          role: 'OWNER',
          active: true,
          validFrom: new Date(),
          createdBy: owner.user.id,
        },
      ],
      skipDuplicates: true,
    });

    const fetchFeatures = async (pharmacyId: string) => request(app)
      .get('/api/v1/analytics/features')
      .set('Authorization', `Bearer ${signAccess({
        userId: owner.user.id,
        role: owner.user.role,
        pharmacyId,
      })}`);

    const addoResponse = await fetchFeatures(addo.id);
    expect(addoResponse.status).toBe(200);
    expect(addoResponse.body.data).toMatchObject({
      tier: 'ADDO',
      historyDays: 30,
      stockout: false,
      forecast: false,
      multiOutletCompare: false,
    });

    const standardResponse = await fetchFeatures(standard.id);
    expect(standardResponse.status).toBe(200);
    expect(standardResponse.body.data).toMatchObject({
      tier: 'STANDARD',
      historyDays: 365,
      stockout: true,
      forecast: false,
      multiOutletCompare: false,
    });

    const premiumResponse = await fetchFeatures(premium.id);
    expect(premiumResponse.status).toBe(200);
    expect(premiumResponse.body.data).toMatchObject({
      tier: 'PREMIUM',
      historyDays: 365,
      stockout: true,
      benchmark: true,
      forecast: true,
      seasonality: true,
      deadStock: true,
      multiOutletCompare: false,
    });

    const enterpriseResponse = await fetchFeatures(enterprise.id);
    expect(enterpriseResponse.status).toBe(200);
    expect(enterpriseResponse.body.data).toMatchObject({
      tier: 'ENTERPRISE',
      historyDays: 365,
      stockout: true,
      benchmark: true,
      forecast: true,
      seasonality: true,
      deadStock: true,
      multiOutletCompare: true,
    });
  });
});

afterAll(async () => {
  await disconnectTestDb();
});
