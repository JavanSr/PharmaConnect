import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createPharmacy, createUser, disconnectTestDb, login } from './helpers';

describe('dispensing payment methods', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('falls back to the legacy dispensing methods when no owner config exists', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const auth = await login(dispenser.user.email, dispenser.password);

    const response = await request(app)
      .get('/api/v1/dispensing/payment-methods')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.source).toBe('legacy');
    expect(response.body.data.methods).toEqual([
      {
        code: 'CASH',
        label: 'Cash',
        phoneNumber: '',
        note: 'Always enabled for offline fallback.',
        requiresReference: false,
        source: 'legacy',
      },
      {
        code: 'MPESA',
        label: 'M-Pesa',
        phoneNumber: '',
        note: '',
        requiresReference: true,
        source: 'legacy',
      },
      {
        code: 'TIGOPESA',
        label: 'Tigo Pesa',
        phoneNumber: '',
        note: '',
        requiresReference: true,
        source: 'legacy',
      },
    ]);
  });

  it('returns only active checkout-safe config methods for dispensing users', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const auth = await login(dispenser.user.email, dispenser.password);

    await prisma.pharmacySetting.create({
      data: {
        pharmacyId: pharmacy.id,
        key: 'payment.methods',
        createdBy: owner.user.id,
        value: {
          version: 1,
          methods: [
            {
              code: 'CASH',
              type: 'CASH',
              label: 'Cash',
              active: true,
            },
            {
              code: 'AIRTEL_MONEY',
              type: 'MOBILE_MONEY',
              label: 'Airtel Money',
              phoneNumber: '+255755000111',
              active: true,
              note: 'Use owner till for mobile money receipts.',
            },
            {
              code: 'TIGOPESA',
              type: 'MOBILE_MONEY',
              label: 'Tigo Pesa',
              phoneNumber: '+255713000222',
              active: false,
              note: 'Temporarily paused.',
            },
            {
              code: 'BANK_TRANSFER',
              type: 'MOBILE_MONEY',
              label: 'Bank transfer',
              phoneNumber: '+255700000000',
              active: true,
              note: 'Not a checkout-safe enum option.',
            },
          ],
        },
      },
    });

    const response = await request(app)
      .get('/api/v1/dispensing/payment-methods')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.source).toBe('config');
    expect(response.body.data.methods).toEqual([
      {
        code: 'CASH',
        label: 'Cash',
        phoneNumber: '',
        note: 'Always enabled for offline fallback.',
        requiresReference: false,
        source: 'config',
      },
      {
        code: 'AIRTEL_MONEY',
        label: 'Airtel Money',
        phoneNumber: '+255755000111',
        note: 'Use owner till for mobile money receipts.',
        requiresReference: true,
        source: 'config',
      },
    ]);
  });
});
