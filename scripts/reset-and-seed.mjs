#!/usr/bin/env node
/**
 * reset-and-seed.mjs
 *
 * Thin wrapper that runs `npm run db:seed:demo` from the backend directory.
 * The actual seeding logic is in backend/prisma/seed-demo-data.ts.
 *
 * Prerequisites:
 *   - DATABASE_URL set in backend/.env
 *   - Base pharmacy/user records exist (run `npm run db:seed` first if new DB)
 *
 * Safety: NEVER modifies founder@pharmaconnect.tz or its data.
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..', 'backend');

console.log('━'.repeat(60));
console.log('  APOTEKH Demo Data Reset & Seed');
console.log('━'.repeat(60));
console.log(`  Backend: ${backendDir}`);
console.log('');

const result = spawnSync('npm', ['run', 'db:seed:demo'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
});

if (result.status !== 0) {
  console.error('\n❌ Seed failed with exit code', result.status);
  process.exit(result.status ?? 1);
}

console.log('\n✅ Database seeded successfully.\n');
