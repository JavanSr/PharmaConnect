/**
 * Cleans the founder account only.
 * - Invalidates all active sessions (forces re-login with new password)
 * - Amani Pharmacy and all demo data are LEFT INTACT for testing
 *
 * Run via Railway shell: npx ts-node src/scripts/clear-demo.ts
 * Then log in as founder@pharmaconnect.tz and change your password
 * in Settings → Profile → Change Password.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const FOUNDER_EMAIL = 'founder@pharmaconnect.tz';

  const founder = await prisma.user.findUnique({
    where: { email: FOUNDER_EMAIL },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (!founder) {
    console.error('Founder account not found. Check the email.');
    process.exit(1);
  }

  console.log(`Found founder: ${founder.firstName} ${founder.lastName} <${founder.email}>`);

  // Invalidate all active sessions — forces a clean login after password change
  const deleted = await prisma.refreshToken.deleteMany({
    where: { userId: founder.id },
  });

  console.log(`  ✓ ${deleted.count} active session(s) invalidated`);
  console.log('\nDone.');
  console.log('Next: log in as founder@pharmaconnect.tz with Demo123!');
  console.log('Then go to Settings → Profile → Change Password to set a real password.');
  console.log('\nAmani Pharmacy and all demo data are untouched.');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
