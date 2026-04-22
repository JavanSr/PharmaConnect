import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import {
  createPharmacy,
  createProductAndBatch,
  createUser,
  disconnectTestDb,
  login,
} from './helpers';

describe('inventory barcode lookup', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "product_barcode_mappings" (
        "id" TEXT NOT NULL,
        "pharmacy_id" TEXT NOT NULL,
        "barcode" TEXT NOT NULL,
        "product_id" TEXT NOT NULL,
        "source" TEXT NOT NULL,
        "gs1_payload" JSONB,
        "created_by" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "product_barcode_mappings_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "product_barcode_mappings_pharmacy_barcode_key"
      ON "product_barcode_mappings"("pharmacy_id", "barcode");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "product_barcode_mappings_product_id_idx"
      ON "product_barcode_mappings"("product_id");
    `);
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('returns a local product match before any GS1 fallback', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const auth = await login(owner.user.email, owner.password);
    const { product } = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: owner.user.id,
      barcode: '6201234567890',
    });

    const response = await request(app)
      .post('/api/v1/inventory/barcode-lookup')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({ barcode: '6201234567890' });

    expect(response.status).toBe(200);
    expect(response.body.data.source).toBe('LOCAL');
    expect(response.body.data.product.id).toBe(product.id);
  });

  it('returns GS1 details when no local product matches a scan', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const auth = await login(owner.user.email, owner.password);

    const response = await request(app)
      .post('/api/v1/inventory/barcode-lookup')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({ barcode: '09506000134352' });

    expect(response.status).toBe(200);
    expect(response.body.data.source).toBe('GS1');
    expect(response.body.data.product).toBeNull();
    expect(response.body.data.gs1.gtin).toBe('09506000134352');
    expect(response.body.data.gs1.digitalLink).toContain('/01/09506000134352');
  });

  it('stores a user mapping and resolves later scans from that saved mapping', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const auth = await login(owner.user.email, owner.password);
    const { product } = await createProductAndBatch({
      pharmacyId: pharmacy.id,
      userId: owner.user.id,
      barcode: '6205550001111',
    });

    const saveResponse = await request(app)
      .post('/api/v1/inventory/barcode-mappings')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({
        barcode: '09506000134352',
        productId: product.id,
        source: 'USER_MAP',
      });

    expect(saveResponse.status).toBe(201);
    expect(saveResponse.body.data.source).toBe('USER_MAP');
    expect(saveResponse.body.data.product.id).toBe(product.id);

    const lookupResponse = await request(app)
      .post('/api/v1/inventory/barcode-lookup')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`)
      .send({ barcode: '09506000134352' });

    expect(lookupResponse.status).toBe(200);
    expect(lookupResponse.body.data.source).toBe('USER_MAP');
    expect(lookupResponse.body.data.product.id).toBe(product.id);
  });
});
