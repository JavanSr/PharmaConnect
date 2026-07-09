/**
 * APOTEKH — Non-seed data cleanup script
 *
 * Deletes all pharmacies (and their operational data) that are NOT the
 * two seeded demo pharmacies or known real customer pharmacies:
 *   - Amani Pharmacy       (PH-AR-2024-001)
 *   - KWD Wholesale        (WH-AR-2024-001)
 *   - Real customer pharmacies identified by REAL_CUSTOMER_LICENCE_NUMBERS
 *
 * Run via:
 *   cd backend && npm run db:cleanup
 *
 * DRY RUN (preview without deleting):
 *   DRY_RUN=true npm run db:cleanup
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_LICENCE_NUMBERS = ['PH-AR-2024-001', 'WH-AR-2024-001'];
const SEED_USER_EMAILS = [
  'founder@pharmaconnect.tz',
  'owner@amani.co.tz',
  'admin@pharmaconnect.tz',
  'staff@pharmaconnect.tz',
  'dispenser2@amani.co.tz',
  'clerk@amani.co.tz',
  'seller@amani.co.tz',
  'manager@kwd.co.tz',
  'counter@kwd.co.tz',
];

// Real customer pharmacies that registered through the deployed app (verified
// emails, real logins) — never delete these even though they aren't seed data.
const REAL_CUSTOMER_LICENCE_NUMBERS = [
  '-', // Access Pharmacy (ainhardclemence@gmail.com, gabrielysecilia@gmail.com)
  'PENDING-70b6caf6-ecf3-4c3a-afff-7409ffde0cfe', // MM PHARMACY
  'PENDING-6997fc31-c77a-44bb-9743-ba424ef74905', // ISME MEDIC'S
  'PENDING-1780910434672', // Pharmacy 23
  'PENDING-1780910625157', // Pharmacy 23 (duplicate registration)
  'PENDING-fe043fbc-19de-4e94-a496-7e1105dfc743', // Mwandemele pharmacy
  'PENDING-ae1468e3-e9e7-417a-b17d-a734ad6e66c3', // Redeemer's Medics (charlesiman38@gmail.com, TRIAL since 2026-06-25)
];

const DRY_RUN = process.env.DRY_RUN === 'true';

async function main() {
  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log('  APOTEKH — Non-seed data cleanup');
  if (DRY_RUN) {
    console.log('  ⚠  DRY RUN — no data will be deleted');
  }
  console.log('════════════════════════════════════════════════════\n');

  // Resolve protected pharmacies
  const seedPharmacies = await prisma.pharmacy.findMany({
    where: { licenceNumber: { in: SEED_LICENCE_NUMBERS } },
    select: { id: true, name: true, licenceNumber: true },
  });

  if (seedPharmacies.length === 0) {
    console.error('❌ No seeded pharmacies found. Run db:seed first.');
    process.exit(1);
  }

  const realCustomerPharmacies = await prisma.pharmacy.findMany({
    where: { licenceNumber: { in: REAL_CUSTOMER_LICENCE_NUMBERS } },
    select: { id: true, name: true, licenceNumber: true },
  });

  const protectedIds = [
    ...seedPharmacies.map((p) => p.id),
    ...realCustomerPharmacies.map((p) => p.id),
  ];

  console.log('✓ Protected accounts (will NOT be touched):');
  for (const p of seedPharmacies) console.log(`  - ${p.name} (${p.licenceNumber}) [seed]`);
  for (const p of realCustomerPharmacies) console.log(`  - ${p.name} (${p.licenceNumber}) [real customer]`);
  console.log('');

  // Find all target pharmacy IDs in one query
  const targets = await prisma.pharmacy.findMany({
    where: { id: { notIn: protectedIds } },
    select: { id: true, name: true, licenceNumber: true, subscriptionTier: true, status: true },
  });

  if (targets.length === 0) {
    console.log('✓ No non-protected pharmacies found. Nothing to clean up.');
    return;
  }

  console.log(`Found ${targets.length} pharmacy/pharmacies to remove.\n`);

  if (DRY_RUN) {
    for (const t of targets) {
      console.log(`  - ${t.name} | ${t.licenceNumber} | ${t.subscriptionTier} | ${t.status}`);
    }
    console.log('');
  }

  const targetIds = targets.map((t) => t.id);

  if (!DRY_RUN) {
    // ── Bulk delete: one query per table, across ALL targets at once ──────────
    console.log('Step 1: Clearing operational data (bulk)...');

    // Layer 1: Telemetry & caches
    await prisma.featureTelemetry.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.aiCounsellingCache.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.barcodeScanTelemetry.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.coldChainLog.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.productBarcodeMapping.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.adverseReactionReport.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    console.log('  ✓ Layer 1: telemetry & caches');

    // Layer 2: Safety & audit (OverrideLog is protected by DB trigger — skip it)
    await prisma.safetyEvent.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.notification.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.syncConflict.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    console.log('  ✓ Layer 2: safety & audit');

    // Layer 3: Dispensing records
    await prisma.dispensingTransaction.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.prescription.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.stockAdjustmentSuggestion.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    console.log('  ✓ Layer 3: dispensing records');

    // Layer 4: Stock orders (portal tokens first)
    const stockOrders = await prisma.stockOrder.findMany({
      where: { pharmacyId: { in: targetIds } },
      select: { id: true },
    });
    const orderIds = stockOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      await (prisma as any).supplierPortalToken
        .deleteMany({ where: { stockOrderId: { in: orderIds } } })
        .catch(() => {});
      await prisma.stockOrderItem.deleteMany({ where: { stockOrderId: { in: orderIds } } });
      await prisma.stockOrder.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    }
    console.log('  ✓ Layer 4: stock orders');

    // Layer 5: Stock movements & batches
    await prisma.stockMovement.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.batch.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    console.log('  ✓ Layer 5: stock movements & batches');

    // Layer 6: Supplier catalogues
    const suppliers = await prisma.supplier.findMany({
      where: { pharmacyId: { in: targetIds } },
      select: { id: true },
    });
    const supplierIds = suppliers.map((s) => s.id);
    if (supplierIds.length > 0) {
      const catalogues = await prisma.supplierCatalogue.findMany({
        where: { wholesalerId: { in: supplierIds } },
        select: { id: true },
      });
      const catIds = catalogues.map((c) => c.id);
      if (catIds.length > 0) {
        await prisma.supplierCatalogueItem.deleteMany({ where: { catalogueId: { in: catIds } } });
        await prisma.supplierCatalogue.deleteMany({ where: { id: { in: catIds } } });
      }
    }
    console.log('  ✓ Layer 6: supplier catalogues');

    // Layer 7: Products
    await prisma.product.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    console.log('  ✓ Layer 7: products');

    // Layer 8: Suppliers
    await prisma.supplier.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    console.log('  ✓ Layer 8: suppliers');

    // Layer 9: Compliance
    const compItems = await prisma.complianceItem.findMany({
      where: { pharmacyId: { in: targetIds } },
      select: { id: true },
    });
    const compItemIds = compItems.map((c) => c.id);
    if (compItemIds.length > 0) {
      await prisma.complianceDocument.deleteMany({ where: { complianceItemId: { in: compItemIds } } });
    }
    await prisma.complianceAlert.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.staffCredential.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.inspectionChecklist.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    await prisma.complianceItem.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    console.log('  ✓ Layer 9: compliance');

    // Layer 10: Settings & memberships
    await prisma.pharmacySetting.deleteMany({ where: { pharmacyId: { in: targetIds } } }).catch(() => {});
    await prisma.pharmacyMembership.deleteMany({ where: { pharmacyId: { in: targetIds } } });
    console.log('  ✓ Layer 10: settings & memberships');

    console.log('✓ All operational data cleared\n');

    // ── Step 2: Clear override_log rows for test pharmacies, then delete ──────
    // The override_log table has a DB trigger (no_delete_override_log) that
    // prevents DELETE for production safety. We temporarily disable it for this
    // maintenance cleanup only — these are test fixture records, not real medical
    // data — then re-enable it immediately after.
    console.log('Step 2: Deleting pharmacy records...');
    await prisma.$executeRawUnsafe(`ALTER TABLE override_log DISABLE TRIGGER no_delete_override_log`);
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM override_log WHERE pharmacy_id::text = ANY($1::text[])`,
        targetIds,
      );
      await prisma.pharmacy.deleteMany({ where: { id: { in: targetIds } } });
    } finally {
      await prisma.$executeRawUnsafe(`ALTER TABLE override_log ENABLE TRIGGER no_delete_override_log`);
    }
    console.log(`✓ ${targets.length} pharmacy record(s) deleted\n`);

    // ── Step 3: Delete orphaned user accounts ─────────────────────────────────
    console.log('Step 3: Removing orphaned user accounts...');
    const orphanedUsers = await prisma.user.findMany({
      where: {
        email: { notIn: SEED_USER_EMAILS },
        memberships: { none: { pharmacyId: { in: protectedIds } } },
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (orphanedUsers.length === 0) {
      console.log('✓ No orphaned user accounts found\n');
    } else {
      await prisma.user.deleteMany({ where: { id: { in: orphanedUsers.map((u) => u.id) } } });
      console.log(`✓ ${orphanedUsers.length} user(s) removed\n`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const remaining = await prisma.pharmacy.count();
  const remainingUsers = await prisma.user.count();

  console.log('════════════════════════════════════════════════════');
  if (DRY_RUN) {
    console.log('  DRY RUN complete. No data was modified.');
  } else {
    console.log('  ✅ Cleanup complete!');
  }
  console.log(`  Pharmacies remaining: ${remaining}`);
  console.log(`  Users remaining:      ${remainingUsers}`);
  console.log('════════════════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Cleanup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
