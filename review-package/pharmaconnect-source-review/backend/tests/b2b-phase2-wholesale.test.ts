import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import {
  createPharmacy,
  createProductAndBatch,
  createUser,
  disconnectTestDb,
  login,
} from './helpers';

describe('b2b phase 2 wholesale extensions', () => {
  it('applies client price overrides to B2B orders and blocks wholesale counter staff access', async () => {
    const buyerPharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM', pharmacyType: 'RETAIL' });
    const sellerPharmacy = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const buyer = await createUser({ pharmacyId: buyerPharmacy.id, role: 'OWNER' });
    const sellerManager = await createUser({ pharmacyId: sellerPharmacy.id, role: 'WHOLESALE_MANAGER' });
    const sellerCounter = await createUser({ pharmacyId: sellerPharmacy.id, role: 'WHOLESALE_COUNTER_STAFF' });
    const seeded = await createProductAndBatch({
      pharmacyId: sellerPharmacy.id,
      userId: sellerManager.user.id,
      quantity: 20,
      sellingPrice: 1200,
    });

    const [buyerAuth, sellerManagerAuth, sellerCounterAuth] = await Promise.all([
      login(buyer.user.email, buyer.password),
      login(sellerManager.user.email, sellerManager.password),
      login(sellerCounter.user.email, sellerCounter.password),
    ]);

    await request(app)
      .post('/api/v1/b2b/catalogues')
      .set('Authorization', `Bearer ${sellerManagerAuth.body.data.accessToken}`)
      .send({
        title: 'Override ready catalogue',
        items: [
          {
            productId: seeded.product.id,
            price: 1200,
            tierPrices: {
              PREMIUM: 1000,
            },
          },
        ],
      })
      .expect(201);

    const override = await request(app)
      .post(`/api/v1/b2b/clients/${buyerPharmacy.id}/prices`)
      .set('Authorization', `Bearer ${sellerManagerAuth.body.data.accessToken}`)
      .send({
        productId: seeded.product.id,
        overridePriceTzs: 800,
      });

    expect(override.status).toBe(201);
    expect(override.body.data[0]).toMatchObject({
      productId: seeded.product.id,
      effectivePriceTzs: 800,
      overridePriceTzs: 800,
      hasOverride: true,
    });

    const blocked = await request(app)
      .get(`/api/v1/b2b/clients/${buyerPharmacy.id}/prices`)
      .set('Authorization', `Bearer ${sellerCounterAuth.body.data.accessToken}`);

    expect(blocked.status).toBe(403);

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

  it('receives supplier purchase orders into stock batches', async () => {
    const outlet = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const manager = await createUser({ pharmacyId: outlet.id, role: 'WHOLESALE_MANAGER' });
    const seeded = await createProductAndBatch({
      pharmacyId: outlet.id,
      userId: manager.user.id,
      quantity: 5,
      sellingPrice: 900,
    });
    const auth = await login(manager.user.email, manager.password);

    const supplier = await request(app)
      .post('/api/v1/b2b/suppliers')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        name: 'Kilimanjaro Distributor',
        phone: '+255700000001',
      });

    expect(supplier.status).toBe(201);

    const order = await request(app)
      .post('/api/v1/b2b/purchase-orders')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        supplierId: supplier.body.data.id,
        status: 'SENT',
        lines: [
          {
            productId: seeded.product.id,
            quantity: 10,
            unitPriceTzs: 500,
          },
        ],
      });

    expect(order.status).toBe(201);

    const beforeStock = await prisma.batch.aggregate({
      where: { pharmacyId: outlet.id, productId: seeded.product.id },
      _sum: { quantityRemaining: true },
    });

    const received = await request(app)
      .patch(`/api/v1/b2b/purchase-orders/${order.body.data.id}/status`)
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        nextStatus: 'RECEIVED',
        receivedLines: [
          {
            productId: seeded.product.id,
            quantity: 10,
            batchNumber: `SUP-${Date.now()}`,
            expiryDate: '2027-12-31T00:00:00.000Z',
            purchasePriceTzs: 500,
          },
        ],
      });

    expect(received.status).toBe(200);
    expect(received.body.data.status).toBe('RECEIVED');
    expect(received.body.data.lines[0].receivedQuantity).toBe(10);

    const afterStock = await prisma.batch.aggregate({
      where: { pharmacyId: outlet.id, productId: seeded.product.id },
      _sum: { quantityRemaining: true },
    });
    expect((afterStock._sum.quantityRemaining ?? 0) - (beforeStock._sum.quantityRemaining ?? 0)).toBe(10);

    const receiptMovements = await prisma.stockMovement.findMany({
      where: {
        pharmacyId: outlet.id,
        productId: seeded.product.id,
        type: 'RECEIVED',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(receiptMovements[0].quantity).toBe(10);
  }, 120000);

  it('creates manifests, completes deliveries, and approves wholesale returns with credit notes', async () => {
    const buyerPharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const sellerPharmacy = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const buyer = await createUser({ pharmacyId: buyerPharmacy.id, role: 'OWNER' });
    const sellerManager = await createUser({ pharmacyId: sellerPharmacy.id, role: 'WHOLESALE_MANAGER' });
    const driver = await createUser({ pharmacyId: sellerPharmacy.id, role: 'DELIVERY_STAFF' });
    const seeded = await createProductAndBatch({
      pharmacyId: sellerPharmacy.id,
      userId: sellerManager.user.id,
      quantity: 20,
      sellingPrice: 1000,
    });

    const [buyerAuth, sellerManagerAuth, driverAuth] = await Promise.all([
      login(buyer.user.email, buyer.password),
      login(sellerManager.user.email, sellerManager.password),
      login(driver.user.email, driver.password),
    ]);

    await request(app)
      .post('/api/v1/b2b/catalogues')
      .set('Authorization', `Bearer ${sellerManagerAuth.body.data.accessToken}`)
      .send({
        title: 'Manifest catalogue',
        items: [{ productId: seeded.product.id, price: 1000 }],
      })
      .expect(201);

    const order = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({
        sellerPharmacyId: sellerPharmacy.id,
        items: [{ productId: seeded.product.id, quantity: 2 }],
      });

    expect(order.status).toBe(201);

    const manifest = await request(app)
      .post('/api/v1/b2b/manifests')
      .set('Authorization', `Bearer ${sellerManagerAuth.body.data.accessToken}`)
      .send({
        deliveryStaffId: driver.user.id,
        orderIds: [order.body.data.id],
        route: 'Arusha CBD to buyer branch',
        vehicleReg: 'T123 ABC',
      });

    expect(manifest.status).toBe(201);

    const ownManifestList = await request(app)
      .get('/api/v1/b2b/manifests')
      .set('Authorization', `Bearer ${driverAuth.body.data.accessToken}`);

    expect(ownManifestList.status).toBe(200);
    expect(ownManifestList.body.data).toHaveLength(1);

    const departed = await request(app)
      .patch(`/api/v1/b2b/manifests/${manifest.body.data.id}/depart`)
      .set('Authorization', `Bearer ${driverAuth.body.data.accessToken}`)
      .send({});

    expect(departed.status).toBe(200);
    expect(departed.body.data.status).toBe('IN_TRANSIT');

    const completed = await request(app)
      .patch(`/api/v1/b2b/manifests/${manifest.body.data.id}/complete`)
      .set('Authorization', `Bearer ${driverAuth.body.data.accessToken}`)
      .send({
        deliveredOrderIds: [order.body.data.id],
      });

    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('DELIVERED');

    const deliveredOrder = await request(app)
      .get(`/api/v1/b2b/orders/${order.body.data.id}`)
      .set('Authorization', `Bearer ${sellerManagerAuth.body.data.accessToken}`);

    expect(deliveredOrder.status).toBe(200);
    expect(deliveredOrder.body.data.status).toBe('DELIVERED');

    const beforeApprovalStock = await prisma.batch.aggregate({
      where: { pharmacyId: sellerPharmacy.id, productId: seeded.product.id },
      _sum: { quantityRemaining: true },
    });

    const wholesaleReturn = await request(app)
      .post('/api/v1/b2b/returns')
      .set('Authorization', `Bearer ${sellerManagerAuth.body.data.accessToken}`)
      .send({
        orderId: order.body.data.id,
        reason: 'DAMAGED',
        lines: [
          {
            productId: seeded.product.id,
            qty: 1,
            unitPrice: 1000,
          },
        ],
      });

    expect(wholesaleReturn.status).toBe(201);
    expect(wholesaleReturn.body.data.status).toBe('PENDING');

    const approved = await request(app)
      .patch(`/api/v1/b2b/returns/${wholesaleReturn.body.data.id}/approve`)
      .set('Authorization', `Bearer ${sellerManagerAuth.body.data.accessToken}`)
      .send({});

    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('APPROVED');
    expect(approved.body.data.creditNoteNumber).toMatch(/^CN-\d{4}-\d{5}$/);
    expect(approved.body.data.creditAmountTzs).toBe(1000);

    const afterApprovalStock = await prisma.batch.aggregate({
      where: { pharmacyId: sellerPharmacy.id, productId: seeded.product.id },
      _sum: { quantityRemaining: true },
    });
    expect((afterApprovalStock._sum.quantityRemaining ?? 0) - (beforeApprovalStock._sum.quantityRemaining ?? 0)).toBe(1);
  }, 120000);
});

afterAll(async () => {
  await disconnectTestDb();
});
