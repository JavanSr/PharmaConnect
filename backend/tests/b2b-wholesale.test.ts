import request from 'supertest';
import app from '../src/index';
import {
  createPharmacy,
  createProductAndBatch,
  createUser,
  disconnectTestDb,
  login,
} from './helpers';

describe('wholesale operations extensions', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('uses tier pricing and blocks new credit orders when configured', async () => {
    const buyerPharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM', pharmacyType: 'RETAIL' });
    const sellerPharmacy = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const buyer = await createUser({ pharmacyId: buyerPharmacy.id, role: 'OWNER' });
    const seller = await createUser({ pharmacyId: sellerPharmacy.id, role: 'OWNER' });
    const seeded = await createProductAndBatch({ pharmacyId: sellerPharmacy.id, userId: seller.user.id, sellingPrice: 1000 });

    const buyerAuth = await login(buyer.user.email, buyer.password);
    const sellerAuth = await login(seller.user.email, seller.password);

    const catalogue = await request(app)
      .post('/api/v1/b2b/catalogues')
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({
        title: 'Tiered wholesale catalogue',
        items: [
          {
            productId: seeded.product.id,
            price: 1000,
            tierPrices: {
              PREMIUM: 800,
            },
          },
        ],
      });

    expect(catalogue.status).toBe(201);

    const blocked = await request(app)
      .put(`/api/v1/b2b/credit-limits/${buyerPharmacy.id}`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({
        creditLimit: 100000,
        outstandingBalance: 0,
        paymentTermsDays: 21,
        blockNewOrders: true,
        blockReason: 'Account on hold',
      });

    expect(blocked.status).toBe(200);
    expect(blocked.body.data.blockNewOrders).toBe(true);

    const rejectedOrder = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({
        sellerPharmacyId: sellerPharmacy.id,
        items: [{ productId: seeded.product.id, quantity: 2 }],
      });

    expect(rejectedOrder.status).toBe(403);
    expect(rejectedOrder.body.error).toBe('CREDIT_BLOCKED');

    await request(app)
      .put(`/api/v1/b2b/credit-limits/${buyerPharmacy.id}`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({
        creditLimit: 100000,
        outstandingBalance: 0,
        paymentTermsDays: 21,
        blockNewOrders: false,
        blockReason: null,
      });

    const order = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({
        sellerPharmacyId: sellerPharmacy.id,
        items: [{ productId: seeded.product.id, quantity: 2 }],
      });

    expect(order.status).toBe(201);
    expect(order.body.data.items[0].unitPrice).toBe(800);
    expect(order.body.data.totalAmount).toBe(1600);
  }, 120000);

  it('stores delivery scheduling and exposes stubbed EFDMS invoice metadata', async () => {
    const previousFlag = process.env.FEATURE_EFDMS_INVOICES;
    process.env.FEATURE_EFDMS_INVOICES = 'false';

    const buyerPharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const sellerPharmacy = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const buyer = await createUser({ pharmacyId: buyerPharmacy.id, role: 'OWNER' });
    const seller = await createUser({ pharmacyId: sellerPharmacy.id, role: 'OWNER' });
    const seeded = await createProductAndBatch({ pharmacyId: sellerPharmacy.id, userId: seller.user.id, sellingPrice: 1200 });

    const buyerAuth = await login(buyer.user.email, buyer.password);
    const sellerAuth = await login(seller.user.email, seller.password);

    await request(app)
      .post('/api/v1/b2b/catalogues')
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({
        title: 'Scheduled wholesale catalogue',
        items: [{ productId: seeded.product.id, price: 1200 }],
      });

    const order = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({
        sellerPharmacyId: sellerPharmacy.id,
        items: [{ productId: seeded.product.id, quantity: 3 }],
      });

    expect(order.status).toBe(201);

    const scheduled = await request(app)
      .patch(`/api/v1/b2b/orders/${order.body.data.id}/delivery-schedule`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({
        scheduledDeliveryAt: '2026-04-25T09:00:00.000Z',
        deliveryWindowLabel: 'Morning route',
        deliveryNote: 'Deliver before noon dispatch closes.',
      });

    expect(scheduled.status).toBe(200);
    expect(scheduled.body.data.scheduledDeliveryAt).toBe('2026-04-25T09:00:00.000Z');
    expect(scheduled.body.data.deliveryWindowLabel).toBe('Morning route');

    const confirmed = await request(app)
      .patch(`/api/v1/b2b/orders/${order.body.data.id}/status`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({ nextStatus: 'CONFIRMED' });

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.invoice.efdmsStatus).toBe('STUBBED');

    const invoices = await request(app)
      .get('/api/v1/b2b/invoices')
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`);

    expect(invoices.status).toBe(200);
    expect(invoices.body.data[0].efdmsStatus).toBe('STUBBED');
    expect(invoices.body.data[0].efdmsPayload.mode).toBe('stub');

    process.env.FEATURE_EFDMS_INVOICES = previousFlag;
  }, 120000);
});
