import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import { signAccess } from '../src/lib/jwt';
import { createPharmacy, createUser, disconnectTestDb, login } from './helpers';

describe('pharmacy memberships', () => {
  it('lists active memberships and rotates tokens when selecting another pharmacy', async () => {
    const primary = await createPharmacy({ name: 'Alpha Pharmacy' });
    const secondary = await createPharmacy({ name: 'Beta Pharmacy' });
    const owner = await createUser({ pharmacyId: primary.id, role: 'OWNER', password: 'SelectPass!123' });

    await prisma.pharmacyMembership.create({
      data: {
        userId: owner.user.id,
        pharmacyId: secondary.id,
        role: 'OWNER',
        active: true,
        validFrom: new Date(),
        createdBy: owner.user.id,
      },
    });

    const auth = await login(owner.user.email, 'SelectPass!123');
    expect(auth.status).toBe(200);

    const token = auth.body.data.accessToken as string;
    const memberships = await request(app)
      .get('/api/v1/me/pharmacies')
      .set('Authorization', `Bearer ${token}`);

    expect(memberships.status).toBe(200);
    expect(memberships.body.data).toHaveLength(2);
    expect(memberships.body.data.find((entry: any) => entry.selected)?.pharmacyId).toBe(primary.id);

    const selection = await request(app)
      .post(`/api/v1/me/pharmacies/${secondary.id}/select`)
      .set('Authorization', `Bearer ${token}`);

    expect(selection.status).toBe(200);
    expect(selection.body.data.pharmacy.id).toBe(secondary.id);
    expect(selection.body.data.accessToken).toEqual(expect.any(String));

    const refreshedMe = await request(app)
      .get('/api/v1/settings/subscription')
      .set('Authorization', `Bearer ${selection.body.data.accessToken as string}`);

    expect(refreshedMe.status).toBe(200);
    expect(refreshedMe.body.data.id).toBe(secondary.id);

    const persistedUser = await prisma.user.findUniqueOrThrow({ where: { id: owner.user.id } });
    expect(persistedUser.pharmacyId).toBe(secondary.id);
  });

  it('rejects pharmacy-scoped access when the token points to a pharmacy without membership', async () => {
    const primary = await createPharmacy();
    const foreign = await createPharmacy();
    const dispenser = await createUser({ pharmacyId: primary.id, role: 'DISPENSER' });

    const token = signAccess({
      userId: dispenser.user.id,
      role: dispenser.user.role,
      pharmacyId: foreign.id,
    });

    const response = await request(app)
      .get('/api/v1/settings/subscription')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('PHARMACY_MEMBERSHIP_REQUIRED');
  });

  it('denies access for memberships that expired in the past', async () => {
    const pharmacy = await createPharmacy();
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });

    await prisma.pharmacyMembership.updateMany({
      where: {
        userId: dispenser.user.id,
        pharmacyId: pharmacy.id,
      },
      data: {
        validUntil: new Date(Date.now() - 60_000),
      },
    });

    const token = signAccess({
      userId: dispenser.user.id,
      role: dispenser.user.role,
      pharmacyId: pharmacy.id,
    });

    const response = await request(app)
      .get('/api/v1/settings/subscription')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('PHARMACY_MEMBERSHIP_REQUIRED');
  });
});

afterAll(async () => {
  await disconnectTestDb();
});
