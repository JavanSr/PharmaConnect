require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PASSWORD = 'Browser123!';
const RETRYABLE_DATABASE_MESSAGE = 'Can\'t reach database server';

const PHARMACIES = {
  active: {
    name: 'Browser E2E Active Pharmacy',
    licenceNumber: 'PC-E2E-ACTIVE-001',
    address: 'Mwai Kibaki Road, Dar es Salaam',
    region: 'Dar es Salaam',
    pharmacyType: 'RETAIL',
    subscriptionTier: 'STANDARD',
    status: 'ACTIVE',
    trialActive: false,
    trialStartsAt: new Date('2026-01-01T00:00:00.000Z'),
    trialEndsAt: new Date('2026-01-31T00:00:00.000Z'),
  },
  nearTrial: {
    name: 'Browser E2E Near Trial Pharmacy',
    licenceNumber: 'PC-E2E-TRIAL-001',
    address: 'Uhuru Street, Arusha',
    region: 'Arusha',
    pharmacyType: 'RETAIL',
    subscriptionTier: 'STANDARD',
    status: 'TRIAL',
    trialActive: true,
    trialStartsAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  expiredTrial: {
    name: 'Browser E2E Expired Trial Pharmacy',
    licenceNumber: 'PC-E2E-EXPIRED-001',
    address: 'Sam Nujoma Road, Mwanza',
    region: 'Mwanza',
    pharmacyType: 'RETAIL',
    subscriptionTier: 'STANDARD',
    status: 'TRIAL',
    trialActive: false,
    trialStartsAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
};

const USERS = [
  {
    email: 'owner.active@browser-e2e.pharmaconnect.local',
    firstName: 'Active',
    lastName: 'Owner',
    role: 'OWNER',
    pharmacyKey: 'active',
  },
  {
    email: 'dispenser.active@browser-e2e.pharmaconnect.local',
    firstName: 'Active',
    lastName: 'Dispenser',
    role: 'DISPENSER',
    pharmacyKey: 'active',
  },
  {
    email: 'owner.near-trial@browser-e2e.pharmaconnect.local',
    firstName: 'Near',
    lastName: 'Trial',
    role: 'OWNER',
    pharmacyKey: 'nearTrial',
  },
  {
    email: 'owner.expired-trial@browser-e2e.pharmaconnect.local',
    firstName: 'Expired',
    lastName: 'Trial',
    role: 'OWNER',
    pharmacyKey: 'expiredTrial',
  },
];

async function upsertPharmacy(config) {
  const rows = await withRetry(() =>
    prisma.$queryRawUnsafe(
      `
        INSERT INTO "pharmacies" (
          "name",
          "licenceNumber",
          "address",
          "region",
          "pharmacyType",
          "subscription_tier",
          "status",
          "trial_active",
          "trial_starts_at",
          "trial_ends_at",
          "isActive",
          "billing_cycle",
          "is_hybrid",
          "hybrid_addon_active",
          "vfd_enabled",
          "user_limit",
          "timezone",
          "renewal_year"
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::"PharmacyType",
          $6::"SubscriptionTier",
          $7::"PharmacyAccountStatus",
          $8,
          $9,
          $10,
          $11,
          $12::"BillingCycle",
          $13,
          $14,
          $15,
          $16,
          $17,
          $18
        )
        ON CONFLICT ("licenceNumber") DO UPDATE SET
          "name" = EXCLUDED."name",
          "address" = EXCLUDED."address",
          "region" = EXCLUDED."region",
          "pharmacyType" = EXCLUDED."pharmacyType",
          "subscription_tier" = EXCLUDED."subscription_tier",
          "status" = EXCLUDED."status",
          "trial_active" = EXCLUDED."trial_active",
          "trial_starts_at" = EXCLUDED."trial_starts_at",
          "trial_ends_at" = EXCLUDED."trial_ends_at",
          "isActive" = EXCLUDED."isActive",
          "billing_cycle" = EXCLUDED."billing_cycle",
          "is_hybrid" = EXCLUDED."is_hybrid",
          "hybrid_addon_active" = EXCLUDED."hybrid_addon_active",
          "vfd_enabled" = EXCLUDED."vfd_enabled",
          "user_limit" = EXCLUDED."user_limit",
          "timezone" = EXCLUDED."timezone",
          "renewal_year" = EXCLUDED."renewal_year"
        RETURNING "id", "name", "licenceNumber"
      `,
      config.name,
      config.licenceNumber,
      config.address,
      config.region,
      config.pharmacyType,
      config.subscriptionTier,
      config.status,
      config.trialActive,
      config.trialStartsAt,
      config.trialEndsAt,
      true,
      'MONTHLY',
      false,
      false,
      false,
      4,
      'Africa/Nairobi',
      2026,
    ),
  );

  return rows[0];
}

async function upsertUser(user, pharmacyId, passwordHash) {
  const rows = await withRetry(() =>
    prisma.$queryRawUnsafe(
      `
        INSERT INTO "users" (
          "email",
          "password",
          "firstName",
          "lastName",
          "role",
          "pharmacyId",
          "isActive",
          "must_change_password",
          "last_password_change_at"
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::"UserRole",
          $6,
          $7,
          $8,
          $9
        )
        ON CONFLICT ("email") DO UPDATE SET
          "password" = EXCLUDED."password",
          "firstName" = EXCLUDED."firstName",
          "lastName" = EXCLUDED."lastName",
          "role" = EXCLUDED."role",
          "pharmacyId" = EXCLUDED."pharmacyId",
          "isActive" = EXCLUDED."isActive",
          "must_change_password" = EXCLUDED."must_change_password",
          "last_password_change_at" = EXCLUDED."last_password_change_at"
        RETURNING "id", "email"
      `,
      user.email,
      passwordHash,
      user.firstName,
      user.lastName,
      user.role,
      pharmacyId,
      true,
      false,
      new Date(),
    ),
  );

  return rows[0];
}

async function upsertProduct(pharmacyId) {
  const existingRows = await withRetry(() =>
    prisma.$queryRawUnsafe(
      `
        SELECT "id"
        FROM "products"
        WHERE "pharmacyId" = $1
          AND "barcode" = $2
        LIMIT 1
      `,
      pharmacyId,
      '990000000001',
    ),
  );

  if (existingRows[0]?.id) {
    const rows = await withRetry(() =>
      prisma.$queryRawUnsafe(
        `
          UPDATE "products"
          SET
            "name" = $1,
            "genericName" = $2,
            "brandName" = $3,
            "dosageForm" = $4::"DosageForm",
            "strength" = $5,
            "drugClass" = $6::"DrugClass",
            "reorderLevel" = $7,
            "sellingPrice" = $8,
            "storage_condition" = $9,
            "retail_stock" = $10,
            "wholesale_stock" = $11,
            "isActive" = $12
          WHERE "id" = $13
          RETURNING "id", "name"
        `,
        'Browser E2E Paracetamol',
        'Paracetamol',
        'Browser E2E',
        'TABLET',
        '500mg',
        'OTC',
        5,
        1200,
        'AMBIENT',
        true,
        false,
        true,
        existingRows[0].id,
      ),
    );

    return rows[0];
  }

  const rows = await withRetry(() =>
    prisma.$queryRawUnsafe(
      `
        INSERT INTO "products" (
          "pharmacyId",
          "name",
          "genericName",
          "brandName",
          "barcode",
          "dosageForm",
          "strength",
          "drugClass",
          "reorderLevel",
          "sellingPrice",
          "storage_condition",
          "retail_stock",
          "wholesale_stock",
          "isActive"
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::"DosageForm",
          $7,
          $8::"DrugClass",
          $9,
          $10,
          $11,
          $12,
          $13,
          $14
        )
        RETURNING "id", "name"
      `,
      pharmacyId,
      'Browser E2E Paracetamol',
      'Paracetamol',
      'Browser E2E',
      '990000000001',
      'TABLET',
      '500mg',
      'OTC',
      5,
      1200,
      'AMBIENT',
      true,
      false,
      true,
    ),
  );

  return rows[0];
}

async function withRetry(run, attempts = 5) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes(RETRYABLE_DATABASE_MESSAGE) || attempt === attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError;
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const pharmacyRecords = {};

  for (const [key, config] of Object.entries(PHARMACIES)) {
    pharmacyRecords[key] = await upsertPharmacy(config);
  }

  for (const user of USERS) {
    await upsertUser(user, pharmacyRecords[user.pharmacyKey].id, passwordHash);
  }

  await upsertProduct(pharmacyRecords.active.id);

  console.log('Browser E2E seed complete.');
  console.log(`Password for browser E2E users: ${PASSWORD}`);
  for (const user of USERS) {
    console.log(`- ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
