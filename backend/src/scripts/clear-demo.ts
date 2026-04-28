/**
 * Removes the Amani demo pharmacy and all its data from the live database.
 * Keeps: SUPER_ADMIN user, knowledge articles, drug master catalogue.
 * Run via Railway shell: npx ts-node src/scripts/clear-demo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const DEMO_LICENCE = 'PH-AR-2024-001';
  const DEMO_EMAILS = [
    'admin@pharmaconnect.tz',
    'owner@amani.co.tz',
    'staff@pharmaconnect.tz',
    'dispenser2@amani.co.tz',
    'clerk@amani.co.tz',
    'seller@amani.co.tz',
  ];

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { licenceNumber: DEMO_LICENCE },
  });

  if (!pharmacy) {
    console.log('Demo pharmacy not found — database is already clean.');
    return;
  }

  console.log(`Found demo pharmacy: ${pharmacy.name} (${pharmacy.id})`);
  console.log('Clearing demo data...\n');

  // Delete in dependency order
  await prisma.stockMovement.deleteMany({ where: { pharmacyId: pharmacy.id } });
  console.log('  ✓ Stock movements deleted');

  await prisma.batch.deleteMany({ where: { pharmacyId: pharmacy.id } });
  console.log('  ✓ Batches deleted');

  await prisma.product.deleteMany({ where: { pharmacyId: pharmacy.id } });
  console.log('  ✓ Products deleted');

  await prisma.complianceItem.deleteMany({ where: { pharmacyId: pharmacy.id } });
  console.log('  ✓ Compliance items deleted');

  await prisma.overrideLog.deleteMany({ where: { pharmacyId: pharmacy.id } });
  console.log('  ✓ Override logs deleted');

  await prisma.refreshToken.deleteMany({
    where: { user: { pharmacyId: pharmacy.id } },
  });
  console.log('  ✓ Refresh tokens deleted');

  await prisma.pharmacyMembership.deleteMany({ where: { pharmacyId: pharmacy.id } });
  console.log('  ✓ Memberships deleted');

  // Delete demo users (not the founder)
  await prisma.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } });
  console.log('  ✓ Demo users deleted');

  await prisma.pharmacy.delete({ where: { id: pharmacy.id } });
  console.log('  ✓ Demo pharmacy deleted');

  // Verify founder account is intact
  const founder = await prisma.user.findUnique({
    where: { email: 'founder@pharmaconnect.tz' },
  });
  console.log(`\nFounder account intact: ${founder ? '✓ ' + founder.email : '✗ NOT FOUND'}`);

  const articleCount = await prisma.article.count();
  console.log(`Knowledge articles intact: ✓ ${articleCount} articles`);

  console.log('\nDone. Database is clean and ready for real pharmacies.');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
