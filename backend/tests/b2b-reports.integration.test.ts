import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import app from '../src/index';
import { runVfdRetryJob } from '../src/jobs/vfd-retry';
import {
  createPharmacy,
  createProductAndBatch,
  createUser,
  createWholesaleCatalogue,
  disconnectTestDb,
  linkPharmacies,
  login,
} from './helpers';

describe('b2b, reports, and vfd flows', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('enforces closed network, credit limits, state transitions, and WCS queue restrictions', async () => {
    const buyerPharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM', pharmacyType: 'RETAIL' });
    const sellerPharmacy = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const nonPlatformSeller = await createPharmacy({ subscriptionTier: 'PREMIUM', pharmacyType: 'RETAIL' });

    const buyer = await createUser({ pharmacyId: buyerPharmacy.id, role: 'OWNER' });
    const seller = await createUser({ pharmacyId: sellerPharmacy.id, role: 'OWNER' });
    const wcs = await createUser({ pharmacyId: sellerPharmacy.id, role: 'WHOLESALE_COUNTER_STAFF', password: 'WcsPass!123' });
    const sellerProduct = await createProductAndBatch({ pharmacyId: sellerPharmacy.id, userId: seller.user.id, sellingPrice: 1000 });
    await createWholesaleCatalogue({ pharmacyId: sellerPharmacy.id, productId: sellerProduct.product.id, price: 1000 });
    // Links must exist so the link gate lets the deeper checks fire
    await linkPharmacies({ retailPharmacyId: buyerPharmacy.id, wholesalePharmacyId: sellerPharmacy.id, requestedBy: buyer.user.id });
    await linkPharmacies({ retailPharmacyId: buyerPharmacy.id, wholesalePharmacyId: nonPlatformSeller.id, requestedBy: buyer.user.id });

    const buyerAuth = await login(buyer.user.email, buyer.password);
    const sellerAuth = await login(seller.user.email, seller.password);
    const wcsAuth = await login(wcs.user.email, wcs.password);

    const offPlatform = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({ sellerPharmacyId: nonPlatformSeller.id, items: [{ productId: sellerProduct.product.id, quantity: 1 }] });

    expect(offPlatform.status).toBe(403);
    expect(offPlatform.body.error).toBe('SELLER_NOT_ON_PLATFORM');

    await request(app)
      .put(`/api/v1/b2b/credit-limits/${buyerPharmacy.id}`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({ creditLimit: 500, outstandingBalance: 0, paymentTermsDays: 14 });

    const overLimit = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({ sellerPharmacyId: sellerPharmacy.id, items: [{ productId: sellerProduct.product.id, quantity: 1 }] });

    expect(overLimit.status).toBe(402);
    expect(overLimit.body.error).toBe('CREDIT_LIMIT_EXCEEDED');

    await request(app)
      .put(`/api/v1/b2b/credit-limits/${buyerPharmacy.id}`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({ creditLimit: 100000, outstandingBalance: 0, paymentTermsDays: 30 });

    const order = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({ sellerPharmacyId: sellerPharmacy.id, items: [{ productId: sellerProduct.product.id, quantity: 2 }] });

    expect(order.status).toBe(201);

    const invalidTransition = await request(app)
      .patch(`/api/v1/b2b/orders/${order.body.data.id}/status`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({ nextStatus: 'DELIVERED' });

    expect(invalidTransition.status).toBe(422);
    expect(invalidTransition.body.error).toBe('INVALID_STATE_TRANSITION');

    const confirm = await request(app)
      .patch(`/api/v1/b2b/orders/${order.body.data.id}/status`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`)
      .send({ nextStatus: 'CONFIRMED', assignedPicker: wcs.user.id });

    expect(confirm.status).toBe(200);
    expect(confirm.body.data.invoice.invoiceNumber).toContain('PC-INV-');

    const wcsCredit = await request(app)
      .get('/api/v1/b2b/credit-limits')
      .set('Authorization', `Bearer ${wcsAuth.body.data.accessToken}`);

    expect(wcsCredit.status).toBe(403);

    const myQueue = await request(app)
      .get('/api/v1/b2b/orders/my-queue')
      .set('Authorization', `Bearer ${wcsAuth.body.data.accessToken}`);

    expect(myQueue.status).toBe(200);
    expect(myQueue.body.data.some((item: any) => item.id === order.body.data.id)).toBe(true);
  }, 120000);

  it('matches revenue reports to manual sums, blocks WCS financials, protects custom builder, and retries VFD pending events', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'ENTERPRISE', pharmacyType: 'RETAIL' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const wcsPharmacy = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const wcs = await createUser({ pharmacyId: wcsPharmacy.id, role: 'WHOLESALE_COUNTER_STAFF', password: 'WcsPass!123' });
    const ownerAuth = await login(owner.user.email, owner.password);
    const wcsAuth = await login(wcs.user.email, wcs.password);
    const seeded = await createProductAndBatch({ pharmacyId: pharmacy.id, userId: owner.user.id, sellingPrice: 1500, quantity: 20 });

    await request(app)
      .patch('/api/v1/settings/subscription/vfd')
      .set('Authorization', `Bearer ${ownerAuth.body.data.accessToken}`)
      .send({ enabled: true });

    const from = new Date(Date.now() - 60_000).toISOString();
    const checkout = await request(app)
      .post('/api/v1/dispensing/checkout')
      .set('Authorization', `Bearer ${ownerAuth.body.data.accessToken}`)
      .send({ paymentMethod: 'CASH', items: [{ productId: seeded.product.id, quantity: 2, unitPrice: 1500 }] });

    expect(checkout.status).toBe(201);
    expect(checkout.body.data.vfdStatus).toBe('PENDING');

    const report = await request(app)
      .get(`/api/v1/reports/financial/revenue?from=${encodeURIComponent(from)}`)
      .set('Authorization', `Bearer ${ownerAuth.body.data.accessToken}`);

    const manualRows = await prisma.$queryRawUnsafe<Array<{ total: string }>>(
      `SELECT COALESCE(SUM("total_amount"), 0)::text AS total FROM "dispensing_events" WHERE "pharmacy_id" = '${pharmacy.id}' AND "status" = 'COMPLETED' AND "created_at" >= '${from}'`,
    );

    expect(report.status).toBe(200);
    expect(report.body.data.totalRevenue).toBe(Number(manualRows[0].total));

    const peerBenchmark = await request(app)
      .get('/api/v1/reports/benchmarking/peer')
      .set('Authorization', `Bearer ${ownerAuth.body.data.accessToken}`);

    expect(peerBenchmark.status).toBe(200);
    expect(peerBenchmark.body.data.available).toBe(false);

    const injection = await request(app)
      .post('/api/v1/reports/custom-builder')
      .set('Authorization', `Bearer ${ownerAuth.body.data.accessToken}`)
      .send({ dimension: 'DROP TABLE users', metric: 'totalRevenue' });

    expect(injection.status).toBe(400);

    const wcsFinancial = await request(app)
      .get('/api/v1/reports/financial/revenue')
      .set('Authorization', `Bearer ${wcsAuth.body.data.accessToken}`);

    expect(wcsFinancial.status).toBe(403);

    const before = await prisma.$queryRawUnsafe<Array<{ id: string; vfd_status: string }>>(
      `SELECT "id", "vfd_status" FROM "dispensing_events" WHERE "pharmacy_id" = '${pharmacy.id}' ORDER BY "created_at" DESC LIMIT 1`,
    );
    const retry = await runVfdRetryJob();
    const after = await prisma.$queryRawUnsafe<Array<{ id: string; vfd_status: string }>>(
      `SELECT "id", "vfd_status" FROM "dispensing_events" WHERE "id" = '${before[0].id}' LIMIT 1`,
    );

    expect(before[0].vfd_status).toBe('PENDING');
    expect(retry.retried).toBeGreaterThan(0);
    expect(after[0].vfd_status).toBe('PENDING');
  }, 120000);
});
