import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import { signAccess } from '../src/lib/jwt';
import { createPharmacy, createUser, disconnectTestDb } from './helpers';

describe('ai counselling suggestions', () => {
  it('returns deterministic counselling text and caches repeated triggers', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'STANDARD' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const token = signAccess({
      userId: dispenser.user.id,
      role: dispenser.user.role,
      pharmacyId: pharmacy.id,
    });

    const payload = {
      triggers: [
        {
          rule: 'Pregnancy category D requires caution.',
          severity: 'MAJOR',
          drug: 'amoxicillin',
          flags: ['pregnant'],
        },
      ],
    };

    const first = await request(app)
      .post('/api/v1/patient-safety/counselling-suggestions')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(first.status).toBe(200);
    expect(first.body.data[0]).toMatchObject({
      severity: 'MAJOR',
      drug: 'amoxicillin',
      cached: false,
      source: 'RULE_TEMPLATE',
    });
    expect(first.body.data[0].suggestionText).toContain('Severity remains MAJOR');
    expect(first.body.data[0].suggestionText).toContain('Pregnancy category D requires caution.');

    const second = await request(app)
      .post('/api/v1/patient-safety/counselling-suggestions')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(second.status).toBe(200);
    expect(second.body.data[0].cached).toBe(true);

    const cacheCount = await prisma.aiCounsellingCache.count({
      where: { pharmacyId: pharmacy.id },
    });
    expect(cacheCount).toBe(1);
  });
});

afterAll(async () => {
  await disconnectTestDb();
});
