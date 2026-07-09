import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import {
  createPharmacy,
  createProductAndBatch,
  createUser,
  createWholesaleCatalogue,
  disconnectTestDb,
  linkPharmacies,
  login,
} from './helpers';

async function waitFor<T>(fn: () => Promise<T | null | undefined>, timeoutMs = 4000): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

describe('b2b backorders, SOM, and FEFO delivery stock update', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('splits a short order into shipped lines + backorders, then fulfils the backorder', async () => {
    const buyerPharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const sellerPharmacy = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const buyer = await createUser({ pharmacyId: buyerPharmacy.id, role: 'OWNER' });
    const seller = await createUser({ pharmacyId: sellerPharmacy.id, role: 'OWNER' });
    const seeded = await createProductAndBatch({
      pharmacyId: sellerPharmacy.id,
      userId: seller.user.id,
      quantity: 10,
      sellingPrice: 1000,
    });
    await createWholesaleCatalogue({ pharmacyId: sellerPharmacy.id, productId: seeded.product.id, price: 1000 });
    await linkPharmacies({ retailPharmacyId: buyerPharmacy.id, wholesalePharmacyId: sellerPharmacy.id, requestedBy: buyer.user.id });

    const buyerAuth = await login(buyer.user.email, buyer.password);
    const sellerAuth = await login(seller.user.email, seller.password);

    // Without the flag, a short order is still rejected outright
    const rejected = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({
        sellerPharmacyId: sellerPharmacy.id,
        items: [{ productId: seeded.product.id, quantity: 15 }],
      });
    expect(rejected.status).toBe(422);

    // With allowPartialFulfilment: ship 10, backorder 5
    const order = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({
        sellerPharmacyId: sellerPharmacy.id,
        allowPartialFulfilment: true,
        items: [{ productId: seeded.product.id, quantity: 15 }],
      });

    expect(order.status).toBe(201);
    expect(order.body.data.items[0].quantity).toBe(10);
    expect(order.body.data.totalAmount).toBe(10_000);
    expect(order.body.data.backorders).toHaveLength(1);
    expect(order.body.data.backorders[0].quantity).toBe(5);
    expect(order.body.data.backorders[0].status).toBe('OPEN');

    // Both sides see the queue
    const sellerQueue = await request(app)
      .get('/api/v1/b2b/backorders?side=seller&status=OPEN')
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`);
    expect(sellerQueue.status).toBe(200);
    expect(sellerQueue.body.data).toHaveLength(1);
    expect(sellerQueue.body.data[0].counterpartName).toBe(buyerPharmacy.name);

    const buyerQueue = await request(app)
      .get('/api/v1/b2b/backorders?side=buyer&status=OPEN')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`);
    expect(buyerQueue.status).toBe(200);
    expect(buyerQueue.body.data).toHaveLength(1);

    // Seller was notified about the queued backorder
    const sellerNote = await prisma.notification.findFirst({
      where: { pharmacyId: sellerPharmacy.id, type: 'B2B_BACKORDER_CREATED' },
    });
    expect(sellerNote).not.toBeNull();

    // Fulfilment fails while there is still no stock
    const backorderId = order.body.data.backorders[0].id;
    const failedFulfil = await request(app)
      .post(`/api/v1/b2b/backorders/${backorderId}/fulfil`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`);
    expect(failedFulfil.status).toBe(422);

    // Stock arrives — fulfil creates a follow-up order and closes the backorder
    await prisma.batch.create({
      data: {
        pharmacyId: sellerPharmacy.id,
        productId: seeded.product.id,
        batchNumber: 'RESTOCK-001',
        expiryDate: new Date(Date.now() + 365 * 86_400_000),
        quantityRemaining: 50,
        purchasePrice: 900,
      },
    });

    const fulfilled = await request(app)
      .post(`/api/v1/b2b/backorders/${backorderId}/fulfil`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`);
    expect(fulfilled.status).toBe(201);
    expect(fulfilled.body.data.backorder.status).toBe('FULFILLED');
    expect(fulfilled.body.data.order.items[0].quantity).toBe(5);

    // Buyer notified that the backordered item is shipping
    const buyerNote = await prisma.notification.findFirst({
      where: { pharmacyId: buyerPharmacy.id, type: 'B2B_BACKORDER_FULFILLED' },
    });
    expect(buyerNote).not.toBeNull();

    // Double-fulfilment is rejected
    const again = await request(app)
      .post(`/api/v1/b2b/backorders/${backorderId}/fulfil`)
      .set('Authorization', `Bearer ${sellerAuth.body.data.accessToken}`);
    expect(again.status).toBe(404);
  }, 120000);

  it('flags unusually large controlled-substance orders (SOM)', async () => {
    const buyerPharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const sellerPharmacy = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const buyer = await createUser({ pharmacyId: buyerPharmacy.id, role: 'OWNER' });
    const seller = await createUser({ pharmacyId: sellerPharmacy.id, role: 'OWNER' });
    const seeded = await createProductAndBatch({
      pharmacyId: sellerPharmacy.id,
      userId: seller.user.id,
      quantity: 500,
      sellingPrice: 2000,
    });
    await prisma.product.update({ where: { id: seeded.product.id }, data: { drugClass: 'CONTROLLED' } });
    await createWholesaleCatalogue({ pharmacyId: sellerPharmacy.id, productId: seeded.product.id, price: 2000 });
    await linkPharmacies({ retailPharmacyId: buyerPharmacy.id, wholesalePharmacyId: sellerPharmacy.id, requestedBy: buyer.user.id });

    const buyerAuth = await login(buyer.user.email, buyer.password);

    const order = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({
        sellerPharmacyId: sellerPharmacy.id,
        items: [{ productId: seeded.product.id, quantity: 150 }],
      });
    expect(order.status).toBe(201);

    // SOM alert is fire-and-forget — poll briefly
    const alert = await waitFor(() =>
      prisma.notification.findFirst({
        where: { pharmacyId: sellerPharmacy.id, type: 'SUSPICIOUS_ORDER_ALERT' },
      }),
    );
    expect(alert).not.toBeNull();
    expect(alert!.body).toContain(seeded.product.name);
  }, 120000);

  it('FEFO-allocates delivery: decrements seller batches and mirrors real batch data on the buyer', async () => {
    const buyerPharmacy = await createPharmacy({ subscriptionTier: 'STANDARD', pharmacyType: 'RETAIL' });
    const sellerPharmacy = await createPharmacy({ subscriptionTier: 'WHOLESALE', pharmacyType: 'WHOLESALE' });
    const buyer = await createUser({ pharmacyId: buyerPharmacy.id, role: 'OWNER' });
    const seller = await createUser({ pharmacyId: sellerPharmacy.id, role: 'OWNER' });
    const seeded = await createProductAndBatch({
      pharmacyId: sellerPharmacy.id,
      userId: seller.user.id,
      quantity: 6,
      sellingPrice: 1000,
    });
    // Second, later-expiring batch
    const laterExpiry = new Date(Date.now() + 700 * 86_400_000);
    await prisma.batch.create({
      data: {
        pharmacyId: sellerPharmacy.id,
        productId: seeded.product.id,
        batchNumber: 'LATER-BATCH',
        expiryDate: laterExpiry,
        quantityRemaining: 10,
        purchasePrice: 900,
      },
    });
    // Buyer already stocks the same product name
    const buyerProduct = await prisma.product.create({
      data: {
        pharmacyId: buyerPharmacy.id,
        name: seeded.product.name,
        unitOfMeasure: 'pack',
        sellingPrice: 1500,
        reorderLevel: 1,
        retailStock: true,
      },
    });
    await createWholesaleCatalogue({ pharmacyId: sellerPharmacy.id, productId: seeded.product.id, price: 1000 });
    await linkPharmacies({ retailPharmacyId: buyerPharmacy.id, wholesalePharmacyId: sellerPharmacy.id, requestedBy: buyer.user.id });

    const buyerAuth = await login(buyer.user.email, buyer.password);
    const sellerAuth = await login(seller.user.email, seller.password);
    const sellerToken = sellerAuth.body.data.accessToken;

    const order = await request(app)
      .post('/api/v1/b2b/orders')
      .set('Authorization', `Bearer ${buyerAuth.body.data.accessToken}`)
      .send({
        sellerPharmacyId: sellerPharmacy.id,
        items: [{ productId: seeded.product.id, quantity: 8 }],
      });
    expect(order.status).toBe(201);
    const orderId = order.body.data.id;

    for (const nextStatus of ['CONFIRMED', 'PACKED', 'DISPATCHED']) {
      const step = await request(app)
        .patch(`/api/v1/b2b/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ nextStatus });
      expect(step.status).toBe(200);
    }

    const delivered = await request(app)
      .patch(`/api/v1/b2b/orders/${orderId}/confirm-delivery`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({});
    expect(delivered.status).toBe(200);
    expect(delivered.body.data.stockUpdated).toContain(seeded.product.name);
    expect(delivered.body.data.stockSkipped).toHaveLength(0);

    // Seller side: FEFO consumed the earlier batch fully (6), then 2 from the later batch
    const earlierBatch = await prisma.batch.findUnique({ where: { id: seeded.batch.id } });
    expect(earlierBatch!.quantityRemaining).toBe(0);
    const laterBatch = await prisma.batch.findFirst({
      where: { pharmacyId: sellerPharmacy.id, productId: seeded.product.id, batchNumber: 'LATER-BATCH' },
    });
    expect(laterBatch!.quantityRemaining).toBe(8);

    // Buyer side: two mirrored batches carrying the real batch numbers and expiry dates
    const buyerBatches = await prisma.batch.findMany({
      where: { pharmacyId: buyerPharmacy.id, productId: buyerProduct.id },
      orderBy: { expiryDate: 'asc' },
    });
    expect(buyerBatches).toHaveLength(2);
    expect(buyerBatches[0].batchNumber).toBe(seeded.batch.batchNumber);
    expect(buyerBatches[0].quantityRemaining).toBe(6);
    expect(buyerBatches[1].batchNumber).toBe('LATER-BATCH');
    expect(buyerBatches[1].quantityRemaining).toBe(2);
    expect(buyerBatches[1].expiryDate.toISOString()).toBe(laterExpiry.toISOString());

    // Seller stock movements recorded the outbound transfer
    const transfers = await prisma.stockMovement.findMany({
      where: { pharmacyId: sellerPharmacy.id, productId: seeded.product.id, type: 'TRANSFERRED' },
    });
    expect(transfers.map((t) => t.quantity).sort()).toEqual([2, 6]);
  }, 120000);
});
