import request from 'supertest';
import app from '../src/index';
import { createPharmacy, createUser, disconnectTestDb, login } from './helpers';

describe('settings config base', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('lets an owner upsert and read a reusable pharmacy config entry', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const auth = await login(owner.user.email, owner.password);

    const writeResponse = await request(app)
      .put('/api/v1/settings/config/payment.methods')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        value: {
          version: 1,
          methods: [{ code: 'CASH', active: true }],
        },
      });

    expect(writeResponse.status).toBe(200);
    expect(writeResponse.body.data.key).toBe('payment.methods');
    expect(writeResponse.body.data.value).toEqual({
      version: 1,
      methods: [{ code: 'CASH', active: true }],
    });

    const readResponse = await request(app)
      .get('/api/v1/settings/config/payment.methods')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`);

    expect(readResponse.status).toBe(200);
    expect(readResponse.body.data.value).toEqual({
      version: 1,
      methods: [{ code: 'CASH', active: true }],
    });
  });

  it('blocks non-owner config writes', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const auth = await login(dispenser.user.email, dispenser.password);

    const response = await request(app)
      .put('/api/v1/settings/config/payment.methods')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        value: {
          version: 1,
        },
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('ROLE_INSUFFICIENT');
    expect(response.body.permission).toBe('settings.manage_subscription');
  });
});
