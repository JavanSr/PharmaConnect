import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { PharmacyAccountStatus, PharmacyType, SubscriptionTier, UserRole } from '@prisma/client';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import { mapUserRoleToMembershipRole } from '../src/modules/auth/pharmacy-membership.service';

export function uniqueTag(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createPharmacy(input?: {
  name?: string;
  pharmacyType?: PharmacyType;
  subscriptionTier?: SubscriptionTier;
  status?: PharmacyAccountStatus;
  trialActive?: boolean;
  isHybrid?: boolean;
}) {
  const stamp = uniqueTag('pharmacy');
  return prisma.pharmacy.create({
    data: {
      name: input?.name ?? stamp,
      licenceNumber: `LIC-${stamp}`,
      address: 'Test Address',
      region: 'Arusha',
      pharmacyType: input?.pharmacyType ?? 'RETAIL',
      subscriptionTier: input?.subscriptionTier ?? 'PREMIUM',
      status: input?.status ?? 'ACTIVE',
      trialActive: input?.trialActive ?? true,
      isHybrid: input?.isHybrid ?? false,
      trialStartsAt: new Date(),
      trialEndsAt: new Date(Date.now() + 7 * 86_400_000),
      renewalYear: 2026,
    },
  });
}

export async function createUser(input: {
  pharmacyId: string;
  role: UserRole;
  email?: string;
  password?: string;
  picPin?: string;
}) {
  const password = input.password ?? 'TestPass!123';
  const hash = await bcrypt.hash(password, 10);
  const picPinHash = input.picPin ? await bcrypt.hash(input.picPin, 10) : null;

  const user = await prisma.user.create({
    data: {
      pharmacyId: input.pharmacyId,
      email: input.email ?? `${uniqueTag(input.role.toLowerCase())}@example.com`,
      password: hash,
      firstName: 'Test',
      lastName: input.role,
      role: input.role,
      isActive: true,
      mustChangePassword: false,
      lastPasswordChangeAt: new Date(),
      picPinHash,
    },
  });

  await prisma.pharmacyMembership.create({
    data: {
      userId: user.id,
      pharmacyId: input.pharmacyId,
      role: mapUserRoleToMembershipRole(input.role),
      active: true,
      validFrom: new Date(),
      createdBy: user.id,
    },
  });

  return { user, password };
}

export async function linkPharmacies(input: {
  retailPharmacyId: string;
  wholesalePharmacyId: string;
  requestedBy: string;
}) {
  return prisma.pharmacyLink.create({
    data: {
      retailId: input.retailPharmacyId,
      wholesaleId: input.wholesalePharmacyId,
      status: 'ACTIVE',
      requestedBy: input.requestedBy,
    },
  });
}

export async function login(email: string, password: string) {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  return response;
}

export async function createProductAndBatch(input: {
  pharmacyId: string;
  userId: string;
  name?: string;
  barcode?: string;
  quantity?: number;
  sellingPrice?: number;
}) {
  const product = await prisma.product.create({
    data: {
      pharmacyId: input.pharmacyId,
      name: input.name ?? uniqueTag('product'),
      barcode: input.barcode ?? uniqueTag('barcode'),
      unitOfMeasure: 'pack',
      sellingPrice: input.sellingPrice ?? 1500,
      reorderLevel: 1,
      retailStock: true,
      wholesaleStock: true,
    },
  });

  const batch = await prisma.batch.create({
    data: {
      pharmacyId: input.pharmacyId,
      productId: product.id,
      batchNumber: uniqueTag('batch'),
      expiryDate: new Date(Date.now() + 365 * 86_400_000),
      quantityRemaining: input.quantity ?? 20,
      purchasePrice: 900,
    },
  });

  await prisma.stockMovement.create({
    data: {
      pharmacyId: input.pharmacyId,
      productId: product.id,
      batchId: batch.id,
      userId: input.userId,
      type: 'RECEIVED',
      quantity: input.quantity ?? 20,
      notes: 'test seed',
    },
  });

  return { product, batch };
}

export async function createWholesaleCatalogue(input: {
  pharmacyId: string;
  productId: string;
  price?: number;
}) {
  const catalogueId = randomUUID();
  await prisma.$executeRawUnsafe(`
    INSERT INTO "wholesale_catalogues" ("id", "pharmacy_id", "title", "description")
    VALUES ('${catalogueId}', '${input.pharmacyId}', 'Test Catalogue', 'Integration test catalogue')
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "wholesale_catalogue_pricing" ("id", "catalogue_id", "product_id", "price", "min_order_quantity")
    VALUES ('${randomUUID()}', '${catalogueId}', '${input.productId}', ${input.price ?? 1000}, 1)
  `);

  return catalogueId;
}

export async function latestOverrideLogCount(pharmacyId: string) {
  return prisma.overrideLog.count({ where: { pharmacyId } });
}

export async function disconnectTestDb() {
  await prisma.$disconnect();
}
