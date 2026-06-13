#!/usr/bin/env node
/**
 * refresh-all-for-marketing.mjs
 *
 * Master orchestrator — runs the full demo data + screenshot pipeline:
 *
 *   Step 1: Reset & seed database  (scripts/reset-and-seed.mjs)
 *   Step 2: Capture screenshots    (scripts/capture-screenshots.mjs)
 *   Step 3: Update user manual     (scripts/update-manual.mjs)
 *
 * Usage:
 *   node scripts/refresh-all-for-marketing.mjs
 *
 * Optional env vars:
 *   FOUNDER_PASSWORD  — set to capture /superadmin screenshots
 *   SCREENSHOT_BASE_URL — default http://127.0.0.1:4173
 *   BACKEND_URL         — default http://localhost:5174
 *
 * Prerequisites:
 *   - Backend running: cd backend && npm run dev
 *   - DATABASE_URL in backend/.env points to the target database
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const scriptsDir = path.resolve(import.meta.dirname);

function run(label, scriptFile, extraEnv = {}) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${label}`);
  console.log('═'.repeat(60));

  const result = spawnSync('node', [path.join(scriptsDir, scriptFile)], {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...extraEnv },
  });

  if (result.error) {
    throw new Error(`Failed to spawn ${scriptFile}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${scriptFile} exited with code ${result.status}`);
  }
}

async function main() {
  const startTime = Date.now();
  console.log('\n' + '█'.repeat(60));
  console.log('  APOTEKH Marketing Refresh Pipeline');
  console.log('█'.repeat(60));
  console.log('');
  console.log('  This will:');
  console.log('    1. Reset + seed the demo database with 31 days of data');
  console.log('    2. Capture screenshots for all user roles');
  console.log('    3. Update the user manual date header');
  console.log('');

  if (process.env.FOUNDER_PASSWORD) {
    console.log('  ✓ FOUNDER_PASSWORD set — will capture /superadmin screens');
  } else {
    console.log('  ⓘ FOUNDER_PASSWORD not set — skipping /superadmin screens');
  }

  const steps = [
    { label: 'Step 1 of 3: Reset & Seed Database', script: 'reset-and-seed.mjs' },
    { label: 'Step 2 of 3: Capture Screenshots', script: 'capture-screenshots.mjs' },
    { label: 'Step 3 of 3: Update User Manual', script: 'update-manual.mjs' },
  ];

  const results = [];

  for (const step of steps) {
    try {
      run(step.label, step.script);
      results.push({ step: step.label, status: '✅ Passed' });
    } catch (e) {
      results.push({ step: step.label, status: `❌ Failed: ${e.message}` });
      // Continue to next step even on failure — we want partial progress
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  console.log('  Pipeline Summary');
  console.log('═'.repeat(60));
  for (const r of results) {
    console.log(`  ${r.status}`);
    console.log(`    ${r.step}`);
  }
  console.log(`\n  Total time: ${elapsed}s`);

  const anyFailed = results.some(r => r.status.startsWith('❌'));
  if (anyFailed) {
    console.log('\n  ❌ One or more steps failed.\n');
    process.exit(1);
  } else {
    console.log('\n  ✅ All steps completed successfully.\n');
  }
}

main().catch(e => {
  console.error('\n❌ Orchestrator error:', e.message);
  process.exit(1);
});
